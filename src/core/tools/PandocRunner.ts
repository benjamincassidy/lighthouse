/**
 * PandocRunner — executes the local pandoc binary to convert Markdown to
 * DOCX and ePub3. PDF is handled separately by TypstRunner.
 *
 * Pandoc reads markdown from stdin; binary outputs (DOCX, ePub) are written
 * to a temp file then read back and returned as a Buffer.
 */

/* eslint-disable import/no-nodejs-modules, no-undef -- Desktop-only code: requires Node.js modules for process execution */

import { Buffer } from 'buffer'
import { spawn } from 'child_process'
import { existsSync, mkdirSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

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
  async toDocx(markdown: string, opts: PandocDocxOptions = {}): Promise<Buffer> {
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
  async toEpub(markdown: string, opts: PandocEpubOptions = {}): Promise<Buffer> {
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

  private run(args: string[], stdinContent: string, env?: NodeJS.ProcessEnv): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.pandocPath, args, {
        env: env ?? process.env,
      })

      const stdoutChunks: Buffer[] = []
      const stderrChunks: Buffer[] = []

      child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk))
      child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk))

      child.once('close', (code) => {
        const stderrStr = Buffer.concat(stderrChunks).toString('utf8')
        if (stderrStr) console.debug('[Lighthouse] pandoc stderr:', stderrStr)

        if (code !== 0) {
          reject(new Error(`Pandoc conversion failed (exit ${code}): ${stderrStr}`))
        } else {
          resolve(Buffer.concat(stdoutChunks).toString('utf8'))
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
  const dir = tmpdir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, `${prefix}-${Date.now()}-${_tmpCounter++}${ext}`)
}

function readFileSyncBuffer(path: string): Buffer {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs') as typeof import('fs')
  return fs.readFileSync(path)
}

function tryUnlink(path: string): void {
  try {
    unlinkSync(path)
  } catch {
    // Best-effort cleanup
  }
}
