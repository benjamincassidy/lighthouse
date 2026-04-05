import { Notice, Plugin } from 'obsidian'

import { FlowMode } from '@/core/FlowMode'
import { FolderManager } from '@/core/FolderManager'
import { HierarchicalCounter } from '@/core/HierarchicalCounter'
import { ProjectManager } from '@/core/ProjectManager'
import { BinaryManager } from '@/core/tools/BinaryManager'
import { WordCounter } from '@/core/WordCounter'
import { WorkspaceManager } from '@/core/WorkspaceManager'
import { WritingSessionTracker } from '@/core/WritingSessionTracker'
import type { LighthouseSettings } from '@/types/settings'
import { ExportModal } from '@/ui/modals/ExportModal'
import { ProjectModal } from '@/ui/modals/ProjectModal'
import { ProjectSwitcherModal } from '@/ui/modals/ProjectSwitcher'
import { LighthouseSettingTab } from '@/ui/SettingsTab'
import { DASHBOARD_VIEW_TYPE, DashboardView } from '@/ui/views/DashboardView'
import { PROJECT_EXPLORER_VIEW_TYPE, ProjectExplorerView } from '@/ui/views/ProjectExplorerView'
import { STATS_PANEL_VIEW_TYPE, StatsPanelView } from '@/ui/views/StatsPanelView'

export default class LighthousePlugin extends Plugin {
  settings!: LighthouseSettings
  projectManager!: ProjectManager
  folderManager!: FolderManager
  wordCounter!: WordCounter
  hierarchicalCounter!: HierarchicalCounter
  flowMode!: FlowMode
  workspaceManager!: WorkspaceManager
  sessionTracker!: WritingSessionTracker
  binaryManager!: BinaryManager

