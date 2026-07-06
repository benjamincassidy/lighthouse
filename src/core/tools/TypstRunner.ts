/**
 * TypstRunner — compiles a Markdown document to PDF using the local Typst
 * binary and the cmarker Typst package.
 *
 * Pipeline:
 *   1. Write the compiled Markdown to a temp file.
 *   2. Either use a caller-supplied .typ template, or generate a minimal
 *      built-in shim that imports cmarker and sets basic page geometry.
 *   3. Invoke `typst compile <entry.typ> <output.pdf>` with the content file
 *      path passed via `--input content=<path>`.
 *   4. Clean up temp files.
 *
 * The cmarker package (https://typst.app/universe/package/cmarker/) parses
 * CommonMark Markdown directly inside Typst — no pandoc required for PDF.
 * On first use Typst downloads cmarker from packages.typst.org automatically;
 * subsequent compiles are fully offline.
 *
 * Custom templates receive the content path via sys.inputs.content:
 *
 *   #import "@preview/cmarker:0.1.8"
 *   // ... page setup, fonts, etc.
 *   #cmarker.render(read(sys.inputs.content))
 *
 * BibTeX bibliographies can be added by the template or via a raw-typst
 * comment in the Markdown:
 *
 *   <!--raw-typst #bibliography("refs.bib") -->
 */

import { Platform } from 'obsidian'

import { getDesktopProcess, requireDesktopModule } from '@/utils/desktopNode'

export const CMARKER_VERSION = '0.1.8'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TypestPdfOptions {
  /** Absolute path where the output PDF should be written */
  outputPath: string
  /**
   * Absolute path of a .typ template file. The template is compiled as the
   * entry point and must call:
   *   #cmarker.render(read(sys.inputs.content))
   * to render the document body.
   *
   * When omitted, a minimal built-in shim is used.
   */
  template?: string
  /**
   * Typst paper size string, e.g. "us-letter", "a4", "us-trade", "a5".
   * Only used when no template is provided. Default: "us-letter".
   */
  paperSize?: string
  /**
   * Directory to use as Typst's package cache (TYPST_PACKAGE_CACHE_PATH).
   * Redirects the default ~/.cache/typst/packages to the plugin's own bin
   * directory so the plugin is self-contained and vault-portable.
   */
  packageCacheDir?: string
  /**
   * Absolute path to a bibliography file (.bib, .yml, .yaml, .json).
   * When provided, citations in the markdown will be resolved against this file.
   */
  bibliography?: string
  /**
   * Absolute path to a CSL (Citation Style Language) file for formatting citations.
   * Requires bibliography to be set. Common styles: APA, Chicago, MLA, etc.
   */
  citationStyle?: string
  /** Include a table of contents at the start of the document (default: false) */
  tableOfContents?: boolean
  /** Insert page breaks before top-level headings (default: false) */
  chapterPageBreaks?: boolean
}

// ---------------------------------------------------------------------------
// TypstRunner
// ---------------------------------------------------------------------------

export class TypstRunner {
  constructor(private typstPath: string) {}

  async toPdf(markdownContent: string, opts: TypestPdfOptions): Promise<void> {
    const os = requireDesktopModule<typeof import('os')>('os')
    const fs = requireDesktopModule<typeof import('fs')>('fs')
    const path = requireDesktopModule<typeof import('path')>('path')

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const tmpDir = os.tmpdir()

    // Write markdown to a temp file — typst reads it via sys.inputs.content
    const contentPath = path.join(tmpDir, `lh-content-${id}.md`)
    fs.writeFileSync(contentPath, markdownContent, 'utf8')

    // Use caller template or generate a minimal shim
    let shimPath: string | null = null
    const entryPath =
      opts.template ??
      (() => {
        shimPath = path.join(tmpDir, `lh-shim-${id}.typ`)
        fs.writeFileSync(
          shimPath,
          buildShim(
            opts.paperSize ?? 'us-letter',
            !!opts.bibliography,
            !!opts.tableOfContents,
            !!opts.chapterPageBreaks,
            opts.citationStyle,
          ),
          'utf8',
        )
        return shimPath
      })()

    try {
      await this.compile(
        entryPath,
        opts.outputPath,
        contentPath,
        opts.packageCacheDir,
        opts.bibliography,
      )
    } finally {
      tryUnlink(contentPath)
      if (shimPath) tryUnlink(shimPath)
    }
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private compile(
    entryPath: string,
    outputPath: string,
    contentPath: string,
    packageCacheDir?: string,
    bibliographyPath?: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!Platform.isDesktop) {
        reject(new Error('PDF export is only available on desktop.'))
        return
      }

      const childProcess = requireDesktopModule<typeof import('child_process')>('child_process')
      const fs = requireDesktopModule<typeof import('fs')>('fs')
      const processRef = getDesktopProcess()

      const args = [
        'compile',
        entryPath,
        outputPath,
        '--root',
        '/',
        '--input',
        `content=${contentPath}`,
      ]

      if (bibliographyPath) {
        args.push('--input', `bibliography=${bibliographyPath}`)
      }

      const env: Record<string, string | undefined> = { ...processRef.env }

      if (packageCacheDir) {
        // Redirect the package cache into the plugin's own bin directory.
        // Typst fetches cmarker from packages.typst.org on first use and
        // caches it here; subsequent compiles are fully offline.
        if (!fs.existsSync(packageCacheDir)) fs.mkdirSync(packageCacheDir, { recursive: true })
        env.TYPST_PACKAGE_CACHE_PATH = packageCacheDir
      }

      const child = childProcess.spawn(this.typstPath, args, { env })
      const stderrChunks: Uint8Array[] = []

      child.stderr.on('data', (chunk: Uint8Array) => stderrChunks.push(chunk))

      child.once('close', (code) => {
        const stderrStr = decodeUtf8(concatChunks(stderrChunks))
        if (stderrStr) console.debug('[Lighthouse] typst stderr:', stderrStr)
        if (code !== 0) {
          reject(new Error(`Typst compilation failed (exit ${code}): ${stderrStr}`))
        } else {
          resolve()
        }
      })

      child.once('error', (err) => {
        reject(new Error(`Failed to spawn typst: ${err.message}`))
      })
    })
  }
}

// ---------------------------------------------------------------------------
// Built-in minimal shim (used when no template is provided)
// ---------------------------------------------------------------------------

function buildShim(
  paperSize: string,
  hasBibliography: boolean,
  hasTableOfContents: boolean,
  chapterPageBreaks: boolean = false,
  citationStyle?: string,
): string {
  let shim = `#import "@preview/cmarker:${CMARKER_VERSION}"

#set page(paper: "${paperSize}")
#set text(size: 11pt)
#set par(leading: 0.75em)

`

  // Insert page breaks before top-level headings (chapters)
  if (chapterPageBreaks) {
    shim += `#show heading.where(level: 1): it => {
  pagebreak(weak: true)
  it
}

`
  }

  if (hasTableOfContents) {
    shim += `#outline(depth: 3, indent: 2em)
#pagebreak()

`
  }

  shim += `#cmarker.render(read(sys.inputs.content))
`

  if (hasBibliography) {
    if (citationStyle) {
      shim += `\n#bibliography(sys.inputs.bibliography, style: "${citationStyle}")
`
    } else {
      shim += `\n#bibliography(sys.inputs.bibliography)
`
    }
  }

  return shim
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function tryUnlink(path: string): void {
  const fs = requireDesktopModule<typeof import('fs')>('fs')
  try {
    fs.unlinkSync(path)
  } catch {
    // Best-effort cleanup
  }
}

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}
