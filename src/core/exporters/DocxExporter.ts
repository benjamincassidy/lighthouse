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
}

export class DocxExporter {
  constructor(private pandoc: PandocRunner) {}

  async export(doc: CompiledDocument, options: DocxExportOptions = {}): Promise<Buffer> {
    return this.pandoc.toDocx(doc.fullText, {
      referenceDoc: options.referenceDoc,
    })
  }
}
