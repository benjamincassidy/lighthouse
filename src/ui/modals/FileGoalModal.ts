import { Modal, Setting } from 'obsidian'

import type LighthousePlugin from '@/main'

/**
 * Small modal for setting (or clearing) a per-file word count goal.
 */
export class FileGoalModal extends Modal {
  private goal: number | undefined
  private readonly onSave: (goal: number | undefined) => void

  constructor(
    plugin: LighthousePlugin,
    currentGoal: number | undefined,
    onSave: (goal: number | undefined) => void,
  ) {
    super(plugin.app)
    this.goal = currentGoal
    this.onSave = onSave
  }

  onOpen(): void {
    const { contentEl } = this
    contentEl.createEl('h2', { text: 'File word count goal' })

    new Setting(contentEl)
      .setName('Word count goal')
      .setDesc('Leave blank to remove the goal')
      .addText((text) => {
        text
          .setPlaceholder('E.g., 2000')
          .setValue(this.goal?.toString() ?? '')
          .onChange((value) => {
            const parsed = parseInt(value, 10)
            this.goal = isNaN(parsed) || value.trim() === '' ? undefined : parsed
          })
        text.inputEl.type = 'number'
        text.inputEl.focus()
      })

    const buttonContainer = contentEl.createDiv({ cls: 'lighthouse-modal-buttons' })

    const saveButton = buttonContainer.createEl('button', { text: 'Save', cls: 'mod-cta' })
    saveButton.addEventListener('click', () => {
      this.onSave(this.goal)
      this.close()
    })

    const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' })
    cancelButton.addEventListener('click', () => this.close())
  }

  onClose(): void {
    this.contentEl.empty()
  }
}
