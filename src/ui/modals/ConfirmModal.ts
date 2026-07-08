import { Modal, ButtonComponent, type App } from 'obsidian'

import { setDestructiveButton } from '@/utils/buttonCompat'

export interface ConfirmModalOptions {
  title: string
  message: string
  /** Extra muted line under the message — e.g. clarifying what will NOT happen. */
  note?: string
  confirmText?: string
  onConfirm: () => void | Promise<void>
}

/**
 * Native-styled Yes/No confirmation, used in place of the browser's
 * confirm()/alert() so destructive actions look consistent with the rest
 * of Obsidian's UI regardless of where they're triggered from.
 */
export class ConfirmModal extends Modal {
  constructor(
    app: App,
    private options: ConfirmModalOptions,
  ) {
    super(app)
  }

  onOpen(): void {
    const { contentEl } = this
    this.titleEl.setText(this.options.title)
    contentEl.createEl('p', { text: this.options.message })
    if (this.options.note) {
      contentEl.createEl('p', { text: this.options.note, cls: 'mod-muted' })
    }

    const buttonContainer = contentEl.createDiv({ cls: 'lighthouse-modal-buttons' })
    new ButtonComponent(buttonContainer).setButtonText('Cancel').onClick(() => this.close())
    setDestructiveButton(
      new ButtonComponent(buttonContainer).setButtonText(this.options.confirmText ?? 'Delete'),
    ).onClick(async () => {
      await this.options.onConfirm()
      this.close()
    })
  }

  onClose(): void {
    this.contentEl.empty()
  }
}
