import { App, ButtonComponent, Modal, PluginSettingTab, Setting } from 'obsidian'

import type LighthousePlugin from '@/main'
import { ProjectModal } from '@/ui/modals/ProjectModal'

export interface LighthouseSettings {
  // Zen Mode Settings
  zenModeHideStatusBar: boolean
  zenModeHideRibbon: boolean

  // Word Count Settings
  showWordCountInStatusBar: boolean
  excludeCodeBlocks: boolean
  excludeFrontmatter: boolean

  // Writing Stats Tracking
  todayWordCountBaseline: number
  todayWordCountDate: string

  // General Settings
  debugMode: boolean
}

export const DEFAULT_SETTINGS: LighthouseSettings = {
  // Zen Mode
  zenModeHideStatusBar: true,
  zenModeHideRibbon: true,

  // Word Count
  showWordCountInStatusBar: true,
  excludeCodeBlocks: true,
  excludeFrontmatter: true,

  // Writing Stats Tracking
  todayWordCountBaseline: 0,
  todayWordCountDate: '', // Empty string ensures first load triggers baseline initialization

  // General
  debugMode: false,
}

export class LighthouseSettingTab extends PluginSettingTab {
  plugin: LighthousePlugin

  constructor(app: App, plugin: LighthousePlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    const { containerEl } = this

    containerEl.empty()

    // Projects Section
    this.addProjectsSection(containerEl)

    // Zen Mode Section
    this.addZenModeSection(containerEl)

    // Word Count Section
    this.addWordCountSection(containerEl)

    // General Section
    this.addGeneralSection(containerEl)
  }

  private addProjectsSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setName('Projects').setHeading()

    new Setting(containerEl)
      .setName('Active project')
      .setDesc('Currently active writing project')
      .addDropdown((dropdown) => {
        const projects = this.plugin.projectManager.getAllProjects()
        const activeProject = this.plugin.projectManager.getActiveProject()

        dropdown.addOption('', 'No project selected')

        projects.forEach((project) => {
          dropdown.addOption(project.id, project.name)
        })

        dropdown.setValue(activeProject?.id || '')

        dropdown.onChange(async (value) => {
          if (value) {
            await this.plugin.projectManager.setActiveProject(value)
          }
        })

        return dropdown
      })

    new Setting(containerEl).setName('Manage projects').addButton((button) =>
      button
        .setButtonText('Open dashboard')
        .setCta()
        .onClick(() => {
          void this.plugin.activateDashboard()
        }),
    )

    new Setting(containerEl).setName('Create new project').addButton((button) =>
      button
        .setButtonText('Create project')
        .setCta()
        .onClick(() => {
          const modal = new ProjectModal(this.plugin, 'create')
          modal.open()
        }),
    )

    const activeProject = this.plugin.projectManager.getActiveProject()
    if (activeProject) {
      new Setting(containerEl)
        .setName('Edit active project')
        .setDesc(`Edit "${activeProject.name}"`)
        .addButton((button) =>
          button.setButtonText('Edit').onClick(() => {
            const modal = new ProjectModal(this.plugin, 'edit', activeProject)
            modal.open()
          }),
        )
        .addButton((button) =>
          button
            .setButtonText('Delete')
            .setWarning()
            .onClick(async () => {
              const modal = new Modal(this.app)
              modal.titleEl.setText('Delete project')
              modal.contentEl.createEl('p', {
                text: `Are you sure you want to delete the project "${activeProject.name}"?`,
              })
              modal.contentEl.createEl('p', {
                text: 'This will only remove the project configuration. Your files will not be deleted.',
                cls: 'mod-muted',
              })

              new ButtonComponent(modal.contentEl)
                .setButtonText('Cancel')
                .onClick(() => modal.close())

              new ButtonComponent(modal.contentEl)
                .setButtonText('Delete')
                .setWarning()
                .onClick(async () => {
                  await this.plugin.projectManager.deleteProject(activeProject.id)
                  modal.close()
                  this.display() // Refresh the settings display
                })

              modal.open()
            }),
        )
    }

    // Divider
    containerEl.createEl('div', { cls: 'setting-item-divider' })
  }

  private addZenModeSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setName('Zen mode').setHeading()

    new Setting(containerEl)
      .setName('Hide status bar')
      .setDesc('Hide the status bar when entering zen mode')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.zenModeHideStatusBar).onChange(async (value) => {
          this.plugin.settings.zenModeHideStatusBar = value
          await this.plugin.saveSettings()
        }),
      )

    new Setting(containerEl)
      .setName('Hide ribbon')
      .setDesc('Hide the ribbon (left sidebar icons) when entering zen mode')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.zenModeHideRibbon).onChange(async (value) => {
          this.plugin.settings.zenModeHideRibbon = value
          await this.plugin.saveSettings()
        }),
      )

    new Setting(containerEl)
      .setName('Keyboard shortcut')
      .setDesc('Default: Cmd/Ctrl + Shift + Z (customize in Obsidian hotkey settings)')

    // Divider
    containerEl.createEl('div', { cls: 'setting-item-divider' })
  }

  private addWordCountSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setName('Word counting').setHeading()

    new Setting(containerEl)
      .setName('Show word count in status bar')
      .setDesc('Display the current file word count in the status bar')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showWordCountInStatusBar).onChange(async (value) => {
          this.plugin.settings.showWordCountInStatusBar = value
          await this.plugin.saveSettings()
        }),
      )

    new Setting(containerEl)
      .setName('Exclude code blocks')
      .setDesc('Do not count words inside code blocks when calculating word counts')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.excludeCodeBlocks).onChange(async (value) => {
          this.plugin.settings.excludeCodeBlocks = value
          await this.plugin.saveSettings()
        }),
      )

    new Setting(containerEl)
      .setName('Exclude frontmatter')
      .setDesc('Do not count words in YAML frontmatter when calculating word counts')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.excludeFrontmatter).onChange(async (value) => {
          this.plugin.settings.excludeFrontmatter = value
          await this.plugin.saveSettings()
        }),
      )

    // Divider
    containerEl.createEl('div', { cls: 'setting-item-divider' })
  }

  private addGeneralSection(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName('Debug mode')
      .setDesc('Enable verbose logging to the console for troubleshooting')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.debugMode).onChange(async (value) => {
          this.plugin.settings.debugMode = value
          await this.plugin.saveSettings()
        }),
      )

    // Plugin info
    containerEl.createEl('div', { cls: 'setting-item-divider' })
    new Setting(containerEl).setName('About').setHeading()

    const aboutDiv = containerEl.createEl('div', { cls: 'setting-item-description' })
    aboutDiv.createEl('p', {
      text: 'Lighthouse: project-based writing for Obsidian',
    })
    aboutDiv.createEl('p', {
      text: 'A project management tool for writers working on novels, theses, and long-form content',
    })

    const linksDiv = containerEl.createEl('div', { cls: 'setting-item-description' })
    linksDiv.createEl('a', {
      text: 'Documentation',
      href: 'https://github.com/benjamincassidy/obsidian-lighthouse',
    })
    linksDiv.createSpan({ text: ' • ' })
    linksDiv.createEl('a', {
      text: 'Report issues',
      href: 'https://github.com/benjamincassidy/obsidian-lighthouse/issues',
    })
  }
}
