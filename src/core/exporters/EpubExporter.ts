/**
 * EpubExporter — converts a CompiledDocument to .epub3 via Pandoc.
 *
 * Pandoc generates well-formed ePub3 with correct semantic markup, table
 * of contents, and chapter structure derived from headings.
 * An optional CSS file is embedded for reader apps that support it.
 */

import type { CompiledDocument } from '../ProjectCompiler'
import type { PandocRunner } from '../tools/PandocRunner'

export interface EpubExportOptions {
  title?: string
  author?: string
  language?: string
  /** Path to a CSS file to embed in the ePub */
  cssPath?: string
  /** Absolute path to a bibliography file (.bib, .yml, .yaml, .json) */
  bibliography?: string
  /** Absolute path to a CSL file for formatting citations */
  citationStyle?: string
  /** Include a table of contents at the start of the document */
  tableOfContents?: boolean
}

export class EpubExporter {
  constructor(private pandoc: PandocRunner) {}

  async export(doc: CompiledDocument, options: EpubExportOptions = {}): Promise<Buffer> {
    return this.pandoc.toEpub(doc.fullText, {
      title: options.title ?? doc.projectName,
      author: options.author,
      language: options.language ?? 'en',
      cssPath: options.cssPath,
      bibliography: options.bibliography,
      citationStyle: options.citationStyle,
      tableOfContents: options.tableOfContents,
    })
  }
}
