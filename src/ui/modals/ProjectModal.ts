import { FuzzySuggestModal, Modal, Notice, Setting } from 'obsidian'
import { TFolder, type App } from 'obsidian'

import { CslStyleManager, BUNDLED_CSL_STYLES } from '@/core/CslStyleManager'
import { DEFAULT_EXTRAS_FOLDER_NAME } from '@/core/FolderManager'
import type LighthousePlugin from '@/main'
import type { GoalDirection, Project } from '@/types/types'
import { CslStyleDownloadModal } from '@/ui/modals/CslStyleDownloadModal'
import { getElectronDialog } from '@/utils/electron'

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
 * Project creation/editing modal
 */
export interface ProjectModalInitialValues {
  name?: string
  rootPath?: string
  wordCountGoal?: number
}

export class ProjectModal extends Modal {
  private mode: ModalMode
  private project?: Project
  private plugin: LighthousePlugin

  // Form state
  private name = ''
  private rootPath = ''
  private bibliographyPath = ''
  private citationStyle = ''
  private wordCountGoal?: number
  private goalDirection: GoalDirection = 'at-least'
  private deadline = ''
  private dailyGoal?: number
  private folderGoals: Record<string, number> = {}
  private setAsActive = true
  private groupGoalsContainer: HTMLElement | null = null

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
      .setDesc('A short, descriptive name for this project.')
      .addText((text) => {
        text.setValue(this.name).onChange((value) => {
          this.name = value
        })
        text.inputEl.focus()
      })

    // Root folder
    new Setting(contentEl)
      .setName('Root folder')
      .setDesc('The main folder containing this project’s files.')
      .addButton((button) => {
        button.setButtonText(this.rootPath || 'Select folder').onClick(() => {
          const modal = new FolderSuggestModal(this.app, (folder) => {
            this.rootPath = folder.path
            button.setButtonText(this.rootPath)
            this.renderGroupGoals()
          })
          modal.open()
        })
      })

    new Setting(contentEl).setName('Citations').setHeading()

    // Bibliography path
    let bibliographyTextInput: { setValue: (value: string) => void } | null = null
    new Setting(contentEl)
      .setName('Bibliography file')
      .setDesc('Optional citation database used when exporting with citations.')
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
          .setButtonText('Browse')
          .setTooltip('Choose bibliography file')
          .onClick(() => {
            const dialog = getElectronDialog(this.app)
            if (!dialog) {
              new Notice('File picker not available')
              return
            }

            const result = dialog.showOpenDialogSync({
              title: 'Select bibliography file',
              properties: ['openFile'],
              filters: [
                { name: 'Bibliography files', extensions: ['bib', 'yml', 'yaml', 'json'] },
                { name: 'All files', extensions: ['*'] },
              ],
            })
            if (result && result.length > 0) {
              this.bibliographyPath = result[0]
              bibliographyTextInput?.setValue(result[0])
            }
          })
      })

    // Citation style (CSL)
    const cslManager = new CslStyleManager(this.plugin)
    const allStyles = cslManager.getAllStyles()

    const citationStyleSetting = new Setting(contentEl)
      .setName('Citation style')
      .setDesc('Format for citations and bibliography.')

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
          const dialog = getElectronDialog(this.app)
          if (!dialog) {
            new Notice('File picker not available')
            this.citationStyle = ''
            dropdown.setValue('')
            return
          }

          const result = dialog.showOpenDialogSync({
            title: 'Select citation style file',
            properties: ['openFile'],
            filters: [
              { name: 'Citation style language', extensions: ['csl'] },
              { name: 'All files', extensions: ['*'] },
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

    new Setting(contentEl).setName('Goals').setHeading()

    // Word count goal
    new Setting(contentEl)
      .setName('Word count goal')
      .setDesc('Optional target word count for this project.')
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
      .setDesc('Choose whether the goal is a minimum ("at least") or a maximum ("at most", turns red when exceeded).')
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
      .setDesc('Target finish date — used to calculate your required daily word count.')
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
      .setDesc('Words you aim to write each day — sets the scale for the writing heatmap.')
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

    // Group goals
    new Setting(contentEl)
      .setName('Group goals')
      .setDesc('Optional word count targets for individual groups (top-level folders).')
      .setHeading()
    this.groupGoalsContainer = contentEl.createDiv({ cls: 'lighthouse-group-goals' })
    this.renderGroupGoals()

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

  /** Top-level groups (subfolders) of the root folder, excluding Extras. */
  private getTopLevelFolders(): TFolder[] {
    if (!this.rootPath) return []
    const root = this.app.vault.getAbstractFileByPath(this.rootPath)
    if (!(root instanceof TFolder)) return []

    return root.children.filter(
      (child): child is TFolder => child instanceof TFolder && child.name !== DEFAULT_EXTRAS_FOLDER_NAME,
    )
  }

  private renderGroupGoals(): void {
    if (!this.groupGoalsContainer) return
    this.groupGoalsContainer.empty()

    const groupFolders = this.getTopLevelFolders()

    if (groupFolders.length === 0) {
      this.groupGoalsContainer.createEl('p', {
        text: 'No groups found under the root folder yet.',
        cls: 'setting-item-description',
      })
      return
    }

    for (const folder of groupFolders) {
      new Setting(this.groupGoalsContainer).setName(folder.name).addText((text) => {
        text
          .setPlaceholder('Words (optional)')
          .setValue(this.folderGoals[folder.path]?.toString() ?? '')
          .onChange((value) => {
            const parsed = parseInt(value, 10)
            if (isNaN(parsed) || value.trim() === '') {
              delete this.folderGoals[folder.path]
            } else {
              this.folderGoals[folder.path] = parsed
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

    // Update the project with additional fields (extrasFolder is auto-provisioned
    // by the Library the first time this project is viewed, not set here)
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
