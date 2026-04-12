<script lang="ts">
  import { join } from 'path'

  import { untrack } from 'svelte'

  import { CslStyleManager } from '@/core/CslStyleManager'
  import { DocxExporter } from '@/core/exporters/DocxExporter'
  import { EpubExporter } from '@/core/exporters/EpubExporter'
  import { PdfExporter } from '@/core/exporters/PdfExporter'
  import { ProjectCompiler } from '@/core/ProjectCompiler'
  import {
    BinaryManager,
    getBinPath,
    getPackagesCacheDir,
    getStylePath,
  } from '@/core/tools/BinaryManager'
  import type { DownloadProgress } from '@/core/tools/BinaryManager'
  import { PandocRunner } from '@/core/tools/PandocRunner'
  import type { StyleName, ToolName } from '@/core/tools/ToolsManifest'
  import { TypstRunner } from '@/core/tools/TypstRunner'
  import { BUILT_IN_STYLES, type ExportStyle } from '@/exportStyles/index'
  import type LighthousePlugin from '@/main'
  import type { LastExportSettings, Project } from '@/types/types'

  import type { TFile, TFolder } from 'obsidian'

  interface Props {
    plugin: LighthousePlugin
    project: Project
    onClose: () => void
    onSuccess: (message: string) => void
  }

  let { plugin, project, onClose, onSuccess }: Props = $props()

  type ExportFormat = 'pdf' | 'docx' | 'epub' | 'markdown'

  // Paper size options (PDF + DOCX only)
  const PAPER_SIZES = [
    { id: 'letter', label: 'US Letter (8.5 × 11")', ratio: 8.5 / 11 },
    { id: 'a4', label: 'A4 (210 × 297 mm)', ratio: 210 / 297 },
    { id: 'trade', label: 'Trade Paper (5.5 × 8.5")', ratio: 5.5 / 8.5 },
    { id: 'a5', label: 'A5 (148 × 210 mm)', ratio: 148 / 210 },
  ] as const
  type PaperSizeId = (typeof PAPER_SIZES)[number]['id']

  // Form state
  let format = $state<ExportFormat>(untrack(() => project.lastExportSettings?.format ?? 'pdf'))
  let selectedStyleId = $state(
    untrack(() => project.lastExportSettings?.selectedStyleId ?? 'novel-trade'),
  )
  let selectedPaperSizeId = $state<PaperSizeId>(
    untrack(() => (project.lastExportSettings?.selectedPaperSizeId ?? 'letter') as PaperSizeId),
  )
  let stripFrontmatter = $state(untrack(() => project.lastExportSettings?.stripFrontmatter ?? true))
  let convertWikiLinks = $state(untrack(() => project.lastExportSettings?.convertWikiLinks ?? true))
  let stripEmbeds = $state(untrack(() => project.lastExportSettings?.stripEmbeds ?? true))
  let stripHighlights = $state(untrack(() => project.lastExportSettings?.stripHighlights ?? false))
  let fileSeparator = $state(untrack(() => project.lastExportSettings?.fileSeparator ?? ''))
  let chapterPageBreaks = $state(
    untrack(() => project.lastExportSettings?.chapterPageBreaks ?? false),
  )
  let tableOfContents = $state(untrack(() => project.lastExportSettings?.tableOfContents ?? false))
  // Snapshot the initial filename at mount so the $state initialiser is a plain string,
  // not a reactive reference to the `project` prop.
  let filename = $state(untrack(() => sanitizeFilename(project.name)))
  let outputFolder = $state(untrack(() => project.lastExportSettings?.outputFolder ?? ''))
  let bibliography = $state(untrack(() => project.bibliographyPath ?? ''))
  let exporting = $state(false)
  let errorMessage = $state('')
  let userStyles = $state<ExportStyle[]>([])

  // ---------------------------------------------------------------------------
  // File picker helpers
  // ---------------------------------------------------------------------------

  async function chooseBibliography(): Promise<void> {
    try {
      // Access Electron's dialog API (available in Obsidian)
      // @ts-ignore - Electron modules available in Obsidian but not typed
      const electron = require('electron')
      // @ts-ignore
      const dialog = electron.remote?.dialog || require('@electron/remote')?.dialog
      if (!dialog) {
        throw new Error('Dialog API not available')
      }
      const result = await dialog.showOpenDialog({
        title: 'Select Bibliography File',
        properties: ['openFile'],
        filters: [
          { name: 'Bibliography Files', extensions: ['bib', 'yml', 'yaml', 'json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })
      if (!result.canceled && result.filePaths.length > 0) {
        bibliography = result.filePaths[0]
      }
    } catch (err) {
      console.error('File picker error:', err)
      // Fallback: user can still type the path manually
    }
  }

  async function chooseOutputFolder(): Promise<void> {
    try {
      // Access Electron's dialog API (available in Obsidian)
      // @ts-ignore - Electron modules available in Obsidian but not typed
      const electron = require('electron')
      // @ts-ignore
      const dialog = electron.remote?.dialog || require('@electron/remote')?.dialog
      if (!dialog) {
        throw new Error('Dialog API not available')
      }
      const result = await dialog.showOpenDialog({
        title: 'Select Output Folder',
        properties: ['openDirectory'],
      })
      if (!result.canceled && result.filePaths.length > 0) {
        // Convert to vault-relative path if inside vault
        const adapter = plugin.app.vault.adapter as unknown as { basePath: string }
        const vaultPath = adapter.basePath
        const selectedPath = result.filePaths[0]
        if (selectedPath.startsWith(vaultPath)) {
          outputFolder = selectedPath.slice(vaultPath.length + 1)
        } else {
          outputFolder = selectedPath
        }
      }
    } catch (err) {
      console.error('File picker error:', err)
      // Fallback: user can still type the path manually
    }
  }

  // ---------------------------------------------------------------------------
  // Tool installation state
  // ---------------------------------------------------------------------------

  type ToolStatus = 'checking' | 'ready' | 'needs-install'

  // Which tools each format needs
  const FORMAT_TOOLS: Record<ExportFormat, ToolName[]> = {
    pdf: ['typst'],
    docx: ['pandoc'],
    epub: ['pandoc'],
    markdown: [],
  }

  const binaryManager = $derived(new BinaryManager(plugin))
  const cslManager = $derived(new CslStyleManager(plugin))

  let pandocStatus = $state<ToolStatus>('checking')
  let typstStatus = $state<ToolStatus>('checking')
  let downloadingTool = $state<ToolName | null>(null)
  let downloadProgress = $state<DownloadProgress | null>(null)
  let downloadError = $state('')

  // Derived: all tools needed for the current format are ready
  const toolsReady = $derived(
    FORMAT_TOOLS[format].every((t) => {
      if (t === 'pandoc') return pandocStatus === 'ready'
      if (t === 'typst') return typstStatus === 'ready'
      return true
    }),
  )

  // Derived: tools required for this format that still need installing
  const missingTools = $derived(
    FORMAT_TOOLS[format].filter((t) => {
      if (t === 'pandoc') return pandocStatus === 'needs-install'
      if (t === 'typst') return typstStatus === 'needs-install'
      return false
    }),
  )

  $effect(() => {
    checkToolStatus()
  })

  function checkToolStatus(): void {
    pandocStatus = binaryManager.isReady('pandoc') ? 'ready' : 'needs-install'
    typstStatus = binaryManager.isReady('typst') ? 'ready' : 'needs-install'
  }

  async function installTool(tool: ToolName): Promise<void> {
    downloadingTool = tool
    downloadError = ''
    downloadProgress = { fraction: 0, received: 0, total: 0 }
    try {
      await binaryManager.install(tool, (p) => {
        downloadProgress = p
      })
      if (tool === 'pandoc') pandocStatus = 'ready'
      if (tool === 'typst') typstStatus = 'ready'
    } catch (err) {
      downloadError = err instanceof Error ? err.message : String(err)
    } finally {
      downloadingTool = null
      downloadProgress = null
    }
  }

  function formatBytes(n: number): string {
    if (n < 1024) return `${n} B`
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
    return `${(n / (1024 * 1024)).toFixed(1)} MB`
  }

  const allStyles = $derived([...BUILT_IN_STYLES, ...userStyles])
  const selectedStyle = $derived(
    allStyles.find((s) => s.id === selectedStyleId) ?? BUILT_IN_STYLES[0],
  )
  const selectedPaperSize = $derived(
    PAPER_SIZES.find((p) => p.id === selectedPaperSizeId) ?? PAPER_SIZES[0],
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

  /**
   * Write file to disk, handling both vault-relative and absolute paths.
   * For absolute paths outside the vault, uses Node.js fs directly.
   * For vault-relative paths, uses Obsidian's vault adapter.
   */
  async function writeFile(
    path: string,
    content: string | ArrayBuffer | Uint8Array,
  ): Promise<string> {
    const adapter = plugin.app.vault.adapter as unknown as { basePath: string }
    const isAbsolute = path.startsWith('/')

    if (isAbsolute) {
      // @ts-ignore - require available in Obsidian
      const fs = require('fs') as typeof import('fs')
      // @ts-ignore - require available in Obsidian
      const { dirname } = require('path') as typeof import('path')

      // Ensure directory exists
      const dir = dirname(path)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      // Write file using Node.js fs
      if (typeof content === 'string') {
        fs.writeFileSync(path, content, 'utf8')
      } else if (content instanceof Uint8Array) {
        fs.writeFileSync(path, content)
      } else {
        // ArrayBuffer
        fs.writeFileSync(path, new Uint8Array(content))
      }

      return path
    } else {
      // Vault-relative path - use vault adapter
      if (typeof content === 'string') {
        await plugin.app.vault.adapter.write(path, content)
      } else {
        // Convert to ArrayBuffer
        const buffer =
          content instanceof Uint8Array
            ? content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength)
            : content
        await plugin.app.vault.adapter.writeBinary(path, buffer as ArrayBuffer)
      }

      return join(adapter.basePath, path)
    }
  }

  /**
   * Save current export settings to project for next time
   */
  async function saveExportSettings(): Promise<void> {
    const settings: LastExportSettings = {
      format,
      outputFolder,
      selectedStyleId,
      selectedPaperSizeId,
      stripFrontmatter,
      convertWikiLinks,
      stripEmbeds,
      stripHighlights,
      fileSeparator,
      chapterPageBreaks,
      tableOfContents,
    }

    const updatedProject = {
      ...project,
      lastExportSettings: settings,
      updatedAt: new Date().toISOString(),
    }

    await plugin.projectManager.updateProject(updatedProject)
  }

  /**
   * Resolve a bibliography or citation style path to absolute
   */
  function resolveResourcePath(path: string): string | undefined {
    if (!path || !path.trim()) return undefined
    const trimmed = path.trim()
    const adapter = plugin.app.vault.adapter as unknown as { basePath: string }
    return trimmed.startsWith('/') ? trimmed : join(adapter.basePath, trimmed)
  }

  /**
   * Resolve a citation style ID or path to absolute path
   */
  function resolveCitationStyle(styleIdOrPath: string | undefined): string | undefined {
    if (!styleIdOrPath || !styleIdOrPath.trim()) return undefined
    return cslManager.resolveStylePath(styleIdOrPath.trim())
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

      // Strip citations if no bibliography provided for formats that process them
      const shouldStripCitations =
        !bibliography.trim() && (format === 'pdf' || format === 'docx' || format === 'epub')

      // Set appropriate separator for chapter page breaks
      let effectiveSeparator = fileSeparator
      if (chapterPageBreaks && !fileSeparator) {
        if (format === 'pdf') {
          // Use raw-typst comment with blank lines to ensure it's treated as a block
          effectiveSeparator = '\n\n<!--raw-typst #pagebreak() -->\n\n'
        } else if (format === 'docx') {
          effectiveSeparator = '\\newpage'
        }
      }

      const compiler = new ProjectCompiler((path) => plugin.app.vault.adapter.read(path))
      const doc = await compiler.compile(project, filePaths, {
        stripFrontmatter,
        convertWikiLinks,
        stripEmbeds,
        stripHighlights,
        fileSeparator: effectiveSeparator,
        stripCitations: shouldStripCitations,
        chapterPageBreaks,
      })

      if (format === 'markdown') {
        const outPath = resolveOutputPath('md')
        const absolutePath = await writeFile(outPath, doc.fullText)
        await saveExportSettings()
        onSuccess(`Exported to ${absolutePath}`)
      } else if (format === 'docx') {
        const pandoc = makePandocRunner()
        const exporter = new DocxExporter(pandoc)
        const referenceDoc = binaryManager.isStyleReady(selectedStyleId as StyleName, 'docx')
          ? getStylePath(selectedStyleId as StyleName, 'docx', plugin)
          : undefined
        const buffer = await exporter.export(doc, {
          referenceDoc,
          bibliography: resolveResourcePath(bibliography),
          citationStyle: resolveCitationStyle(project.citationStyle),
          tableOfContents,
        })
        const outPath = resolveOutputPath('docx')
        const absolutePath = await writeFile(outPath, buffer)
        await saveExportSettings()
        onSuccess(`Exported to ${absolutePath}`)
      } else if (format === 'epub') {
        const pandoc = makePandocRunner()
        const exporter = new EpubExporter(pandoc)
        const bytes = await exporter.export(doc, {
          title: doc.projectName,
          bibliography: resolveResourcePath(bibliography),
          citationStyle: resolveCitationStyle(project.citationStyle),
          tableOfContents,
        })
        const outPath = resolveOutputPath('epub')
        const absolutePath = await writeFile(outPath, bytes)
        await saveExportSettings()
        onSuccess(`Exported to ${absolutePath}`)
      } else if (format === 'pdf') {
        const typst = new TypstRunner(getBinPath('typst', plugin))
        const exporter = new PdfExporter(typst)
        const adapter = plugin.app.vault.adapter as unknown as { basePath: string }
        const outPath = resolveOutputPath('pdf')
        // For PDF, we need absolute path for Typst
        const absPath = outPath.startsWith('/') ? outPath : join(adapter.basePath, outPath)
        const template = binaryManager.isStyleReady(selectedStyleId as StyleName, 'typst')
          ? getStylePath(selectedStyleId as StyleName, 'typst', plugin)
          : undefined

        await exporter.export(doc, {
          outputPath: absPath,
          packageCacheDir: getPackagesCacheDir(plugin),
          paperSize: typstPaperSize(selectedPaperSizeId),
          template,
          bibliography: resolveResourcePath(bibliography),
          citationStyle: resolveCitationStyle(project.citationStyle),
          tableOfContents,
          chapterPageBreaks,
        })
        await saveExportSettings()
        onSuccess(`Exported PDF to ${absPath}`)
      }
    } catch (err) {
      console.error('[Lighthouse] Export failed:', err)
      errorMessage = formatErrorMessage(err)
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
        stripCitations: false,
      })

      await navigator.clipboard.writeText(doc.fullText)
      onSuccess('Copied to clipboard')
    } catch (err) {
      console.error('[Lighthouse] Copy failed:', err)
      errorMessage = formatErrorMessage(err)
    } finally {
      exporting = false
    }
  }

  // Map our paper size IDs to Typst's paper size strings
  function typstPaperSize(id: PaperSizeId): string {
    const map: Record<PaperSizeId, string> = {
      letter: 'us-letter',
      a4: 'a4',
      trade: 'us-trade',
      a5: 'a5',
    }
    return map[id] ?? 'us-letter'
  }

  /**
   * Format error messages to be more user-friendly.
   * Detects common error patterns and provides helpful guidance.
   */
  function formatErrorMessage(err: unknown): string {
    const message = err instanceof Error ? err.message : String(err)

    // Detect citation/label errors from Typst
    if (message.includes('label') && message.includes('does not exist in the document')) {
      // Check for multi-citation syntax errors (e.g., label("key1; @key2"))
      const hasMultiCitations = message.includes('label("') && message.includes('; @')

      if (hasMultiCitations) {
        return 'Multi-citation syntax detected (e.g., [@key1; @key2]). Please ensure you have a bibliography file specified in the "Bibliography" field. The plugin will automatically split multi-citations for processing.'
      }

      // Extract citation keys from the error
      const labelMatches = message.match(/label `<([^>]+)>`/g)
      const citationCount = labelMatches ? new Set(labelMatches).size : 0

      return citationCount > 0
        ? `Found ${citationCount} unresolved citation${citationCount === 1 ? '' : 's'}. Add a bibliography file (BibTeX, YAML, or JSON) in the "Bibliography" field below to resolve citations.`
        : 'Found unresolved citations. Add a bibliography file to resolve them.'
    }

    // Detect Typst compilation errors
    if (message.includes('Typst compilation failed')) {
      // Extract the first actual error line if possible
      const errorMatch = message.match(/error: ([^\n]+)/)
      if (errorMatch) {
        return `PDF compilation failed: ${errorMatch[1]}`
      }
      return 'PDF compilation failed. Check the console for details.'
    }

    // Detect Pandoc errors
    if (message.includes('Pandoc conversion failed')) {
      return 'Document conversion failed. Check the console for details.'
    }

    // Default: return the message as-is, but truncate if too long
    if (message.length > 200) {
      return message.slice(0, 197) + '...'
    }

    return message
  }

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Pandoc runner
  // ---------------------------------------------------------------------------

  function makePandocRunner(): PandocRunner {
    return new PandocRunner(getBinPath('pandoc', plugin))
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

  <!-- ── Tool installation prompt ─────────────────────────── -->
  {#if missingTools.length > 0 || downloadingTool !== null}
    <div class="lh-tool-banner">
      {#if downloadingTool !== null && downloadProgress !== null}
        <!-- Actively downloading -->
        <div class="lh-tool-banner-text">
          Downloading {downloadingTool}…
          {#if downloadProgress.total > 0}
            {formatBytes(downloadProgress.received)} / {formatBytes(downloadProgress.total)}
          {:else}
            {formatBytes(downloadProgress.received)} received
          {/if}
        </div>
        <div class="lh-tool-progress">
          <div
            class="lh-tool-progress-fill"
            style="width: {downloadProgress.fraction >= 0
              ? Math.round(downloadProgress.fraction * 100)
              : 50}%"
          ></div>
        </div>
        {#if downloadError}
          <p class="lh-tool-error">{downloadError}</p>
        {/if}
      {:else}
        <!-- Needs install -->
        <div class="lh-tool-banner-row">
          <div class="lh-tool-banner-text">
            {#if missingTools.length === 2}
              PDF export requires <strong>Pandoc</strong> and <strong>Typst</strong> (~65 MB total).
            {:else if missingTools[0] === 'pandoc'}
              {format.toUpperCase()} export requires <strong>Pandoc</strong> (~30 MB).
            {:else}
              PDF export requires <strong>Typst</strong> (~35 MB).
            {/if}
            These are downloaded once and stored with the plugin.
          </div>
          <div class="lh-tool-banner-actions">
            {#each missingTools as tool (tool)}
              <button
                class="lh-tool-install-btn"
                onclick={() => void installTool(tool)}
                disabled={downloadingTool !== null}
              >
                Install {tool}
              </button>
            {/each}
          </div>
        </div>
        {#if downloadError}
          <p class="lh-tool-error">{downloadError}</p>
        {/if}
      {/if}
    </div>
  {/if}

  <!-- ── Controls ─────────────────────────────────────────── -->
  <div class="lh-controls">
    {#if format === 'pdf' || format === 'docx'}
      <div class="lh-row">
        <label class="lh-lbl" for="lh-style">Style</label>
        <select id="lh-style" class="lh-select" bind:value={selectedStyleId}>
          {#each allStyles as style (style.id)}
            <option value={style.id}>{style.name}</option>
          {/each}
        </select>
      </div>
      <div class="lh-row">
        <label class="lh-lbl" for="lh-paper">Paper size</label>
        <select id="lh-paper" class="lh-select" bind:value={selectedPaperSizeId}>
          {#each PAPER_SIZES as ps (ps.id)}
            <option value={ps.id}>{ps.label}</option>
          {/each}
        </select>
      </div>
      {#if format === 'pdf'}
        <div class="lh-row">
          <label class="lh-lbl" for="lh-bib">Bibliography</label>
          <div style="display: flex; gap: 4px; flex: 1;">
            <input
              id="lh-bib"
              class="lh-input"
              type="text"
              bind:value={bibliography}
              placeholder="path/to/refs.bib (optional)"
              style="flex: 1;"
            />
            <button
              class="lh-file-picker-btn"
              type="button"
              onclick={chooseBibliography}
              aria-label="Choose bibliography file"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="svg-icon lucide-file-text"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"
                ></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <line x1="10" y1="9" x2="8" y2="9"></line>
              </svg>
            </button>
          </div>
        </div>
      {/if}
    {:else if format === 'epub'}
      <p class="lh-epub-note">
        ePub is a container format — typography is applied by the reader app (Apple Books, Kindle,
        Kobo, etc.). Your content will be exported as clean, semantic HTML and styled by the reader.
      </p>
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
      <div style="display: flex; gap: 4px; flex: 1;">
        <input
          id="lh-folder"
          class="lh-input"
          type="text"
          bind:value={outputFolder}
          placeholder="Vault root"
          style="flex: 1;"
        />
        <button
          class="lh-file-picker-btn"
          type="button"
          onclick={chooseOutputFolder}
          aria-label="Choose output folder"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="svg-icon lucide-folder"
          >
            <path
              d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
            ></path>
          </svg>
        </button>
      </div>
    </div>
  </div>

  <!-- ── Options (collapsible) ─────────────────────────────── -->
  <details class="lh-opts">
    <summary>Options</summary>
    <div class="lh-opts-body">
      <label><input type="checkbox" bind:checked={stripFrontmatter} /> Strip YAML frontmatter</label
      >
      <label
        ><input type="checkbox" bind:checked={convertWikiLinks} /> Convert [[wiki links]] to plain text</label
      >
      <label
        ><input type="checkbox" bind:checked={stripEmbeds} /> Remove ![[embedded file]] links</label
      >
      <label
        ><input type="checkbox" bind:checked={stripHighlights} /> Strip ==highlight== markers</label
      >
      <label
        ><input type="checkbox" bind:checked={chapterPageBreaks} /> Start chapters on new pages</label
      >
      {#if format === 'pdf'}
        <label
          ><input type="checkbox" bind:checked={tableOfContents} /> Generate table of contents</label
        >
      {/if}
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
    <button class="mod-cta" onclick={doExport} disabled={exporting || !toolsReady}>
      {exporting ? 'Exporting…' : !toolsReady ? 'Install tools to export' : 'Export'}
    </button>
  </div>
</div>

<style>
  .lh-export {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    padding: 0.1rem 0;
    margin-top: 1em;
  }

  /* ── Tool install banner ─────────────────── */
  .lh-tool-banner {
    border-radius: var(--radius-m);
    background: color-mix(in srgb, var(--color-accent) 8%, var(--background-secondary));
    border: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
    padding: 0.65rem 0.9rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .lh-tool-banner-row {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    justify-content: space-between;
  }

  .lh-tool-banner-text {
    font-size: 0.83rem;
    color: var(--text-normal);
    line-height: 1.45;
    flex: 1;
  }

  .lh-tool-banner-actions {
    display: flex;
    gap: 0.4rem;
    flex-shrink: 0;
  }

  .lh-tool-install-btn {
    padding: 0.25rem 0.7rem;
    font-size: 0.82rem;
    border-radius: var(--radius-s);
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    border: none;
    cursor: pointer;
    white-space: nowrap;
  }

  .lh-tool-install-btn:hover:not(:disabled) {
    background: var(--interactive-accent-hover);
  }

  .lh-tool-install-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .lh-tool-progress {
    height: 4px;
    background: var(--background-modifier-border);
    border-radius: 2px;
    overflow: hidden;
  }

  .lh-tool-progress-fill {
    height: 100%;
    background: var(--interactive-accent);
    border-radius: 2px;
    transition: width 200ms ease;
    min-width: 4px;
  }

  .lh-tool-error {
    margin: 0;
    font-size: 0.8rem;
    color: var(--text-error);
    line-height: 1.4;
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

  /* ── Controls ────────────────────────────── */
  .lh-controls {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .lh-epub-note {
    margin: 0;
    font-size: 0.82rem;
    color: var(--text-muted);
    line-height: 1.45;
    font-style: italic;
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
    height: 32px;
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

  .lh-file-picker-btn {
    height: 32px;
    width: 32px;
    padding: 0;
    background: var(--background-modifier-form-field);
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-s);
    color: var(--text-muted);
    cursor: pointer;
    transition:
      background 120ms ease,
      border-color 120ms ease,
      color 120ms ease;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lh-file-picker-btn:hover {
    background: var(--background-modifier-form-field-highlighted);
    border-color: var(--interactive-accent);
    color: var(--text-normal);
  }

  .lh-file-picker-btn svg {
    width: 16px;
    height: 16px;
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
    padding: 0.6rem 0.75rem;
    border-radius: var(--radius-s);
    background: color-mix(in srgb, var(--color-red) 8%, var(--background-secondary));
    border-left: 3px solid var(--color-red);
    color: var(--text-normal);
    font-size: 0.83rem;
    line-height: 1.4;
  }

  /* ── Footer ──────────────────────────────── */
  .lh-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding-top: 0.25rem;
  }
</style>
