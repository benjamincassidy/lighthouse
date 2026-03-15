import { App, ButtonComponent, Modal, PluginSettingTab, Setting } from 'obsidian'

import type LighthousePlugin from '@/main'
import { DEFAULT_SETTINGS, type LighthouseSettings } from '@/types/settings'
import { ProjectModal } from '@/ui/modals/ProjectModal'

// Re-export for backward compatibility
export type { LighthouseSettings }
export { DEFAULT_SETTINGS }

export class LighthouseSettingTab extends PluginSettingTab {
  plugin: LighthousePlugin

  constructor(app: App, plugin: LighthousePlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    const { containerEl } = this

    containerEl.empty()

    this.addProjectsSection(containerEl)
    this.addFlowModeSection(containerEl)
    this.addWordCountSection(containerEl)
    this.addGeneralSection(containerEl)
  }

  private addProjectsSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setName('Projects').setHeading()

    // Active project switcher
    new Setting(containerEl)
      .setName('Active project')
      .setDesc('The project shown in all views.')
      .addDropdown((dropdown) => {
        const projects = this.plugin.projectManager.getAllProjects()
        const activeProject = this.plugin.projectManager.getActiveProject()

        dropdown.addOption('', 'No project selected')
        for (const p of projects) {
          dropdown.addOption(p.id, p.name)
        }
        dropdown.setValue(activeProject?.id ?? '')

        dropdown.onChange(async (value) => {
          await this.plugin.projectManager.setActiveProject(value || undefined)
          this.display()
        })

        return dropdown
      })

