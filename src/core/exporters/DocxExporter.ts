/**
 * DocxExporter — converts a CompiledDocument to .docx via Pandoc.
 *
 * Pandoc produces native Word documents with full support for tables,
 * footnotes, ordered/unordered lists, blockquotes, and inline formatting.
 * An optional reference .docx controls fonts, paragraph styles, and margins.
 */

import type { CompiledDocument } from '../ProjectCompiler'
import type { PandocRunner } from '../tools/PandocRunner'

export interface DocxExportOptions {
  /**
   * Path to a .docx reference document.
   * Controls Word paragraph styles, fonts, and page geometry.
   */
  referenceDoc?: string
  /** Absolute path to a bibliography file (.bib, .yml, .yaml, .json) */
  bibliography?: string
  /** Absolute path to a CSL file for formatting citations */
  citationStyle?: string
  /** Include a table of contents at the start of the document */
  tableOfContents?: boolean
}

export class DocxExporter {
  constructor(private pandoc: PandocRunner) {}

  async export(doc: CompiledDocument, options: DocxExportOptions = {}): Promise<Buffer> {
    return this.pandoc.toDocx(doc.fullText, {
      referenceDoc: options.referenceDoc,
      bibliography: options.bibliography,
      citationStyle: options.citationStyle,
      tableOfContents: options.tableOfContents,
    })
  }
}
