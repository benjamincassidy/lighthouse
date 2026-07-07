import { workspaceActive } from '@/core/stores'
import type LighthousePlugin from '@/main'
import { INSPECTOR_VIEW_TYPE } from '@/ui/views/InspectorView'
import { PROJECT_EXPLORER_VIEW_TYPE } from '@/ui/views/ProjectExplorerView'

const STORAGE_KEY = 'workspaceState'
const NATIVE_FILE_EXPLORER_VIEW_TYPE = 'file-explorer'

export type InspectorTab = 'overview' | 'stats' | 'outline'

interface PersistedWorkspaceState {
  isActive: boolean
  lastInspectorTab?: InspectorTab
  lastGroupByProject?: Record<string, string | undefined>
}

/**
 * Manages the Lighthouse Writing Workspace — a dedicated layout preset that
 * opens the Library in the left sidebar and the Inspector in the right
 * sidebar, detaching Obsidian's native File Explorer for the duration so the
 * left sidebar is exclusively Lighthouse's, making the whole thing feel like
 * a cohesive application rather than a collection of individual panels.
 *
 * State is persisted to `lighthouse.json` via plugin settings so the workspace
 * (and the writer's place within it — active Inspector tab) is automatically
 * restored when Obsidian reloads.
 */
export class WorkspaceManager {
  private plugin: LighthousePlugin
  private _isActive = false
  private nativeExplorerWasOpen = false
  private lastInspectorTab: InspectorTab = 'overview'
  private lastGroupByProject: Record<string, string | undefined> = {}

  constructor(plugin: LighthousePlugin) {
    this.plugin = plugin
  }

  private getActiveDocument(): Document {
    const workspace = this.plugin.app.workspace as unknown as {
      activeDocument?: Document
      containerEl?: HTMLElement
    }
    return workspace.activeDocument ?? workspace.containerEl?.ownerDocument ?? document
  }

  isWritingWorkspaceActive(): boolean {
    return this._isActive
  }

  async toggleWritingWorkspace(): Promise<void> {
    if (this._isActive) {
      await this.exitWritingWorkspace()
    } else {
      await this.enterWritingWorkspace()
    }
  }

  /**
   * Enter the Writing Workspace:
   * - Detaches Obsidian's native File Explorer (restored on exit)
   * - Opens the Library in the left sidebar
   * - Opens the Inspector in the right sidebar
   * - Sets `data-lighthouse-workspace` on the body for CSS targeting
   * - Persists active state
   */
  async enterWritingWorkspace(): Promise<void> {
    this.detachNativeFileExplorer()
    this.plugin.activateProjectExplorer()
    this.plugin.activateInspector()

    this.getActiveDocument().body.setAttribute('data-lighthouse-workspace', 'true')
    this._isActive = true
    workspaceActive.set(true)

    await this.persistState()
  }

  /**
   * Exit the Writing Workspace:
   * - Detaches the Library and Inspector panels
   * - Restores the native File Explorer if it was open before entering
   * - Removes the body attribute
   * - Persists inactive state
   */
  async exitWritingWorkspace(): Promise<void> {
    const { workspace } = this.plugin.app

    workspace.getLeavesOfType(PROJECT_EXPLORER_VIEW_TYPE).forEach((l) => l.detach())
    workspace.getLeavesOfType(INSPECTOR_VIEW_TYPE).forEach((l) => l.detach())
    this.restoreNativeFileExplorer()

    this.getActiveDocument().body.removeAttribute('data-lighthouse-workspace')
    this._isActive = false
    workspaceActive.set(false)

    await this.persistState()
  }

  /**
   * Called during plugin `onload` after views are registered.
   * Re-enters the workspace if it was active before the last reload.
   */
  async restoreState(): Promise<void> {
    const data = (await this.plugin.loadData()) as Record<string, unknown> | null
    const state = data?.[STORAGE_KEY] as PersistedWorkspaceState | undefined

    this.lastInspectorTab = state?.lastInspectorTab ?? 'overview'
    this.lastGroupByProject = state?.lastGroupByProject ?? {}

    if (state?.isActive) {
      this.detachNativeFileExplorer()
      this.plugin.activateProjectExplorer()
      this.plugin.activateInspector()
      this.getActiveDocument().body.setAttribute('data-lighthouse-workspace', 'true')
      this._isActive = true
      workspaceActive.set(true)
    }
  }

  getLastInspectorTab(): InspectorTab {
    return this.lastInspectorTab
  }

  async setLastInspectorTab(tab: InspectorTab): Promise<void> {
    if (this.lastInspectorTab === tab) return
    this.lastInspectorTab = tab
    await this.persistState()
  }

  /** Last folder selected in the Library (drives the Sheet List column), per project. */
  getLastGroupPath(projectId: string): string | undefined {
    return this.lastGroupByProject[projectId]
  }

  async setLastGroupPath(projectId: string, path: string | undefined): Promise<void> {
    if (this.lastGroupByProject[projectId] === path) return
    this.lastGroupByProject = { ...this.lastGroupByProject, [projectId]: path }
    await this.persistState()
  }

  private detachNativeFileExplorer(): void {
    const { workspace } = this.plugin.app
    const leaves = workspace.getLeavesOfType(NATIVE_FILE_EXPLORER_VIEW_TYPE)
    this.nativeExplorerWasOpen = leaves.length > 0
    leaves.forEach((l) => l.detach())
  }

  private restoreNativeFileExplorer(): void {
    if (!this.nativeExplorerWasOpen) return
    const { workspace } = this.plugin.app
    if (workspace.getLeavesOfType(NATIVE_FILE_EXPLORER_VIEW_TYPE).length > 0) return

    const leftLeaf = workspace.getLeftLeaf(false)
    if (!leftLeaf) return
    void leftLeaf.setViewState({ type: NATIVE_FILE_EXPLORER_VIEW_TYPE, active: false })
  }

  private async persistState(): Promise<void> {
    const existing = ((await this.plugin.loadData()) as Record<string, unknown>) ?? {}
    await this.plugin.saveData({
      ...existing,
      [STORAGE_KEY]: {
        isActive: this._isActive,
        lastInspectorTab: this.lastInspectorTab,
        lastGroupByProject: this.lastGroupByProject,
      } satisfies PersistedWorkspaceState,
    })
  }
}