    // Edit / delete active project
    const activeProject = this.plugin.projectManager.getActiveProject()
    if (activeProject) {
      new Setting(containerEl)
        .setName(activeProject.name)
        .setDesc(
          [
            activeProject.rootPath,
            activeProject.wordCountGoal
              ? `Goal: ${activeProject.wordCountGoal.toLocaleString()} words`
              : '',
          ]
            .filter(Boolean)
            .join(' · '),
        )
        .addButton((button) =>
          button.setButtonText('Edit').onClick(() => {
            new ProjectModal(this.plugin, 'edit', activeProject).open()
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
                text: `Are you sure you want to delete "${activeProject.name}"?`,
              })
              modal.contentEl.createEl('p', {
                text: 'Only the project configuration is removed. Your files stay untouched.',
                cls: 'mod-muted',
              })

              const btnRow = modal.contentEl.createEl('div', {
                cls: 'lighthouse-modal-buttons',
              })
              new ButtonComponent(btnRow).setButtonText('Cancel').onClick(() => modal.close())
              new ButtonComponent(btnRow)
                .setButtonText('Delete')
                .setWarning()
                .onClick(async () => {
                  await this.plugin.projectManager.deleteProject(activeProject.id)
                  modal.close()
                  this.display()
                })

              await Promise.resolve()
              modal.open()
            }),
        )
    }

    // Create new project
    new Setting(containerEl)
      .setName('New project')
      .setDesc('Create a new writing project.')
      .addButton((button) =>
        button
          .setButtonText('Create project')
          .setCta()
          .onClick(() => {
            new ProjectModal(this.plugin, 'create').open()
          }),
      )
  }

  private addFlowModeSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setName('Flow mode').setHeading()

    new Setting(containerEl)
      .setName('Hide status bar')
      .setDesc('Hide the status bar when flow mode is active.')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.flowModeHideStatusBar).onChange(async (value) => {
          this.plugin.settings.flowModeHideStatusBar = value
          await this.plugin.saveSettings()
        }),
      )

    new Setting(containerEl)
      .setName('Hide ribbon')
      .setDesc('Hide the left-side icon ribbon when flow mode is active.')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.flowModeHideRibbon).onChange(async (value) => {
          this.plugin.settings.flowModeHideRibbon = value
          await this.plugin.saveSettings()
        }),
      )

    new Setting(containerEl)
      .setName('Typewriter scroll')
      .setDesc('Keep the cursor vertically centered while typing.')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.flowTypewriterScroll).onChange(async (value) => {
          this.plugin.settings.flowTypewriterScroll = value
          await this.plugin.saveSettings()
        }),
      )

    new Setting(containerEl).setName('Focus & typography').setHeading()

    new Setting(containerEl)
      .setName('Focus mode')
      .setDesc('Dim text outside the current paragraph or sentence to reduce distraction.')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('none', 'None')
          .addOption('paragraph', 'Paragraph')
          .addOption('sentence', 'Sentence')
          .setValue(this.plugin.settings.flowFocusMode)
          .onChange(async (value) => {
            this.plugin.settings.flowFocusMode = value as 'none' | 'paragraph' | 'sentence'
            await this.plugin.saveSettings()
          }),
      )

    new Setting(containerEl)
      .setName('Font family')
      .setDesc('Override the editor font while flow mode is active. Leave blank to inherit.')
      .addText((text) =>
        text
          .setPlaceholder('Georgia, serif')
          .setValue(this.plugin.settings.flowFont)
          .onChange(async (value) => {
            this.plugin.settings.flowFont = value.trim()
            await this.plugin.saveSettings()
          }),
      )

    new Setting(containerEl)
      .setName('Line height')
      .setDesc('Override line height while flow mode is active (e.g. 1.8). Set to 0 to inherit.')
      .addText((text) =>
        text
          .setPlaceholder('0')
          .setValue(
            this.plugin.settings.flowLineHeight ? String(this.plugin.settings.flowLineHeight) : '',
          )
          .onChange(async (value) => {
            const num = parseFloat(value)
            this.plugin.settings.flowLineHeight = isNaN(num) || num < 0 ? 0 : num
            await this.plugin.saveSettings()
          }),
      )

    new Setting(containerEl)
      .setName('Max line width')
      .setDesc(
        'Constrain the editor width for comfortable reading, in pixels. Set to 0 to inherit.',
      )
      .addText((text) =>
        text
          .setPlaceholder('0')
          .setValue(
            this.plugin.settings.flowLineWidth ? String(this.plugin.settings.flowLineWidth) : '',
          )
          .onChange(async (value) => {
            const num = parseInt(value, 10)
            this.plugin.settings.flowLineWidth = isNaN(num) || num < 0 ? 0 : num
            await this.plugin.saveSettings()
          }),
      )

    new Setting(containerEl)
      .setName('Hotkey')
      .setDesc('Assign or change the keyboard shortcut for toggling flow mode.')
      .addButton((button) =>
        button.setButtonText('Configure hotkey').onClick(() => {
          const appWithSetting = this.app as unknown as {
            setting: { openTabById: (id: string) => void }
          }
          appWithSetting.setting.openTabById('hotkeys')
        }),
      )
  }

  private addWordCountSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setName('Word counting').setHeading()

    new Setting(containerEl)
      .setName('Show word count in status bar')
      .setDesc('Display the active file word count in the status bar.')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showWordCountInStatusBar).onChange(async (value) => {
          this.plugin.settings.showWordCountInStatusBar = value
          await this.plugin.saveSettings()
        }),
      )

    new Setting(containerEl)
      .setName('Exclude code blocks')
      .setDesc('Do not count words inside fenced code blocks.')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.excludeCodeBlocks).onChange(async (value) => {
          this.plugin.settings.excludeCodeBlocks = value
          await this.plugin.saveSettings()
        }),
      )

    new Setting(containerEl)
      .setName('Exclude frontmatter')
      .setDesc('Do not count words in YAML frontmatter.')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.excludeFrontmatter).onChange(async (value) => {
          this.plugin.settings.excludeFrontmatter = value
          await this.plugin.saveSettings()
        }),
      )
  }

  private addGeneralSection(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName('Debug mode')
      .setDesc('Write verbose logs to the developer console.')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.debugMode).onChange(async (value) => {
          this.plugin.settings.debugMode = value
          await this.plugin.saveSettings()
        }),
      )

    new Setting(containerEl).setName('About').setHeading()

    new Setting(containerEl)
      .setName('Lighthouse')
      .setDesc(`Version ${this.plugin.manifest.version} · Project-based writing for Obsidian`)

    new Setting(containerEl)
      .setName('Documentation')
      .setDesc('Guides, reference, and getting started.')
      .addButton((button) =>
        button.setButtonText('Open docs').onClick(() => {
          globalThis.open('https://benjamincassidy.github.io/lighthouse/', '_blank')
        }),
      )

    new Setting(containerEl)
      .setName('Report an issue')
      .setDesc('Found a bug? Open a GitHub issue.')
      .addButton((button) =>
        button.setButtonText('Open GitHub').onClick(() => {
          globalThis.open('https://github.com/benjamincassidy/lighthouse/issues', '_blank')
        }),
      )
  }
}
