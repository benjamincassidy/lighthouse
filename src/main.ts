import { Notice, Plugin } from 'obsidian'

import { FileSplitter } from '@/core/FileSplitter'
import { FirstLineCache } from '@/core/FirstLineCache'
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
import { INSPECTOR_VIEW_TYPE, InspectorView } from '@/ui/views/InspectorView'
import { PROJECT_EXPLORER_VIEW_TYPE, ProjectExplorerView } from '@/ui/views/ProjectExplorerView'

// Retired view types, superseded by INSPECTOR_VIEW_TYPE — kept as string
// literals (not imports) purely so onload can detach any leaves saved under
// these types by users upgrading from an older version.
const RETIRED_DASHBOARD_VIEW_TYPE = 'lighthouse-dashboard'
const RETIRED_STATS_PANEL_VIEW_TYPE = 'lighthouse-stats-panel'

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
  fileSplitter!: FileSplitter
  firstLineCache!: FirstLineCache

  private getActiveDocument(): Document {
    const workspace = this.app.workspace as unknown as {
      activeDocument?: Document
      containerEl?: HTMLElement
    }
    return workspace.activeDocument ?? workspace.containerEl?.ownerDocument ?? activeDocument
  }

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
    this.firstLineCache = new FirstLineCache(this.app.vault)
    await this.projectManager.initialize()
    this.fileSplitter = new FileSplitter(this.app, this.projectManager)
    // Settings are owned by ProjectStorage — sync the plugin reference
    this.settings = this.projectManager.getSettings()

    // Register views AFTER stores are initialized
    // This prevents race condition when Obsidian restores saved workspace layouts
    this.registerView(PROJECT_EXPLORER_VIEW_TYPE, (leaf) => new ProjectExplorerView(leaf, this))
    this.registerView(INSPECTOR_VIEW_TYPE, (leaf) => new InspectorView(leaf, this))

    // One-time migration: Dashboard and the standalone Stats panel were merged
    // into the Inspector. Detach any leaves upgrading users still have saved
    // under the old view types instead of leaving a broken/unrecognized leaf.
    this.app.workspace.getLeavesOfType(RETIRED_DASHBOARD_VIEW_TYPE).forEach((l) => l.detach())
    this.app.workspace.getLeavesOfType(RETIRED_STATS_PANEL_VIEW_TYPE).forEach((l) => l.detach())

    // Restore workspace layout from last session
    await this.workspaceManager.restoreState()

    // Single ribbon icon — toggles the Writing Workspace on/off
    this.addRibbonIcon('compass', 'Toggle writing workspace', () => {
      void this.workspaceManager.toggleWritingWorkspace()
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

    // Split the active note at the cursor position
    this.addCommand({
      id: 'split-note-at-cursor',
      name: 'Split note at cursor',
      editorCallback: (editor, ctx) => {
        if (!ctx.file) {
          new Notice('No active file to split.')
          return
        }
        if (!this.projectManager.getActiveProject()) {
          new Notice('No active project — open or create one first.')
          return
        }
        void this.fileSplitter.splitAtCursor(editor, ctx.file)
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

    // Add workspace commands — the one real front door into Lighthouse
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

    // Narrow, command-palette-only utilities for reopening one pane a user
    // closed mid-session without leaving the workspace
    this.addCommand({
      id: 'toggle-library',
      name: 'Toggle library',
      callback: () => {
        this.toggleProjectExplorer()
      },
    })

    this.addCommand({
      id: 'toggle-inspector',
      name: 'Toggle inspector',
      callback: () => {
        this.toggleInspector()
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
      this.getActiveDocument().body.removeAttribute('data-lighthouse-workspace')
    }
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

    workspace.setActiveLeaf(leaf, { focus: true })
  }

  activateInspector(): void {
    const { workspace } = this.app

    let leaf = workspace.getLeavesOfType(INSPECTOR_VIEW_TYPE)[0]

    if (!leaf) {
      // Create new leaf in right sidebar
      const rightLeaf = workspace.getRightLeaf(false)
      if (!rightLeaf) {
        return
      }
      leaf = rightLeaf
      void leaf.setViewState({
        type: INSPECTOR_VIEW_TYPE,
        active: true,
      })
    }

    workspace.setActiveLeaf(leaf, { focus: true })
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

  toggleInspector(): void {
    const { workspace } = this.app
    const leaf = workspace.getLeavesOfType(INSPECTOR_VIEW_TYPE)[0]

    if (leaf) {
      leaf.detach()
    } else {
      this.activateInspector()
    }
  }

  isProjectExplorerOpen(): boolean {
    return this.app.workspace.getLeavesOfType(PROJECT_EXPLORER_VIEW_TYPE).length > 0
  }

  isInspectorOpen(): boolean {
    return this.app.workspace.getLeavesOfType(INSPECTOR_VIEW_TYPE).length > 0
  }
}
