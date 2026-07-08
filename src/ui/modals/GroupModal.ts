import { Modal, Setting } from 'obsidian'

import type LighthousePlugin from '@/main'
import { DEFAULT_GROUP_ICON, GROUP_ICONS, renderGroupIconInto } from '@/ui/icons/groupIcons'

import type { TFolder } from 'obsidian'

interface CreateOptions {
  mode: 'create'
  /** Vault-relative path of the folder the new group will be created inside. */
  parentPath: string
}

interface EditOptions {
  mode: 'edit'
  folder: TFolder
  currentIcon: string | undefined
}

/**
 * Edit Group dialog: name a folder and pick a custom icon for it. Used both
 * for creating a new group (nothing is created in the vault until "Done" is
 * clicked) and from the "Edit group…" context-menu action on an existing one.
 */
export class GroupModal extends Modal {
  private name: string
  private selectedIcon: string
  private readonly options: CreateOptions | EditOptions
  private readonly onSave: (folderPath: string, iconId: string | undefined) => void | Promise<void>
  private doneButtonEl: HTMLButtonElement | null = null

  constructor(
    plugin: LighthousePlugin,
    options: CreateOptions | EditOptions,
    onSave: (folderPath: string, iconId: string | undefined) => void | Promise<void>,
  ) {
    super(plugin.app)
    this.options = options
    this.onSave = onSave
    this.name = options.mode === 'edit' ? options.folder.name : ''
    this.selectedIcon = (options.mode === 'edit' && options.currentIcon) || DEFAULT_GROUP_ICON
  }

  onOpen(): void {
    const { contentEl } = this
    contentEl.createEl('h2', { text: this.options.mode === 'create' ? 'New group' : 'Edit group' })

    new Setting(contentEl).setName('Name').addText((text) => {
      text.setValue(this.name).onChange((value) => {
        this.name = value
        this.updateDoneButtonState()
      })
      text.inputEl.focus()
      if (this.options.mode === 'edit') text.inputEl.select()
    })

    contentEl.createDiv({ text: 'Icon', cls: 'lighthouse-section-heading' })

    const iconGrid = contentEl.createDiv({ cls: 'lighthouse-icon-grid' })
    const buttons = new Map<string, HTMLElement>()

    for (const icon of GROUP_ICONS) {
      const btn = iconGrid.createEl('button', {
        cls: 'lighthouse-icon-swatch',
        attr: { 'aria-label': icon.label, title: icon.label, type: 'button' },
      })
      renderGroupIconInto(btn, icon.id, 18)
      btn.toggleClass('is-selected', icon.id === this.selectedIcon)
      btn.addEventListener('click', () => {
        this.selectedIcon = icon.id
        for (const [id, b] of buttons) {
          b.toggleClass('is-selected', id === icon.id)
        }
      })
      buttons.set(icon.id, btn)
    }

    const buttonContainer = contentEl.createDiv({ cls: 'lighthouse-modal-buttons' })

    const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' })
    cancelButton.addEventListener('click', () => this.close())

    this.doneButtonEl = buttonContainer.createEl('button', { text: 'Done', cls: 'mod-cta' })
    this.doneButtonEl.addEventListener('click', () => {
      void this.save()
    })
    this.updateDoneButtonState()
  }

  private updateDoneButtonState(): void {
    if (!this.doneButtonEl) return
    this.doneButtonEl.disabled = this.name.trim().length === 0
  }

  private async save(): Promise<void> {
    const trimmedName = this.name.trim()
    if (!trimmedName) return

    let folderPath: string

    if (this.options.mode === 'create') {
      folderPath = this.options.parentPath
        ? `${this.options.parentPath}/${trimmedName}`
        : trimmedName
      await this.app.vault.createFolder(folderPath)
    } else {
      const { folder } = this.options
      folderPath = folder.path
      if (trimmedName !== folder.name) {
        const parentPath = folder.parent?.path ?? ''
        folderPath = parentPath ? `${parentPath}/${trimmedName}` : trimmedName
        await this.app.fileManager.renameFile(folder, folderPath)
      }
    }

    const iconId = this.selectedIcon === DEFAULT_GROUP_ICON ? undefined : this.selectedIcon
    await this.onSave(folderPath, iconId)
    this.close()
  }

  onClose(): void {
    this.contentEl.empty()
  }
}
