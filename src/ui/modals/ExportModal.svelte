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
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="lh-export" role="dialog" aria-label="Export project">
  <h2 class="lh-export-heading">Export — {project.name}</h2>

  <!-- ── Format tabs ─────────────────────────────────────── -->
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

  <!-- ── Style picker (hidden for Markdown) ──────────────── -->
  {#if format !== 'markdown'}
    <div class="lh-pick">
      <span class="lh-pick-label">Style</span>
      <div class="lh-pick-row" role="listbox" aria-label="Export styles">
        {#each allStyles as style (style.id)}
          {@const isSelected = selectedStyleId === style.id}
          <button
            role="option"
            aria-selected={isSelected}
            class="lh-card"
            class:lh-card--on={isSelected}
            onclick={() => (selectedStyleId = style.id)}
          >
            <!--
              The SVG has explicit width/height attrs (160×220) giving it
              definite intrinsic dimensions. The inline style then overrides
              those to fill the card width while height:auto preserves the
              8:11 aspect ratio. This is bulletproof across all Chromium builds.
            -->
            <div class="lh-card-thumb">
              {#if style.builtIn}
                {@html style.previewSvg}
              {:else if style.previewSvg}
                <img src={style.previewSvg} alt="" />
              {:else}
                <div class="lh-card-initial">{style.name.charAt(0)}</div>
              {/if}
            </div>
            <div class="lh-card-name">{style.name}</div>
            <div class="lh-card-size">{style.pageSize}</div>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- ── Output ───────────────────────────────────────────── -->
  <div class="lh-fields">
    <div class="lh-field">
      <label for="lh-fname">Filename</label>
      <input id="lh-fname" type="text" bind:value={filename} placeholder={sanitizeFilename(project.name)} />
    </div>
    <div class="lh-field">
      <label for="lh-folder">Output folder</label>
      <input id="lh-folder" type="text" bind:value={outputFolder} placeholder="Vault root" />
    </div>
  </div>

  <!-- ── Options (collapsible) ────────────────────────────── -->
  <details class="lh-options">
    <summary>Options</summary>
    <div class="lh-options-body">
      <label><input type="checkbox" bind:checked={stripFrontmatter} /> Strip YAML frontmatter</label>
      <label><input type="checkbox" bind:checked={convertWikiLinks} /> Convert [[wiki links]] to plain text</label>
      <label><input type="checkbox" bind:checked={stripEmbeds} /> Remove ![[embedded file]] links</label>
      <label><input type="checkbox" bind:checked={stripHighlights} /> Strip ==highlight== markers</label>
      <div class="lh-field lh-field--full">
        <label for="lh-sep">File separator</label>
        <input id="lh-sep" type="text" bind:value={fileSeparator} placeholder="(none — files joined directly)" />
      </div>
    </div>
  </details>

  {#if errorMessage}
    <div class="lh-error" role="alert">{errorMessage}</div>
  {/if}

  <div class="lh-footer">
    <button class="mod-secondary" onclick={copyToClipboard} disabled={exporting}>Copy to clipboard</button>
    <button class="mod-cta" onclick={doExport} disabled={exporting}>{exporting ? 'Exporting…' : 'Export'}</button>
  </div>
</div>

<style>
  /* ── Shell ───────────────────────────────── */
  .lh-export {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.25rem 0;
  }

  .lh-export-heading {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
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

  /* ── Style picker ────────────────────────── */
  .lh-pick {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .lh-pick-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }

  .lh-pick-row {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .lh-card {
    flex: 0 0 auto;
    width: 110px;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.4rem;
    border-radius: var(--radius-m);
    border: 2px solid var(--background-modifier-border);
    background: var(--background-secondary);
    cursor: pointer;
    text-align: center;
    transition:
      border-color 120ms ease,
      background 120ms ease;
  }

  .lh-card:hover {
    border-color: var(--background-modifier-border-hover);
  }

  .lh-card--on {
    border-color: var(--color-accent);
    background: var(--background-primary);
  }

  /*
   * Thumbnail wrapper — let it size to content (the SVG inside).
   * No height, no padding tricks.
   */
  .lh-card-thumb {
    width: 100%;
    overflow: hidden;
    border-radius: 3px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    line-height: 0; /* collapse whitespace gap below inline SVG */
  }

  /*
   * The SVG has explicit width="160" height="220" attributes, giving it a
   * definite 160:220 intrinsic size. CSS overrides: width fills the card,
   * height:auto lets the browser compute it from the intrinsic aspect ratio.
   * This works in every Chromium version — no flex height context needed.
   */
  .lh-card-thumb :global(svg) {
    display: block;
    width: 100%;
    height: auto;
  }

  .lh-card-thumb img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 8 / 11;
    object-fit: cover;
  }

  .lh-card-initial {
    width: 100%;
    aspect-ratio: 8 / 11;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-muted);
    background: var(--background-modifier-form-field);
  }

  .lh-card-name {
    font-size: 0.76rem;
    font-weight: 500;
    color: var(--text-normal);
    line-height: 1.2;
    word-break: break-word;
  }

  .lh-card-size {
    font-size: 0.68rem;
    color: var(--text-faint);
  }

  /* ── Output fields ───────────────────────── */
  .lh-fields {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .lh-field {
    display: grid;
    grid-template-columns: 110px 1fr;
    align-items: center;
    gap: 0.5rem;
  }

  .lh-field--full {
    grid-template-columns: 1fr;
  }

  .lh-field label {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .lh-field input[type='text'] {
    width: 100%;
    padding: 0.3rem 0.5rem;
    background: var(--background-modifier-form-field);
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-s);
    color: var(--text-normal);
    font-size: 0.85rem;
  }

  /* ── Options ─────────────────────────────── */
  .lh-options > summary {
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

  .lh-options > summary::before {
    content: '▶';
    font-size: 0.6rem;
    transition: transform 150ms ease;
  }

  .lh-options[open] > summary::before {
    transform: rotate(90deg);
  }

  .lh-options-body {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding-top: 0.5rem;
  }

  .lh-options-body label {
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
