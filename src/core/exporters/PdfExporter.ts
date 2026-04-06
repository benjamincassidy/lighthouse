/**
 * PdfExporter — converts a CompiledDocument to PDF via the Typst pipeline.
 *
 * Typst compiles a .typ entry point that uses the cmarker package to render
 * the Markdown content directly. This gives publication-quality typesetting
 * without requiring pandoc.
 *
 * An optional .typ template controls the visual style. The template must
 * render the document body via:
 *   #cmarker.render(read(sys.inputs.content))
 *
 * When no template is provided, a minimal built-in shim is used.
 */

import type { CompiledDocument } from '../ProjectCompiler'
import type { TypestRunner } from '../tools/TypestRunner'

export interface PdfExportOptions {
  /**
   * Vault-relative or absolute path where the PDF should be written.
   * The caller is responsible for resolving to an absolute path before
   * passing it here.
   */
  outputPath: string
  /** Path to a .typ Typst template for visual styling */
  template?: string
  /** Directory to use as Typst's package cache (TYPST_PACKAGE_CACHE_PATH) */
  packageCacheDir?: string
  /** Typst paper size identifier, e.g. "us-letter", "a4", "us-trade" */
  paperSize?: string
}

export class PdfExporter {
  constructor(private typst: TypestRunner) {}

  async export(doc: CompiledDocument, options: PdfExportOptions): Promise<void> {
    await this.typst.toPdf(doc.fullText, {
      outputPath: options.outputPath,
      template: options.template,
      packageCacheDir: options.packageCacheDir,
      paperSize: options.paperSize,
    })
  }
}
