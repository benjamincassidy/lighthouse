/**
 * PandocRunner — executes the local pandoc binary to convert Markdown to
 * DOCX and ePub3. PDF is handled separately by TypstRunner.
 *
 * Pandoc reads markdown from stdin; binary outputs (DOCX, ePub) are written
 * to a temp file then read back and returned as raw bytes.
 */

import { Platform } from 'obsidian'

import { getDesktopProcess, requireDesktopModule } from '@/utils/desktopNode'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PandocDocxOptions {
  /** Path to a .docx reference document for styling */
  referenceDoc?: string
  /** Absolute path to a bibliography file (.bib, .yml, .yaml, .json) */
  bibliography?: string
  /** Absolute path to a CSL file for formatting citations */
  citationStyle?: string
  /** Include a table of contents at the start of the document */
  tableOfContents?: boolean
}

export interface PandocEpubOptions {
  /** Path to a CSS file to embed in the ePub */
  cssPath?: string
  title?: string
  author?: string
  language?: string
  /** Absolute path to a bibliography file (.bib, .yml, .yaml, .json) */
  bibliography?: string
  /** Absolute path to a CSL file for formatting citations */
  citationStyle?: string
  /** Include a table of contents at the start of the document */
  tableOfContents?: boolean
}

export type PandocFormat = 'docx' | 'epub3'

// ---------------------------------------------------------------------------
// PandocRunner
// ---------------------------------------------------------------------------

export class PandocRunner {
  constructor(private pandocPath: string) {}

  // ---------------------------------------------------------------------------
  // Public conversion methods
  // ---------------------------------------------------------------------------

  /** Convert markdown → .docx; returns the output file bytes */
  async toDocx(markdown: string, opts: PandocDocxOptions = {}): Promise<Uint8Array> {
    const outputPath = tmpPath('lighthouse-export', '.docx')
    const args: string[] = [
      '--from',
      'markdown+smart',
      '--to',
      'docx',
      '--output',
      outputPath,
      '--standalone',
    ]

    if (opts.tableOfContents) {
      args.push('--toc')
    }

    if (opts.referenceDoc) {
      args.push('--reference-doc', opts.referenceDoc)
    }

    if (opts.bibliography) {
      // Add page break before bibliography section
      markdown = markdown + '\n\n\\newpage\n\n'
      args.push('--bibliography', opts.bibliography)
      args.push('--citeproc') // Enable citation processing
      args.push('--metadata', 'reference-section-title=Bibliography')
      args.push('--metadata', 'link-citations=true')
    }

    if (opts.citationStyle) {
      args.push('--csl', opts.citationStyle)
    }

    await this.run(args, markdown)

    const buf = readFileSyncBuffer(outputPath)
    tryUnlink(outputPath)
    return buf
  }

  /** Convert markdown → .epub3; returns the output file bytes */
  async toEpub(markdown: string, opts: PandocEpubOptions = {}): Promise<Uint8Array> {
    const outputPath = tmpPath('lighthouse-export', '.epub')
    const args: string[] = [
      '--from',
      'markdown+smart',
      '--to',
      'epub3',
      '--output',
      outputPath,
      '--standalone',
    ]

    if (opts.tableOfContents) {
      args.push('--toc')
    }

    if (opts.title) args.push('--metadata', `title=${opts.title}`)
    if (opts.author) args.push('--metadata', `author=${opts.author}`)
    if (opts.language) args.push('--metadata', `lang=${opts.language}`)
    if (opts.cssPath) args.push('--css', opts.cssPath)

    if (opts.bibliography) {
      args.push('--bibliography', opts.bibliography)
      args.push('--citeproc') // Enable citation processing
      args.push('--metadata', 'reference-section-title=Bibliography')
      args.push('--metadata', 'link-citations=true')
    }

    if (opts.citationStyle) {
      args.push('--csl', opts.citationStyle)
    }

    await this.run(args, markdown)

    const buf = readFileSyncBuffer(outputPath)
    tryUnlink(outputPath)
    return buf
  }

  // ---------------------------------------------------------------------------
  // Core execution
  // ---------------------------------------------------------------------------

  private run(
    args: string[],
    stdinContent: string,
    env?: Record<string, string | undefined>,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!Platform.isDesktop) {
        reject(new Error('Pandoc export is only available on desktop.'))
        return
      }

      const childProcess = requireDesktopModule<typeof import('child_process')>('child_process')
      const processRef = getDesktopProcess()

      const child = childProcess.spawn(this.pandocPath, args, {
        env: env ?? processRef.env,
      })

      const stdoutChunks: Uint8Array[] = []
      const stderrChunks: Uint8Array[] = []

      child.stdout.on('data', (chunk: Uint8Array) => stdoutChunks.push(chunk))
      child.stderr.on('data', (chunk: Uint8Array) => stderrChunks.push(chunk))

      child.once('close', (code) => {
        const stderrStr = decodeUtf8(concatChunks(stderrChunks))
        if (stderrStr) console.debug('[Lighthouse] pandoc stderr:', stderrStr)

        if (code !== 0) {
          reject(new Error(`Pandoc conversion failed (exit ${code}): ${stderrStr}`))
        } else {
          resolve(decodeUtf8(concatChunks(stdoutChunks)))
        }
      })

      child.once('error', (err) => {
        reject(new Error(`Failed to spawn pandoc: ${err.message}`))
      })

      child.stdin.write(stdinContent, 'utf8')
      child.stdin.end()
    })
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

let _tmpCounter = 0

function tmpPath(prefix: string, ext: string): string {
  const os = requireDesktopModule<typeof import('os')>('os')
  const fs = requireDesktopModule<typeof import('fs')>('fs')
  const path = requireDesktopModule<typeof import('path')>('path')

  const dir = os.tmpdir()
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, `${prefix}-${Date.now()}-${_tmpCounter++}${ext}`)
}

function readFileSyncBuffer(path: string): Uint8Array {
  const fs = requireDesktopModule<typeof import('fs')>('fs')
  return new Uint8Array(fs.readFileSync(path))
}

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