  async onload() {
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
    this.flowMode = new FlowMode(this.app, () => this.settings)
    this.workspaceManager = new WorkspaceManager(this)
    this.sessionTracker = new WritingSessionTracker(this)
    this.binaryManager = new BinaryManager(this)
    await this.projectManager.initialize()
    // Settings are owned by ProjectStorage — sync the plugin reference
    this.settings = this.projectManager.getSettings()

    // Register views AFTER stores are initialized
    // This prevents race condition when Obsidian restores saved workspace layouts
    this.registerView(DASHBOARD_VIEW_TYPE, (leaf) => new DashboardView(leaf, this))
    this.registerView(PROJECT_EXPLORER_VIEW_TYPE, (leaf) => new ProjectExplorerView(leaf, this))
    this.registerView(STATS_PANEL_VIEW_TYPE, (leaf) => new StatsPanelView(leaf, this))

    // Restore workspace layout from last session
    await this.workspaceManager.restoreState()

    // Single ribbon icon — toggles the Writing Workspace on/off
    this.addRibbonIcon('compass', 'Toggle writing workspace', () => {
      void this.workspaceManager.toggleWritingWorkspace()
    })

    // Add command to open dashboard
    this.addCommand({
      id: 'open-dashboard',
      name: 'Open project dashboard',
      callback: () => {
        void this.activateDashboard()
      },
    })

    // Add command to open project explorer
    this.addCommand({
      id: 'open-project-explorer',
      name: 'Open project explorer',
      callback: () => {
        void this.activateProjectExplorer()
      },
    })

    // Add command to open stats panel
    this.addCommand({
      id: 'open-stats-panel',
      name: 'Open writing stats',
      callback: () => {
        void this.activateStatsPanel()
      },
    })

    // Add command to toggle flow mode
    this.addCommand({
      id: 'toggle-flow-mode',
      name: 'Toggle flow mode',
      callback: () => {
        this.flowMode.toggleFlowMode()
      },
    })

    // Add command to create new project
    this.addCommand({
      id: 'create-project',
      name: 'Create new project',
      callback: () => {
        const modal = new ProjectModal(this, 'create')
        modal.open()
      },
    })

    // Add command to switch project
    this.addCommand({
      id: 'switch-project',
      name: 'Switch project',
      callback: () => {
        const modal = new ProjectSwitcherModal(this)
        modal.open()
      },
    })

    // Add command to export the active project
    this.addCommand({
      id: 'export-project',
      name: 'Export project',
      callback: () => {
        const project = this.projectManager.getActiveProject()
        if (!project) {
          new Notice('No active project — open or create a project first.')
          return
        }
        new ExportModal(this, project).open()
      },
    })

    // Add workspace commands
    this.addCommand({
      id: 'open-writing-workspace',
      name: 'Open writing workspace',
      callback: () => {
        void this.workspaceManager.enterWritingWorkspace()
      },
    })

    this.addCommand({
      id: 'exit-writing-workspace',
      name: 'Exit writing workspace',
      callback: () => {
        void this.workspaceManager.exitWritingWorkspace()
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
            .setTitle('Create lighthouse project')
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
  }

  async saveSettings() {
    await this.projectManager.saveSettings()
  }

  onunload() {
    // Exit flow mode if active
    if (this.flowMode.isFlowModeActive()) {
      this.flowMode.exitFlowMode()
    }
    // Clear workspace body attribute on unload
    if (this.workspaceManager?.isWritingWorkspaceActive()) {
      document.body.removeAttribute('data-lighthouse-workspace')
    }
  }

  activateDashboard(): void {
    const { workspace } = this.app

    let leaf = workspace.getLeavesOfType(DASHBOARD_VIEW_TYPE)[0]

    if (!leaf) {
      // Create new leaf as main view
      leaf = workspace.getLeaf('tab')
      void leaf.setViewState({
        type: DASHBOARD_VIEW_TYPE,
        active: true,
      })
    }

    void workspace.revealLeaf(leaf)
  }

  activateProjectExplorer(): void {
    const { workspace } = this.app

    let leaf = workspace.getLeavesOfType(PROJECT_EXPLORER_VIEW_TYPE)[0]

    if (!leaf) {
      // Create new leaf in left sidebar
      const leftLeaf = workspace.getLeftLeaf(false)
      if (!leftLeaf) {
        return
      }
      leaf = leftLeaf
      void leaf.setViewState({
        type: PROJECT_EXPLORER_VIEW_TYPE,
        active: true,
      })
    }

    void workspace.revealLeaf(leaf)
  }

  activateStatsPanel(): void {
    const { workspace } = this.app

    let leaf = workspace.getLeavesOfType(STATS_PANEL_VIEW_TYPE)[0]

    if (!leaf) {
      // Create new leaf in right sidebar
      const rightLeaf = workspace.getRightLeaf(false)
      if (!rightLeaf) {
        return
      }
      leaf = rightLeaf
      void leaf.setViewState({
        type: STATS_PANEL_VIEW_TYPE,
        active: true,
      })
    }

    void workspace.revealLeaf(leaf)
  }

  toggleProjectExplorer(): void {
    const { workspace } = this.app
    const leaf = workspace.getLeavesOfType(PROJECT_EXPLORER_VIEW_TYPE)[0]

    if (leaf) {
      leaf.detach()
    } else {
      this.activateProjectExplorer()
    }
  }

  toggleStatsPanel(): void {
    const { workspace } = this.app
    const leaf = workspace.getLeavesOfType(STATS_PANEL_VIEW_TYPE)[0]

    if (leaf) {
      leaf.detach()
    } else {
      this.activateStatsPanel()
    }
  }

  isProjectExplorerOpen(): boolean {
    return this.app.workspace.getLeavesOfType(PROJECT_EXPLORER_VIEW_TYPE).length > 0
  }

  isStatsPanelOpen(): boolean {
    return this.app.workspace.getLeavesOfType(STATS_PANEL_VIEW_TYPE).length > 0
  }
}
