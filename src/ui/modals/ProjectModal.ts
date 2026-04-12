import { FuzzySuggestModal, Modal, Notice, Setting } from 'obsidian'
import { TFolder, type App } from 'obsidian'

import { CslStyleManager, BUNDLED_CSL_STYLES } from '@/core/CslStyleManager'
import type LighthousePlugin from '@/main'
import type { GoalDirection, Project } from '@/types/types'
import { CslStyleDownloadModal } from '@/ui/modals/CslStyleDownloadModal'

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
        if (child instanceof TFolder) {
          collectFolders(child)
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
      text: 'Add folder',
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
  private bibliographyPath = ''
  private citationStyle = ''
  private wordCountGoal?: number
  private goalDirection: GoalDirection = 'at-least'
  private deadline = ''
  private dailyGoal?: number
  private folderGoals: Record<string, number> = {}
  private setAsActive = true
  private chapterGoalsContainer: HTMLElement | null = null

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
      this.bibliographyPath = project.bibliographyPath ?? ''
      this.citationStyle = project.citationStyle ?? ''
      this.wordCountGoal = project.wordCountGoal
      this.goalDirection = project.goalDirection ?? 'at-least'
      this.deadline = project.deadline ?? ''
      this.dailyGoal = project.dailyGoal
      this.folderGoals = project.folderGoals ? { ...project.folderGoals } : {}
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
      text: this.mode === 'create' ? 'Create new project' : 'Edit project',
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
        button.setButtonText(this.rootPath || 'Select folder').onClick(() => {
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
        this.renderChapterGoals()
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

    // Bibliography path
    let bibliographyTextInput: unknown = null
    new Setting(contentEl)
      .setName('Bibliography file')
      .setDesc('Optional citation database for exports (.bib, .yml, .yaml, .json)')
      .addText((text) => {
        bibliographyTextInput = text
        text
          .setPlaceholder('Path to bibliography file')
          .setValue(this.bibliographyPath)
          .onChange((value) => {
            this.bibliographyPath = value
          })
      })
      .addButton((button) => {
        button
          .setButtonText('Browse...')
          .setTooltip('Choose bibliography file')
          .onClick(() => {
            // @ts-ignore - Electron available in Obsidian
            const electron = require('electron')
            // @ts-ignore
            const dialog = electron.remote?.dialog || require('@electron/remote')?.dialog
            const result = dialog.showOpenDialogSync({
              title: 'Select Bibliography File',
              properties: ['openFile'],
              filters: [
                { name: 'Bibliography Files', extensions: ['bib', 'yml', 'yaml', 'json'] },
                { name: 'All Files', extensions: ['*'] },
              ],
            })
            if (result && result.length > 0) {
              // Store as absolute path - will resolve relative to vault when needed
              this.bibliographyPath = result[0]
              // Update the text input to show the selected path
              if (bibliographyTextInput) {
                bibliographyTextInput.setValue(result[0])
              }
            }
          })
      })

    // Citation style (CSL)
    const cslManager = new CslStyleManager(this.plugin)
    const allStyles = cslManager.getAllStyles()

    const citationStyleSetting = new Setting(contentEl)
      .setName('Citation style')
      .setDesc('Format for citations and bibliography (APA, Chicago, MLA, etc.)')

    citationStyleSetting.addDropdown((dropdown) => {
      dropdown.addOption('', 'None')
      dropdown.addOption('custom', 'Custom file...')

      // Add bundled styles
      for (const style of BUNDLED_CSL_STYLES) {
        dropdown.addOption(style.id, style.name)
      }

      // Add downloaded styles
      const downloadedStyles = allStyles.filter(
        (s) => !BUNDLED_CSL_STYLES.find((bs) => bs.id === s.id),
      )
      if (downloadedStyles.length > 0) {
        for (const style of downloadedStyles) {
          dropdown.addOption(style.id, `${style.name} (downloaded)`)
        }
      }

      dropdown.setValue(this.citationStyle)
      dropdown.onChange((value) => {
        this.citationStyle = value
        if (value === 'custom') {
          // Open file picker for custom CSL file
          // @ts-ignore - Electron available in Obsidian
          const electron = require('electron')
          // @ts-ignore
          const dialog = electron.remote?.dialog || require('@electron/remote')?.dialog
          const result = dialog.showOpenDialogSync({
            title: 'Select Citation Style (CSL)',
            properties: ['openFile'],
            filters: [
              { name: 'Citation Style Language', extensions: ['csl'] },
              { name: 'All Files', extensions: ['*'] },
            ],
          })
          if (result && result.length > 0) {
            this.citationStyle = result[0]
          } else {
            this.citationStyle = ''
            dropdown.setValue('')
          }
        }
      })
    })

    citationStyleSetting.addButton((button) => {
      button
        .setButtonText('Download more...')
        .setTooltip('Search and download citation styles from GitHub')
        .onClick(() => {
          const modal = new CslStyleDownloadModal(this.plugin, cslManager, (styleId) => {
            this.citationStyle = styleId
            // User will need to close and re-open to see new style in dropdown
          })
          modal.open()
        })
    })

    // Word count goal
    new Setting(contentEl)
      .setName('Word count goal')
      .setDesc('Optional target word count for this project')
      .addText((text) => {
        text
          .setPlaceholder('E.g., 50000')
          .setValue(this.wordCountGoal?.toString() || '')
          .onChange((value) => {
            const parsed = parseInt(value, 10)
            this.wordCountGoal = isNaN(parsed) ? undefined : parsed
          })
        text.inputEl.type = 'number'
      })

    // Goal direction
    new Setting(contentEl)
      .setName('Goal direction')
      .setDesc('"at least" tracks a minimum; "at most" sets a word limit (turns red when exceeded)')
      .addDropdown((dropdown) => {
        dropdown
          .addOption('at-least', 'At least (minimum)')
          .addOption('at-most', 'At most (maximum)')
          .setValue(this.goalDirection)
          .onChange((value) => {
            this.goalDirection = value as GoalDirection
          })
      })

    // Deadline
    new Setting(contentEl)
      .setName('Deadline')
      .setDesc('Target finish date — used to calculate your required daily word count')
      .addText((text) => {
        text
          .setPlaceholder('E.g., 2026-12-31')
          .setValue(this.deadline)
          .onChange((value) => {
            this.deadline = value.trim()
          })
        text.inputEl.type = 'date'
      })

    // Daily goal
    new Setting(contentEl)
      .setName('Daily writing goal')
      .setDesc('Words you aim to write each day — sets the scale for the writing heatmap')
      .addText((text) => {
        text
          .setPlaceholder('E.g., 1000')
          .setValue(this.dailyGoal?.toString() || '')
          .onChange((value) => {
            const parsed = parseInt(value, 10)
            this.dailyGoal = isNaN(parsed) ? undefined : parsed
          })
        text.inputEl.type = 'number'
      })

    // Chapter goals
    contentEl.createEl('h3', { text: 'Chapter goals', cls: 'lighthouse-section-heading' })
    contentEl.createEl('p', {
      text: 'Set optional word count targets per content folder.',
      cls: 'setting-item-description',
    })
    this.chapterGoalsContainer = contentEl.createDiv({ cls: 'lighthouse-chapter-goals' })
    this.renderChapterGoals()

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
      text: this.mode === 'create' ? 'Create project' : 'Save changes',
      cls: 'mod-cta',
    })
    saveButton.addEventListener('click', () => {
      void this.save()
    })

    const cancelButton = buttonContainer.createEl('button', {
      text: 'Cancel',
    })
    cancelButton.addEventListener('click', () => {
      this.close()
    })
  }

  private renderChapterGoals(): void {
    if (!this.chapterGoalsContainer) return
    this.chapterGoalsContainer.empty()

    if (this.contentFolders.length === 0) {
      this.chapterGoalsContainer.createEl('p', {
        text: 'Add content folders above to set chapter goals.',
        cls: 'setting-item-description',
      })
      return
    }

    for (const folder of this.contentFolders) {
      const fullPath = this.rootPath
        ? this.plugin.folderManager.resolveProjectPath(this.rootPath, folder)
        : folder
      const displayName = folder || this.rootPath || 'Root'

      new Setting(this.chapterGoalsContainer).setName(displayName).addText((text) => {
        text
          .setPlaceholder('Words (optional)')
          .setValue(this.folderGoals[fullPath]?.toString() ?? '')
          .onChange((value) => {
            const parsed = parseInt(value, 10)
            if (isNaN(parsed) || value.trim() === '') {
              delete this.folderGoals[fullPath]
            } else {
              this.folderGoals[fullPath] = parsed
            }
          })
        text.inputEl.type = 'number'
      })
    }
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
    project.bibliographyPath = this.bibliographyPath || undefined
    project.citationStyle = this.citationStyle || undefined
    project.wordCountGoal = this.wordCountGoal
    project.goalDirection = this.goalDirection
    project.deadline = this.deadline || undefined
    project.dailyGoal = this.dailyGoal
    project.folderGoals =
      Object.keys(this.folderGoals).length > 0 ? { ...this.folderGoals } : undefined
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
      bibliographyPath: this.bibliographyPath || undefined,
      citationStyle: this.citationStyle || undefined,
      wordCountGoal: this.wordCountGoal,
      goalDirection: this.goalDirection,
      deadline: this.deadline || undefined,
      dailyGoal: this.dailyGoal,
      folderGoals: Object.keys(this.folderGoals).length > 0 ? { ...this.folderGoals } : undefined,
      updatedAt: new Date().toISOString(),
    }

    await this.plugin.projectManager.updateProject(updatedProject)
  }

  onClose(): void {
    const { contentEl } = this
    contentEl.empty()
  }
}
