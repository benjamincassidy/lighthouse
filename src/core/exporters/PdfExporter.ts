/**
 * PdfExporter — generates a PDF from a CompiledDocument using Obsidian's
 * built-in Electron renderer.
 *
 * Strategy:
 *   1. Write the compiled content as a temporary .md file to the vault.
 *   2. Open it in a new leaf (so Obsidian renders it to HTML).
 *   3. Inject the export style CSS into document.head (the @media print rules
 *      are already scoped so they won't affect screen rendering).
 *   4. Attempt silent PDF generation via Electron's printToPDF.
 *      If that API is unavailable (future Obsidian/Electron change), fall back
 *      to Obsidian's built-in export command which opens a save dialog.
 *   5. Clean up the injected style tag and the temp file.
 */

import type { App, TFile } from 'obsidian'

import type { CompiledDocument } from '../ProjectCompiler'

export interface PdfExportOptions {
  /** The @media print CSS to inject for this export */
  css: string
  /** Vault-relative path where the PDF should be saved (used for printToPDF path) */
  outputPath?: string
}

export type PdfExportResult =
  | { method: 'silent'; outputPath: string }
  | { method: 'dialog' }

export class PdfExporter {
  constructor(private app: App) {}

  async export(doc: CompiledDocument, options: PdfExportOptions): Promise<PdfExportResult> {
    // 1. Write temp file
    const tempPath = `_lighthouse_export_tmp_${Date.now()}.md`
    const tempFile = await this.app.vault.create(tempPath, doc.fullText)

    // 2. Open in a leaf
    const leaf = this.app.workspace.getLeaf('tab')
    await leaf.openFile(tempFile)

    // Give the renderer a moment to process the markdown
    await sleep(300)

    // 3. Inject CSS
    const styleEl = document.createElement('style')
    styleEl.id = 'lh-export-style'
    styleEl.textContent = options.css
    document.head.appendChild(styleEl)

    let result: PdfExportResult

    try {
      result = await this.attemptElectronPrint(options.outputPath)
    } catch {
      // Fall back to Obsidian's built-in export (shows system dialog)
      ;(this.app as App & { commands: { executeCommandById(id: string): void } }).commands.executeCommandById('editor:export-to-pdf')
      result = { method: 'dialog' }
    }

    // 4. Clean up style
    styleEl.remove()

    // 5. Clean up temp file (slight delay so the dialog can read it)
    setTimeout(async () => {
      try {
        const f = this.app.vault.getAbstractFileByPath(tempPath) as TFile | null
        if (f) await this.app.vault.delete(f)
      } catch {
        // Best-effort cleanup
      }
    }, 5000)

    // Close the temp leaf
    leaf.detach()

    return result
  }

  private async attemptElectronPrint(outputPath?: string): Promise<PdfExportResult> {
    // Access Electron's printToPDF via the remote module.
    // This works in Obsidian's Electron renderer process.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const electron = require('electron') as {
      remote?: { getCurrentWebContents?: () => ElectronWebContents }
    }

    const webContents = electron.remote?.getCurrentWebContents?.()
    if (!webContents?.printToPDF) throw new Error('printToPDF not available')

    const pdfBuffer: Buffer = await webContents.printToPDF({
      printBackground: true,
      pageSize: 'Letter',
      margins: { marginType: 'none' },
    })

    if (!outputPath) throw new Error('No output path for silent PDF')

    // writeBinary expects ArrayBuffer; convert the Node Buffer
    await this.app.vault.adapter.writeBinary(outputPath, pdfBuffer.buffer as ArrayBuffer)
    return { method: 'silent', outputPath }
  }
}

// Minimal type so we don't need to import Electron types
interface ElectronWebContents {
  printToPDF(options: Record<string, unknown>): Promise<Buffer>
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
