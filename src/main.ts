import { Plugin } from 'obsidian'

import { FolderManager } from '@/core/FolderManager'
import { HierarchicalCounter } from '@/core/HierarchicalCounter'
import { ProjectManager } from '@/core/ProjectManager'
import { WordCounter } from '@/core/WordCounter'
import { DASHBOARD_VIEW_TYPE, DashboardView } from '@/ui/views/DashboardView'
import { PROJECT_EXPLORER_VIEW_TYPE, ProjectExplorerView } from '@/ui/views/ProjectExplorerView'
import { STATS_PANEL_VIEW_TYPE, StatsPanelView } from '@/ui/views/StatsPanelView'

export default class LighthousePlugin extends Plugin {
  projectManager!: ProjectManager
  folderManager!: FolderManager
  wordCounter!: WordCounter
  hierarchicalCounter!: HierarchicalCounter

  async onload() {
    console.log('Loading Lighthouse plugin')

    // Initialize core services
    this.folderManager = new FolderManager(this.app.vault)
    this.wordCounter = new WordCounter()
    this.hierarchicalCounter = new HierarchicalCounter(
      this.app.vault,
      this.wordCounter,
      this.folderManager,
    )
    this.projectManager = new ProjectManager(this)
    await this.projectManager.initialize()

    // Register views
    this.registerView(DASHBOARD_VIEW_TYPE, (leaf) => new DashboardView(leaf, this))
    this.registerView(PROJECT_EXPLORER_VIEW_TYPE, (leaf) => new ProjectExplorerView(leaf, this))
    this.registerView(STATS_PANEL_VIEW_TYPE, (leaf) => new StatsPanelView(leaf, this))

    // Add ribbon icon to open dashboard
    this.addRibbonIcon('layout-dashboard', 'Project Dashboard', () => {
      this.activateDashboard()
    })

    // Add ribbon icon to open project explorer
    this.addRibbonIcon('folder-tree', 'Project Explorer', () => {
      this.activateProjectExplorer()
    })

    // Add ribbon icon to open stats panel
    this.addRibbonIcon('bar-chart-2', 'Writing Stats', () => {
      this.activateStatsPanel()
    })

    // Add command to open dashboard
    this.addCommand({
      id: 'lighthouse-open-dashboard',
      name: 'Open Project Dashboard',
      callback: () => {
        this.activateDashboard()
      },
    })

    // Add command to open project explorer
    this.addCommand({
      id: 'lighthouse-open-project-explorer',
      name: 'Open Project Explorer',
      callback: () => {
        this.activateProjectExplorer()
      },
    })

    // Add command to open stats panel
    this.addCommand({
      id: 'lighthouse-open-stats-panel',
      name: 'Open Writing Stats',
      callback: () => {
        this.activateStatsPanel()
      },
    })

    // Log current state for debugging
    console.log('Lighthouse: Loaded', this.projectManager.getProjectCount(), 'projects')
    const activeProject = this.projectManager.getActiveProject()
    if (activeProject) {
      console.log('Lighthouse: Active project:', activeProject.name)
    }
  }

  onunload() {
    console.log('Unloading Lighthouse plugin')
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
