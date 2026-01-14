import { FuzzySuggestModal, Modal, Notice, Setting } from 'obsidian'

import type LighthousePlugin from '@/main'
import type { Project } from '@/types/types'

import type { App, TFolder } from 'obsidian'

/**
 * Modal mode - create new or edit existing project
 */
type ModalMode = 'create' | 'edit'

/**
 * Folder suggestion modal for selecting vault folders
 */
class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
  constructor(
    app: App,
    private onChoose: (folder: TFolder) => void,
  ) {
    super(app)
    this.setPlaceholder('Type to search for a folder...')
  }

  getItems(): TFolder[] {
    // Get all folders in the vault
    const folders: TFolder[] = []
    const rootFolder = this.app.vault.getRoot()

    const collectFolders = (folder: TFolder) => {
      folders.push(folder)
      for (const child of folder.children) {
        if (child instanceof this.app.vault.adapter.constructor) {
          continue
        }
        if ('children' in child) {
          collectFolders(child as TFolder)
        }
      }
    }

    collectFolders(rootFolder)
    return folders
  }

  getItemText(folder: TFolder): string {
    return folder.path || '/'
  }

  onChooseItem(folder: TFolder): void {
    this.onChoose(folder)
  }
}

/**
 * Multi-folder selector using suggestion modal
 */
class MultiFolderSelector {
  private selectedFolders: string[] = []

  constructor(
    private app: App,
    private containerEl: HTMLElement,
    private onChange: (folders: string[]) => void,
    initialFolders: string[] = [],
  ) {
    this.selectedFolders = [...initialFolders]
    this.render()
  }

  private render(): void {
    this.containerEl.empty()

    // Add button
    const addButton = this.containerEl.createEl('button', {
      text: '+ Add Folder',
      cls: 'mod-cta',
    })
    addButton.addEventListener('click', () => {
      this.openFolderSuggest()
    })

    // Selected folders list
    if (this.selectedFolders.length > 0) {
      const list = this.containerEl.createEl('div', {
        cls: 'lighthouse-folder-list',
      })

      for (const folder of this.selectedFolders) {
        const item = list.createEl('div', {
          cls: 'lighthouse-folder-item',
        })

        item.createEl('span', {
          text: folder,
          cls: 'lighthouse-folder-path',
        })

        const removeBtn = item.createEl('button', {
          text: '×',
          cls: 'lighthouse-folder-remove',
        })
        removeBtn.addEventListener('click', () => {
          this.removeFolder(folder)
        })
      }
    }
  }

  private openFolderSuggest(): void {
    const modal = new FolderSuggestModal(this.app, (folder) => {
      this.addFolder(folder.path)
    })
    modal.open()
  }

  private addFolder(path: string): void {
    if (!this.selectedFolders.includes(path)) {
      this.selectedFolders.push(path)
      this.render()
      this.onChange(this.selectedFolders)
    }
  }

  private removeFolder(path: string): void {
    this.selectedFolders = this.selectedFolders.filter((f) => f !== path)
    this.render()
    this.onChange(this.selectedFolders)
  }

  getFolders(): string[] {
    return this.selectedFolders
  }
}

/**
 * Project creation/editing modal
 */
export interface ProjectModalInitialValues {
  name?: string
  rootPath?: string
  contentFolders?: string[]
  sourceFolders?: string[]
  wordCountGoal?: number
}

export class ProjectModal extends Modal {
  private mode: ModalMode
  private project?: Project
  private plugin: LighthousePlugin

  // Form state
  private name = ''
  private rootPath = ''
  private contentFolders: string[] = []
  private sourceFolders: string[] = []
  private wordCountGoal?: number
  private setAsActive = true

  constructor(
    plugin: LighthousePlugin,
    mode: ModalMode,
    project?: Project,
    initialValues?: ProjectModalInitialValues,
  ) {
    super(plugin.app)
    this.plugin = plugin
    this.mode = mode
    this.project = project

    // Initialize form state from project if editing
    if (mode === 'edit' && project) {
      this.name = project.name
      this.rootPath = project.rootPath
      this.contentFolders = [...project.contentFolders]
      this.sourceFolders = [...project.sourceFolders]
      this.wordCountGoal = project.wordCountGoal
    } else if (mode === 'create' && initialValues) {
      // Initialize form state from initial values if creating
      this.name = initialValues.name || ''
      this.rootPath = initialValues.rootPath || ''
      this.contentFolders = initialValues.contentFolders || []
      this.sourceFolders = initialValues.sourceFolders || []
      this.wordCountGoal = initialValues.wordCountGoal
    }
  }

