<script lang="ts">
  import type LighthousePlugin from '@/main'
  import type { Project } from '@/types/types'
  import {
    BUILT_IN_STYLES,
    cssForScreenPreview,
    scopePreviewCss,
    type ExportStyle,
  } from '@/exportStyles/index'
  import { ProjectCompiler } from '@/core/ProjectCompiler'
  import { DocxExporter } from '@/core/exporters/DocxExporter'
  import { EpubExporter } from '@/core/exporters/EpubExporter'
  import { PdfExporter } from '@/core/exporters/PdfExporter'
  import type { TFile, TFolder } from 'obsidian'
  import { untrack } from 'svelte'

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
        const bytes = await exporter.export(doc, { title: doc.projectName })
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
  const previewCss = $derived(scopePreviewCss(cssForScreenPreview(selectedStyle.css)))
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="lh-export-modal-content" role="dialog" aria-label="Export project">
  <h2 class="lh-export-title">Export — {project.name}</h2>

  <!-- ── Format selector ─────────────────────────────────── -->
  <div class="lh-export-section">
    <div class="lh-section-label">Format</div>
    <div class="lh-format-tabs" role="tablist">
      {#each (['pdf', 'docx', 'epub', 'markdown'] as ExportFormat[]) as fmt}
        <button
          role="tab"
          aria-selected={format === fmt}
          class="lh-format-tab"
          class:active={format === fmt}
          onclick={() => (format = fmt)}
        >
          {fmt === 'markdown' ? 'Markdown' : fmt.toUpperCase()}
        </button>
      {/each}
    </div>
  </div>

  <!-- ── Style gallery (PDF only) ────────────────────────── -->
  {#if format === 'pdf'}
    <div class="lh-export-section">
      <div class="lh-section-label">Export Style</div>
      <div class="lh-style-gallery" role="listbox" aria-label="Export styles">
        {#each allStyles as style (style.id)}
          <button
            role="option"
            aria-selected={selectedStyleId === style.id}
            class="lh-style-card"
            class:selected={selectedStyleId === style.id}
            onclick={() => (selectedStyleId = style.id)}
          >
            <div class="lh-style-thumbnail" aria-hidden="true">
              {#if style.previewSvg}
                <img src={style.previewSvg} alt="" />
              {:else}
                <div class="lh-style-thumbnail-placeholder">
                  {style.name.charAt(0)}
                </div>
              {/if}
            </div>
            <div class="lh-style-name">{style.name}</div>
            <div class="lh-style-size">{style.pageSize}</div>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- ── Output settings ─────────────────────────────────── -->
  <div class="lh-export-section">
    <div class="lh-section-label">Output</div>
    <div class="lh-form-grid">
      <div class="lh-form-row">
        <label class="lh-form-label" for="lh-export-filename">Filename</label>
        <input
          id="lh-export-filename"
          class="lh-form-input"
          type="text"
          bind:value={filename}
          placeholder={sanitizeFilename(project.name)}
        />
      </div>
      <div class="lh-form-row">
        <label class="lh-form-label" for="lh-export-folder">Output folder</label>
        <input
          id="lh-export-folder"
          class="lh-form-input"
          type="text"
          bind:value={outputFolder}
          placeholder="Vault root"
        />
      </div>
    </div>
  </div>

  <!-- ── Compilation options (collapsible) ───────────────── -->
  <details class="lh-export-section lh-export-options">
    <summary class="lh-options-summary">Options</summary>
    <div class="lh-options-grid">
      <label class="lh-checkbox-row">
        <input type="checkbox" bind:checked={stripFrontmatter} />
        <span>Strip YAML frontmatter</span>
      </label>
      <label class="lh-checkbox-row">
        <input type="checkbox" bind:checked={convertWikiLinks} />
        <span>Convert [[wiki links]] to plain text</span>
      </label>
      <label class="lh-checkbox-row">
        <input type="checkbox" bind:checked={stripEmbeds} />
        <span>Remove ![[embedded file]] links</span>
      </label>
      <label class="lh-checkbox-row">
        <input type="checkbox" bind:checked={stripHighlights} />
        <span>Strip ==highlight== markers</span>
      </label>
      <div class="lh-form-row lh-form-row--full">
        <label class="lh-form-label" for="lh-separator">File separator</label>
        <input
          id="lh-separator"
          class="lh-form-input"
          type="text"
          bind:value={fileSeparator}
          placeholder="(none — files joined directly)"
        />
      </div>
    </div>
  </details>

  <!-- ── Error message ───────────────────────────────────── -->
  {#if errorMessage}
    <div class="lh-export-error" role="alert">{errorMessage}</div>
  {/if}

  <!-- ── Action buttons ──────────────────────────────────── -->
  <div class="lh-export-actions">
    <button class="mod-secondary" onclick={copyToClipboard} disabled={exporting}>
      Copy to clipboard
    </button>
    <button class="mod-cta" onclick={doExport} disabled={exporting}>
      {exporting ? 'Exporting…' : 'Export'}
    </button>
  </div>
</div>

<style>
  .lh-export-modal-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.25rem 0;
  }

  .lh-export-title {
    margin: 0 0 0.25rem;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .lh-export-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .lh-section-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }

  /* ── Format tabs ─────────────────────────── */
  .lh-format-tabs {
    display: flex;
    gap: 0.25rem;
    background: var(--background-modifier-form-field);
    border-radius: var(--radius-m);
    padding: 0.25rem;
  }

  .lh-format-tab {
    flex: 1;
    padding: 0.3rem 0.75rem;
    border-radius: calc(var(--radius-m) - 2px);
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 120ms ease, color 120ms ease;
  }

  .lh-format-tab.active {
    background: var(--background-primary);
    color: var(--text-normal);
    box-shadow: var(--shadow-s);
  }

  .lh-format-tab:hover:not(.active) {
    color: var(--text-normal);
  }

  /* ── Style gallery ───────────────────────── */
  .lh-style-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 0.5rem;
  }

  .lh-style-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    padding: 0.5rem;
    border-radius: var(--radius-m);
    border: 2px solid transparent;
    background: var(--background-modifier-form-field);
    cursor: pointer;
    transition: border-color 120ms ease, background 120ms ease;
    text-align: center;
  }

  .lh-style-card:hover {
    border-color: var(--background-modifier-border-hover);
  }

  .lh-style-card.selected {
    border-color: var(--color-accent);
  }

  .lh-style-thumbnail {
    width: 100%;
    aspect-ratio: 11 / 8.5;
    border-radius: calc(var(--radius-m) - 2px);
    overflow: hidden;
    background: var(--background-primary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lh-style-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .lh-style-thumbnail-placeholder {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-faint);
  }

  .lh-style-name {
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--text-normal);
    line-height: 1.2;
    word-break: break-word;
  }

  .lh-style-size {
    font-size: 0.7rem;
    color: var(--text-faint);
  }

  /* ── Output form ─────────────────────────── */
  .lh-form-grid {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .lh-form-row {
    display: grid;
    grid-template-columns: 120px 1fr;
    align-items: center;
    gap: 0.5rem;
  }

  .lh-form-row--full {
    grid-template-columns: 1fr;
  }

  .lh-form-label {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .lh-form-input {
    width: 100%;
    padding: 0.3rem 0.5rem;
    background: var(--background-modifier-form-field);
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-s);
    color: var(--text-normal);
    font-size: 0.85rem;
  }

  /* ── Options ─────────────────────────────── */
  .lh-export-options > summary.lh-options-summary {
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

  .lh-export-options > summary.lh-options-summary::before {
    content: '▶';
    font-size: 0.6rem;
    transition: transform 150ms ease;
  }

  .lh-export-options[open] > summary.lh-options-summary::before {
    transform: rotate(90deg);
  }

  .lh-options-grid {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding-top: 0.5rem;
  }

  .lh-checkbox-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--text-normal);
    cursor: pointer;
  }

  /* ── Error ───────────────────────────────── */
  .lh-export-error {
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-s);
    background: var(--background-modifier-error);
    color: var(--text-error);
    font-size: 0.83rem;
  }

  /* ── Actions ─────────────────────────────── */
  .lh-export-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding-top: 0.25rem;
  }
</style>
