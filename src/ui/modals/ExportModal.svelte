<script lang="ts">
  import { untrack } from 'svelte'

  import { DocxExporter } from '@/core/exporters/DocxExporter'
  import { EpubExporter } from '@/core/exporters/EpubExporter'
  import { PdfExporter } from '@/core/exporters/PdfExporter'
  import { ProjectCompiler } from '@/core/ProjectCompiler'
  import { BUILT_IN_STYLES, cssForScreenPreview, type ExportStyle } from '@/exportStyles/index'
  import type LighthousePlugin from '@/main'
  import type { Project } from '@/types/types'

  import type { TFile, TFolder } from 'obsidian'

  interface Props {
    plugin: LighthousePlugin
    project: Project
    onClose: () => void
    onSuccess: (message: string) => void
  }

  let { plugin, project, onClose, onSuccess }: Props = $props()

  type ExportFormat = 'pdf' | 'docx' | 'epub' | 'markdown'

  // Form state
  let format = $state<ExportFormat>('pdf')
  let selectedStyleId = $state('novel-trade')
  let stripFrontmatter = $state(true)
  let convertWikiLinks = $state(true)
  let stripEmbeds = $state(true)
  let stripHighlights = $state(false)
  let fileSeparator = $state('')
  // Snapshot the initial filename at mount so the $state initialiser is a plain string,
  // not a reactive reference to the `project` prop.
  let filename = $state(untrack(() => sanitizeFilename(project.name)))
  let outputFolder = $state('')
  let exporting = $state(false)
  let errorMessage = $state('')
  let userStyles = $state<ExportStyle[]>([])

  const allStyles = $derived([...BUILT_IN_STYLES, ...userStyles])
  const selectedStyle = $derived(
    allStyles.find((s) => s.id === selectedStyleId) ?? BUILT_IN_STYLES[0],
  )

  // Load user styles when the modal opens
  $effect(() => {
    void loadUserStyles()
  })

  async function loadUserStyles(): Promise<void> {
    const stylesDir = '.lighthouse/export-styles'
    try {
      const list = await plugin.app.vault.adapter.list(stylesDir)
      const cssFiles = list.files.filter((f) => f.endsWith('.css'))
      const loaded: ExportStyle[] = []

      for (const cssPath of cssFiles) {
        const css = await plugin.app.vault.adapter.read(cssPath)
        const id = cssPath.split('/').pop()?.replace('.css', '') ?? cssPath

        // Try to load a matching .png thumbnail alongside the CSS file
        const pngPath = cssPath.replace('.css', '.png')
        let previewSvg = ''
        if (list.files.includes(pngPath)) {
          const data = await plugin.app.vault.adapter.readBinary(pngPath)
          const b64 = Buffer.from(data).toString('base64')
          previewSvg = `data:image/png;base64,${b64}`
        }

        loaded.push({
          id,
          name: toTitleCase(id.replace(/-/g, ' ')),
          description: 'Custom style',
          pageSize: 'Custom',
          css,
          previewSvg,
          builtIn: false,
        })
      }
      userStyles = loaded
    } catch {
      // No custom styles directory — perfectly normal, ignore
    }
  }

  // ---------------------------------------------------------------------------
  // File collection helpers
  // ---------------------------------------------------------------------------

  function isTFolder(f: unknown): f is TFolder {
    return (
      typeof f === 'object' &&
      f !== null &&
      'children' in (f as Record<string, unknown>) &&
      typeof (f as { isRoot?: unknown }).isRoot === 'function'
    )
  }

  function isTFile(f: unknown): f is TFile {
    return (
      typeof f === 'object' &&
      f !== null &&
      'path' in (f as Record<string, unknown>) &&
      'extension' in (f as Record<string, unknown>) &&
      !('children' in (f as Record<string, unknown>))
    )
  }

  function collectMarkdownFiles(folder: TFolder): string[] {
    const paths: string[] = []
    for (const child of folder.children) {
      if (isTFolder(child)) {
        paths.push(...collectMarkdownFiles(child))
      } else if (isTFile(child) && (child as TFile).extension === 'md') {
        paths.push((child as TFile).path)
      }
    }
    return paths.sort()
  }

  function getContentFilePaths(): string[] {
    const paths: string[] = []
    for (const rel of project.contentFolders) {
      const full = plugin.folderManager.resolveProjectPath(project.rootPath, rel)
      const abstract = plugin.app.vault.getAbstractFileByPath(full)
      if (abstract && isTFolder(abstract)) {
        paths.push(...collectMarkdownFiles(abstract))
      }
    }
    return paths
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  function sanitizeFilename(name: string): string {
    return name.replace(/[/\\:*?"<>|]/g, '-').trim()
  }

  function toTitleCase(s: string): string {
    return s.replace(/\b\w/g, (c) => c.toUpperCase())
  }

  function resolveOutputPath(ext: string): string {
    const dir = outputFolder.trim().replace(/\/$/, '')
    const safeName = sanitizeFilename(filename) || sanitizeFilename(project.name)
    const base = `${safeName}.${ext}`
    return dir ? `${dir}/${base}` : base
  }

  // ---------------------------------------------------------------------------
  // Export & clipboard
  // ---------------------------------------------------------------------------

  async function doExport(): Promise<void> {
    exporting = true
    errorMessage = ''

    try {
      const filePaths = getContentFilePaths()
      if (filePaths.length === 0) {
        errorMessage = 'No markdown files found in content folders.'
        return
      }

      const compiler = new ProjectCompiler((path) => plugin.app.vault.adapter.read(path))
      const doc = await compiler.compile(project, filePaths, {
        stripFrontmatter,
        convertWikiLinks,
        stripEmbeds,
        stripHighlights,
        fileSeparator,
      })

      if (format === 'markdown') {
        const outPath = resolveOutputPath('md')
        await plugin.app.vault.adapter.write(outPath, doc.fullText)
        onSuccess(`Exported to ${outPath}`)
      } else if (format === 'docx') {
        const exporter = new DocxExporter()
        const buffer = await exporter.export(doc)
        const outPath = resolveOutputPath('docx')
        await plugin.app.vault.adapter.writeBinary(outPath, buffer)
        onSuccess(`Exported to ${outPath}`)
      } else if (format === 'epub') {
        const exporter = new EpubExporter()
        const bytes = await exporter.export(doc, {
          title: doc.projectName,
          css: cssForScreenPreview(selectedStyle.css),
        })
        const outPath = resolveOutputPath('epub')
        await plugin.app.vault.adapter.writeBinary(outPath, new Uint8Array(bytes))
        onSuccess(`Exported to ${outPath}`)
      } else if (format === 'pdf') {
        const exporter = new PdfExporter(plugin.app)
        const outputPath = resolveOutputPath('pdf')
        const result = await exporter.export(doc, { css: selectedStyle.css, outputPath })
        if (result.method === 'dialog') {
          onSuccess('PDF export dialog opened')
        } else {
          onSuccess(`Exported PDF to ${result.outputPath}`)
        }
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err)
    } finally {
      exporting = false
    }
  }

  async function copyToClipboard(): Promise<void> {
    exporting = true
    errorMessage = ''

    try {
      const filePaths = getContentFilePaths()
      if (filePaths.length === 0) {
        errorMessage = 'No markdown files found in content folders.'
        return
      }

      const compiler = new ProjectCompiler((path) => plugin.app.vault.adapter.read(path))
      const doc = await compiler.compile(project, filePaths, {
        stripFrontmatter,
        convertWikiLinks,
        stripEmbeds,
        stripHighlights,
        fileSeparator,
      })

      await navigator.clipboard.writeText(doc.fullText)
      onSuccess('Copied to clipboard')
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err)
    } finally {
      exporting = false
    }
  }

  // Preview the currently selected style's CSS scoped for the modal
  // (reserved for a future live-preview pane)

  // ---------------------------------------------------------------------------
  // Live preview state
  // ---------------------------------------------------------------------------

  let compiledText = $state('')
  let previewLoading = $state(true)

  /** Rebuild the iframe srcdoc whenever format or style changes — no recompile needed */
  const previewSrcdoc = $derived.by(() => {
    if (previewLoading) return buildLoadingDoc()
    const truncated = compiledText.slice(0, 5000)
    if (format === 'markdown') return buildMarkdownDoc(truncated)
    return buildStyledDoc(markdownToHtml(truncated), selectedStyle)
  })

  $effect(() => {
    void compileForPreview()
  })

  async function compileForPreview(): Promise<void> {
    previewLoading = true
    try {
      const filePaths = getContentFilePaths()
      if (filePaths.length === 0) {
        compiledText = 'No content files found in the project content folders.'
        return
      }
      const compiler = new ProjectCompiler((path) => plugin.app.vault.adapter.read(path))
      const doc = await compiler.compile(project, filePaths, {
        stripFrontmatter: true,
        convertWikiLinks: true,
        stripEmbeds: true,
        stripHighlights: false,
        fileSeparator: '',
      })
      compiledText = doc.fullText
    } catch (err) {
      compiledText = `Could not load preview: ${err instanceof Error ? err.message : String(err)}`
    } finally {
      previewLoading = false
    }
  }

  // ---------------------------------------------------------------------------
  // Preview document builders
  // The preview lives in an <iframe srcdoc> — a fully isolated document so the
  // style CSS renders with zero interference from Obsidian's own styles.
  // ---------------------------------------------------------------------------

  function markdownToHtml(md: string): string {
    const blocks: string[] = []
    let para: string[] = []

    const flush = () => {
      if (para.length) {
        const text = para
          .join(' ')
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/_(.+?)_/g, '<em>$1</em>')
        blocks.push(`<p>${text}</p>`)
        para = []
      }
    }

    for (const raw of md.split('\n')) {
      const t = raw.trim()
      if (!t) {
        flush()
      } else if (t.startsWith('### ')) {
        flush()
        blocks.push(`<h3>${t.slice(4)}</h3>`)
      } else if (t.startsWith('## ')) {
        flush()
        blocks.push(`<h2>${t.slice(3)}</h2>`)
      } else if (t.startsWith('# ')) {
        flush()
        blocks.push(`<h1>${t.slice(2)}</h1>`)
      } else if (/^[-*_]{3,}$/.test(t) || t === '* * *') {
        flush()
        blocks.push('<hr />')
      } else {
        para.push(t)
      }
    }
    flush()
    return blocks.join('\n')
  }

  // The iframe preview document builders.
  // Opening/closing style tags are assembled at runtime to avoid the literal
  // substrings appearing in Svelte source (which would confuse the block parser).
  function buildLoadingDoc(): string {
    const o = '<' + 'style>',
      c = '<' + '/style>'
    return `<!DOCTYPE html><html><head><meta charset="utf-8">${o}html,body{height:100%;margin:0}body{display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;font-size:13px;color:#999;background:#fff}${c}</head><body>Loading preview\u2026</body></html>`
  }

  function buildMarkdownDoc(text: string): string {
    const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const o = '<' + 'style>',
      c = '<' + '/style>'
    return `<!DOCTYPE html><html><head><meta charset="utf-8">${o}html,body{margin:0;height:100%}body{padding:1.5rem 2rem;box-sizing:border-box;background:#f8f8f8}pre{margin:0;font-family:Menlo,monospace;font-size:12px;line-height:1.6;color:#333;white-space:pre-wrap;word-break:break-word}${c}</head><body><pre>${safe}</pre></body></html>`
  }

  function buildStyledDoc(html: string, style: ExportStyle): string {
    const css = cssForScreenPreview(style.css)
    const o = '<' + 'style>',
      c = '<' + '/style>'
    return `<!DOCTYPE html><html><head><meta charset="utf-8">${o}html,body{margin:0}body{padding:1.75rem 2.5rem;box-sizing:border-box;background:#fff}${css}${c}</head><body><div class="markdown-preview-view markdown-preview-sizer">${html}</div></body></html>`
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="lh-export" role="dialog" aria-label="Export project">

  <!-- ── Format tabs ───────────────────────────────────────── -->
  <div class="lh-tabs" role="tablist" aria-label="Export format">
    {#each ['pdf', 'docx', 'epub', 'markdown'] as ExportFormat[] as fmt}
      <button
        role="tab"
        aria-selected={format === fmt}
        class="lh-tab"
        class:lh-tab--active={format === fmt}
        onclick={() => (format = fmt)}
      >
        {fmt === 'markdown' ? 'Markdown' : fmt.toUpperCase()}
      </button>
    {/each}
  </div>

  <!-- ── Live preview ──────────────────────────────────────── -->
  <!--
    The preview renders inside an <iframe srcdoc> — a completely isolated
    document where the style CSS applies cleanly with no Obsidian interference.
    No SVG tricks, no flex height hacks. Changing the style dropdown rebuilds
    the srcdoc string (CSS swap only, no recompile).
  -->
  <div class="lh-preview-shell">
    <iframe class="lh-preview" title="Document preview" srcdoc={previewSrcdoc}></iframe>
  </div>

  <!-- ── Style + output controls ───────────────────────────── -->
  <div class="lh-controls">
    {#if format !== 'markdown'}
      <div class="lh-row">
        <label class="lh-lbl" for="lh-style">Style</label>
        <select id="lh-style" class="lh-select" bind:value={selectedStyleId}>
          {#each allStyles as style (style.id)}
            <option value={style.id}>{style.name} — {style.pageSize}</option>
          {/each}
        </select>
      </div>
    {/if}
    <div class="lh-row">
      <label class="lh-lbl" for="lh-fname">Filename</label>
      <input
        id="lh-fname"
        class="lh-input"
        type="text"
        bind:value={filename}
        placeholder={sanitizeFilename(project.name)}
      />
    </div>
    <div class="lh-row">
      <label class="lh-lbl" for="lh-folder">Output folder</label>
      <input
        id="lh-folder"
        class="lh-input"
        type="text"
        bind:value={outputFolder}
        placeholder="Vault root"
      />
    </div>
  </div>

  <!-- ── Options (collapsible) ─────────────────────────────── -->
  <details class="lh-opts">
    <summary>Options</summary>
    <div class="lh-opts-body">
      <label><input type="checkbox" bind:checked={stripFrontmatter} /> Strip YAML frontmatter</label>
      <label><input type="checkbox" bind:checked={convertWikiLinks} /> Convert [[wiki links]] to plain text</label>
      <label><input type="checkbox" bind:checked={stripEmbeds} /> Remove ![[embedded file]] links</label>
      <label><input type="checkbox" bind:checked={stripHighlights} /> Strip ==highlight== markers</label>
      <div class="lh-row lh-row--full">
        <label class="lh-lbl" for="lh-sep">File separator</label>
        <input
          id="lh-sep"
          class="lh-input"
          type="text"
          bind:value={fileSeparator}
          placeholder="(none — files joined directly)"
        />
      </div>
    </div>
  </details>

  {#if errorMessage}
    <div class="lh-error" role="alert">{errorMessage}</div>
  {/if}

  <!-- ── Footer ────────────────────────────────────────────── -->
  <div class="lh-footer">
    <button class="mod-secondary" onclick={copyToClipboard} disabled={exporting}>
      Copy to clipboard
    </button>
    <button class="mod-cta" onclick={doExport} disabled={exporting}>
      {exporting ? 'Exporting…' : 'Export'}
    </button>
  </div>

</div>

<style>
  .lh-export {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    padding: 0.1rem 0;
  }

  /* ── Format tabs ─────────────────────────── */
  .lh-tabs {
    display: flex;
    gap: 0.25rem;
    background: var(--background-modifier-form-field);
    border-radius: var(--radius-m);
    padding: 0.25rem;
  }

  .lh-tab {
    flex: 1;
    padding: 0.3rem 0.75rem;
    border-radius: calc(var(--radius-m) - 2px);
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition:
      background 120ms ease,
      color 120ms ease;
  }

  .lh-tab--active {
    background: var(--background-primary);
    color: var(--text-normal);
    box-shadow: var(--shadow-s);
  }

  .lh-tab:hover:not(.lh-tab--active) {
    color: var(--text-normal);
  }

  /* ── Preview ─────────────────────────────── */
  .lh-preview-shell {
    height: 340px;
    border-radius: var(--radius-m);
    overflow: hidden;
    border: 1px solid var(--background-modifier-border);
    background: var(--background-modifier-form-field);
  }

  .lh-preview {
    display: block;
    width: 100%;
    height: 100%;
    border: none;
  }

  /* ── Controls ────────────────────────────── */
  .lh-controls {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .lh-row {
    display: grid;
    grid-template-columns: 100px 1fr;
    align-items: center;
    gap: 0.5rem;
  }

  .lh-row--full {
    grid-template-columns: 1fr;
  }

  .lh-lbl {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .lh-input,
  .lh-select {
    width: 100%;
    padding: 0.3rem 0.5rem;
    background: var(--background-modifier-form-field);
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-s);
    color: var(--text-normal);
    font-size: 0.85rem;
  }

  .lh-select {
    cursor: pointer;
  }

  /* ── Options ─────────────────────────────── */
  .lh-opts > summary {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-muted);
    cursor: pointer;
    list-style: none;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    user-select: none;
  }

  .lh-opts > summary::-webkit-details-marker {
    display: none;
  }

  .lh-opts > summary::before {
    content: '▶';
    font-size: 0.6rem;
    display: inline-block;
    transition: transform 150ms ease;
  }

  .lh-opts[open] > summary::before {
    transform: rotate(90deg);
  }

  .lh-opts-body {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding-top: 0.5rem;
  }

  .lh-opts-body label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--text-normal);
    cursor: pointer;
  }

  /* ── Error ───────────────────────────────── */
  .lh-error {
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-s);
    background: var(--background-modifier-error);
    color: var(--text-error);
    font-size: 0.83rem;
  }

  /* ── Footer ──────────────────────────────── */
  .lh-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding-top: 0.25rem;
  }
</style>
