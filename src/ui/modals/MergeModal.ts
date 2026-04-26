import { FuzzySuggestModal, type App, type TFile } from 'obsidian'

/**
 * A fuzzy-search modal that lets the user pick a target file to merge into.
 */
export class MergeModal extends FuzzySuggestModal<TFile> {
  private files: TFile[]
  private onChoose: (target: TFile) => void

  constructor(app: App, sourceFile: TFile, files: TFile[], onChoose: (target: TFile) => void) {
    super(app)
    // Exclude the source file from the list of merge targets
    this.files = files.filter((f) => f.path !== sourceFile.path)
    this.onChoose = onChoose
    this.setPlaceholder(`Merge "${sourceFile.basename}" into…`)
    this.setInstructions([
      { command: '↑↓', purpose: 'navigate' },
      { command: '↵', purpose: 'merge' },
      { command: 'esc', purpose: 'cancel' },
    ])
  }

  getItems(): TFile[] {
    return this.files
  }

  getItemText(file: TFile): string {
    return file.path
  }

  onChooseItem(file: TFile): void {
    this.onChoose(file)
  }
}
