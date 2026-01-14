import { Plugin } from 'obsidian'

import { FolderManager } from '@/core/FolderManager'
import { HierarchicalCounter } from '@/core/HierarchicalCounter'
import { ProjectManager } from '@/core/ProjectManager'
import { WordCounter } from '@/core/WordCounter'
import { ZenMode } from '@/core/ZenMode'
import { ProjectModal } from '@/ui/modals/ProjectModal'
import { DEFAULT_SETTINGS, LighthouseSettingTab, type LighthouseSettings } from '@/ui/SettingsTab'
import { DASHBOARD_VIEW_TYPE, DashboardView } from '@/ui/views/DashboardView'
import { PROJECT_EXPLORER_VIEW_TYPE, ProjectExplorerView } from '@/ui/views/ProjectExplorerView'
import { STATS_PANEL_VIEW_TYPE, StatsPanelView } from '@/ui/views/StatsPanelView'

export default class LighthousePlugin extends Plugin {
  settings!: LighthouseSettings
  projectManager!: ProjectManager
  folderManager!: FolderManager
  wordCounter!: WordCounter
  hierarchicalCounter!: HierarchicalCounter
  zenMode!: ZenMode

  async onload() {
    console.debug('Loading Lighthouse plugin')

    // Load settings
    await this.loadSettings()

    // Initialize core services
    this.folderManager = new FolderManager(this.app.vault)
    this.wordCounter = new WordCounter()
    this.hierarchicalCounter = new HierarchicalCounter(
      this.app.vault,
      this.wordCounter,
      this.folderManager,
      this.app,
    )
    this.projectManager = new ProjectManager(this)
    this.zenMode = new ZenMode(this.app)
    await this.projectManager.initialize()

    // Register views AFTER stores are initialized
    // This prevents race condition when Obsidian restores saved workspace layouts
    this.registerView(DASHBOARD_VIEW_TYPE, (leaf) => new DashboardView(leaf, this))
    this.registerView(PROJECT_EXPLORER_VIEW_TYPE, (leaf) => new ProjectExplorerView(leaf, this))
    this.registerView(STATS_PANEL_VIEW_TYPE, (leaf) => new StatsPanelView(leaf, this))

    // Add ribbon icon to open dashboard
    this.addRibbonIcon('layout-dashboard', 'Project Dashboard', () => {
      void this.activateDashboard()
    })

    // Add ribbon icon to open project explorer
    this.addRibbonIcon('folder-tree', 'Project Explorer', () => {
      void this.activateProjectExplorer()
    })

    // Add ribbon icon to open stats panel
    this.addRibbonIcon('bar-chart-2', 'Writing Stats', () => {
      void this.activateStatsPanel()
    })

    // Add command to open dashboard
    this.addCommand({
      id: 'lighthouse-open-dashboard',
      name: 'Open Project Dashboard',
      callback: () => {
        void this.activateDashboard()
      },
    })

    // Add command to open project explorer
    this.addCommand({
      id: 'lighthouse-open-project-explorer',
      name: 'Open Project Explorer',
      callback: () => {
        void this.activateProjectExplorer()
      },
    })

    // Add command to open stats panel
    this.addCommand({
      id: 'lighthouse-open-stats-panel',
      name: 'Open Writing Stats',
      callback: () => {
        void this.activateStatsPanel()
      },
    })

    // Add command to toggle zen mode
    this.addCommand({
      id: 'lighthouse-toggle-zen-mode',
      name: 'Toggle Zen Mode',
      callback: () => {
        this.zenMode.toggleZenMode()
      },
    })

    // Add command to create new project
    this.addCommand({
      id: 'lighthouse-create-project',
      name: 'Create New Project',
      callback: () => {
        const modal = new ProjectModal(this, 'create')
        modal.open()
      },
    })

    // Register context menu for folders
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        // Only show for folders
        if (file instanceof this.app.vault.adapter.constructor || !('children' in file)) {
          return
        }

        menu.addItem((item) => {
          item
            .setTitle('Create Lighthouse Project')
            .setIcon('lightbulb')
            .onClick(() => {
              // Extract folder name without path
              const folderName = file.name || file.path.split('/').pop() || 'New Project'

              const modal = new ProjectModal(this, 'create', undefined, {
                name: folderName,
                rootPath: file.path,
              })
              modal.open()
            })
        })
      }),
    )

    // Add settings tab
    this.addSettingTab(new LighthouseSettingTab(this.app, this))

    // Log current state for debugging
    console.debug('Lighthouse: Loaded', this.projectManager.getProjectCount(), 'projects')
    const activeProject = this.projectManager.getActiveProject()
    if (activeProject) {
      console.debug('Lighthouse: Active project:', activeProject.name)
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }

  onunload() {
    // Exit zen mode if active
    if (this.zenMode.isZenModeActive()) {
      this.zenMode.exitZenMode()
    }
    console.debug('Unloading Lighthouse plugin')
  }

  async activateDashboard(): Promise<void> {
    const { workspace } = this.app

    let leaf = workspace.getLeavesOfType(DASHBOARD_VIEW_TYPE)[0]

    if (!leaf) {
      // Create new leaf as main view
      leaf = workspace.getLeaf('tab')
      await leaf.setViewState({
        type: DASHBOARD_VIEW_TYPE,
        active: true,
      })
    }

    workspace.revealLeaf(leaf)
  }

  async activateProjectExplorer(): Promise<void> {
    const { workspace } = this.app

    let leaf = workspace.getLeavesOfType(PROJECT_EXPLORER_VIEW_TYPE)[0]

    if (!leaf) {
      // Create new leaf in left sidebar
      const leftLeaf = workspace.getLeftLeaf(false)
      if (!leftLeaf) {
        return
      }
      leaf = leftLeaf
      await leaf.setViewState({
        type: PROJECT_EXPLORER_VIEW_TYPE,
        active: true,
      })
    }

    workspace.revealLeaf(leaf)
  }

  async activateStatsPanel(): Promise<void> {
    const { workspace } = this.app

    let leaf = workspace.getLeavesOfType(STATS_PANEL_VIEW_TYPE)[0]

    if (!leaf) {
      // Create new leaf in right sidebar
      const rightLeaf = workspace.getRightLeaf(false)
      if (!rightLeaf) {
        return
      }
      leaf = rightLeaf
      await leaf.setViewState({
        type: STATS_PANEL_VIEW_TYPE,
        active: true,
      })
    }

    workspace.revealLeaf(leaf)
  }
}
