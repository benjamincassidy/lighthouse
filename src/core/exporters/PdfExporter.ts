/**
 * PdfExporter — converts a CompiledDocument to PDF via the
 * Pandoc → Typst pipeline.
 *
 * Pandoc converts the markdown to Typst markup, then calls the Typst binary
 * as the PDF engine. This gives publication-quality typesetting: proper
 * widow’s/orphan control, font embedding, exact page geometry, and
 * running headers/footers — none of which Chromium’s printToPDF can provide.
 *
 * An optional .typ template file controls the visual style. The typstBinDir
 * is prepended to PATH so pandoc’s ‘--pdf-engine typst’ invocation resolves
 * without requiring the user to have typst globally installed.
 */

import type { CompiledDocument } from '../ProjectCompiler'
import type { PandocRunner } from '../tools/PandocRunner'

export interface PdfExportOptions {
  /**
   * Vault-relative or absolute path where the PDF should be written.
   * The caller is responsible for resolving to an absolute path before
   * passing it here.
   */
  outputPath: string
  /** Path to a .typ Typst template for visual styling */
  template?: string
  /** Directory containing the typst binary (prepended to PATH) */
  typstBinDir?: string
  /** Typst paper size identifier, e.g. "us-letter", "a4", "us-trade" */
  paperSize?: string
}

export class PdfExporter {
  constructor(private pandoc: PandocRunner) {}

  async export(doc: CompiledDocument, options: PdfExportOptions): Promise<void> {
    await this.pandoc.toPdf(doc.fullText, options.outputPath, {
      template: options.template,
      typstBinDir: options.typstBinDir,
      paperSize: options.paperSize,
    })
  }
}
