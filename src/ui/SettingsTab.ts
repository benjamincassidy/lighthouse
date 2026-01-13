import { App, PluginSettingTab, Setting } from 'obsidian'

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

    // Header
    containerEl.createEl('h2', { text: 'Lighthouse Settings' })

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
    containerEl.createEl('h3', { text: 'Projects' })

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
        .setButtonText('Open Dashboard')
        .setCta()
        .onClick(() => {
          this.plugin.activateDashboard()
        }),
    )

    new Setting(containerEl).setName('Create new project').addButton((button) =>
      button
        .setButtonText('Create Project')
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
              const confirmed = confirm(
                `Are you sure you want to delete the project "${activeProject.name}"?\n\n` +
                  `This will only remove the project configuration. Your files will not be deleted.`,
              )

              if (confirmed) {
                await this.plugin.projectManager.deleteProject(activeProject.id)
                this.display() // Refresh the settings display
              }
            }),
        )
    }

    // Divider
    containerEl.createEl('div', { cls: 'setting-item-divider' })
  }

  private addZenModeSection(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'Zen Mode' })

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
    containerEl.createEl('h3', { text: 'Word Counting' })

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
    containerEl.createEl('h3', { text: 'General' })

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
    containerEl.createEl('h3', { text: 'About' })

    const aboutDiv = containerEl.createEl('div', { cls: 'setting-item-description' })
    aboutDiv.createEl('p', {
      text: '🏮 Lighthouse - Project-based writing for Obsidian',
    })
    aboutDiv.createEl('p', {
      text: 'Inspired by Ulysses and Virginia Woolf',
    })

    const linksDiv = containerEl.createEl('div', { cls: 'setting-item-description' })
    linksDiv.createEl('a', {
      text: 'Documentation',
      href: 'https://github.com/benjamincassidy/obsidian-lighthouse',
    })
    linksDiv.createSpan({ text: ' • ' })
    linksDiv.createEl('a', {
      text: 'Report Issues',
      href: 'https://github.com/benjamincassidy/obsidian-lighthouse/issues',
    })
  }
}