  onOpen(): void {
    const { contentEl } = this

    // Title
    contentEl.createEl('h2', {
      text: this.mode === 'create' ? 'Create New Project' : 'Edit Project',
    })

    // Project name
    new Setting(contentEl)
      .setName('Project name')
      .setDesc('A descriptive name for your writing project')
      .addText((text) => {
        text.setValue(this.name).onChange((value) => {
          this.name = value
        })
        text.inputEl.focus()
      })

    // Root folder
    new Setting(contentEl)
      .setName('Root folder')
      .setDesc('The main folder containing your project files')
      .addButton((button) => {
        button.setButtonText(this.rootPath || 'Select folder...').onClick(() => {
          const modal = new FolderSuggestModal(this.app, (folder) => {
            this.rootPath = folder.path
            button.setButtonText(this.rootPath)
          })
          modal.open()
        })
      })

    // Content folders
    const contentSetting = new Setting(contentEl)
      .setName('Content folders')
      .setDesc('Folders that count toward your word count goal')

    const contentContainer = contentSetting.settingEl.createDiv()
    new MultiFolderSelector(
      this.app,
      contentContainer,
      (folders) => {
        this.contentFolders = folders
      },
      this.contentFolders,
    )

    // Source folders
    const sourceSetting = new Setting(contentEl)
      .setName('Source folders')
      .setDesc('Reference material, research, notes (excluded from word count)')

    const sourceContainer = sourceSetting.settingEl.createDiv()
    new MultiFolderSelector(
      this.app,
      sourceContainer,
      (folders) => {
        this.sourceFolders = folders
      },
      this.sourceFolders,
    )

    // Word count goal
    new Setting(contentEl)
      .setName('Word count goal')
      .setDesc('Optional target word count for this project')
      .addText((text) => {
        text
          .setPlaceholder('e.g., 50000')
          .setValue(this.wordCountGoal?.toString() || '')
          .onChange((value) => {
            const parsed = parseInt(value, 10)
            this.wordCountGoal = isNaN(parsed) ? undefined : parsed
          })
        text.inputEl.type = 'number'
      })

    // Set as active project (only for create mode)
    if (this.mode === 'create') {
      new Setting(contentEl)
        .setName('Set as active project')
        .setDesc('Switch to this project immediately after creation')
        .addToggle((toggle) => {
          toggle.setValue(this.setAsActive).onChange((value) => {
            this.setAsActive = value
          })
        })
    }

    // Buttons
    const buttonContainer = contentEl.createDiv({
      cls: 'lighthouse-modal-buttons',
    })

    const saveButton = buttonContainer.createEl('button', {
      text: this.mode === 'create' ? 'Create Project' : 'Save Changes',
      cls: 'mod-cta',
    })
    saveButton.addEventListener('click', () => {
      this.save()
    })

    const cancelButton = buttonContainer.createEl('button', {
      text: 'Cancel',
    })
    cancelButton.addEventListener('click', () => {
      this.close()
    })
  }

  private async save(): Promise<void> {
    // Validate
    const validation = this.validate()
    if (!validation.valid) {
      // Show error using Obsidian's Notice
      new Notice(validation.error || 'Validation failed', 5000)
      return
    }

    if (this.mode === 'create') {
      await this.createProject()
    } else {
      await this.updateProject()
    }

    this.close()
  }

  private validate(): { valid: boolean; error?: string } {
    if (!this.name.trim()) {
      return { valid: false, error: 'Project name is required' }
    }

    if (!this.rootPath) {
      return { valid: false, error: 'Root folder is required' }
    }

    // Check for duplicate names (skip current project if editing)
    const existingProject = this.plugin.projectManager
      .getAllProjects()
      .find((p) => p.name === this.name && p.id !== this.project?.id)

    if (existingProject) {
      return { valid: false, error: `A project named "${this.name}" already exists` }
    }

    // Validate folders exist and are within root
    // TODO: More validation

    return { valid: true }
  }

  private async createProject(): Promise<void> {
    const project = await this.plugin.projectManager.createProject(this.name, this.rootPath)

    // Update the project with additional fields
    project.contentFolders = this.contentFolders
    project.sourceFolders = this.sourceFolders
    project.wordCountGoal = this.wordCountGoal
    await this.plugin.projectManager.updateProject(project)

    if (this.setAsActive) {
      await this.plugin.projectManager.setActiveProject(project.id)
    }
  }

  private async updateProject(): Promise<void> {
    if (!this.project) return

    const updatedProject: Project = {
      ...this.project,
      name: this.name,
      rootPath: this.rootPath,
      contentFolders: this.contentFolders,
      sourceFolders: this.sourceFolders,
      wordCountGoal: this.wordCountGoal,
      updatedAt: new Date().toISOString(),
    }

    await this.plugin.projectManager.updateProject(updatedProject)
  }

  onClose(): void {
    const { contentEl } = this
    contentEl.empty()
  }
}
