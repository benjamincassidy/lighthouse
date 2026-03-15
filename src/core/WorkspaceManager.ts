import { workspaceActive } from '@/core/stores'
import type LighthousePlugin from '@/main'
import { PROJECT_EXPLORER_VIEW_TYPE } from '@/ui/views/ProjectExplorerView'
import { STATS_PANEL_VIEW_TYPE } from '@/ui/views/StatsPanelView'

const STORAGE_KEY = 'workspaceState'

interface PersistedWorkspaceState {
  isActive: boolean
}

/**
 * Manages the Lighthouse Writing Workspace — a dedicated layout preset that
 * opens the Project Explorer in the left sidebar and the Stats Panel in the
 * right sidebar, making Lighthouse feel like a cohesive application rather
 * than a collection of individual panels.
 *
 * State is persisted to `lighthouse.json` via plugin settings so the workspace
 * is automatically restored when Obsidian reloads.
 */
export class WorkspaceManager {
  private plugin: LighthousePlugin
  private _isActive = false

  constructor(plugin: LighthousePlugin) {
    this.plugin = plugin
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
   * - Opens Project Explorer in the left sidebar
   * - Opens Stats Panel in the right sidebar
   * - Sets `data-lighthouse-workspace` on the body for CSS targeting
   * - Persists active state
   */
  async enterWritingWorkspace(): Promise<void> {
    this.plugin.activateProjectExplorer()
    this.plugin.activateStatsPanel()

    document.body.setAttribute('data-lighthouse-workspace', 'true')
    this._isActive = true
    workspaceActive.set(true)

    await this.persistState()
  }

  /**
   * Exit the Writing Workspace:
   * - Detaches the Explorer and Stats panels
   * - Removes the body attribute
   * - Persists inactive state
   */
  async exitWritingWorkspace(): Promise<void> {
    const { workspace } = this.plugin.app

    workspace.getLeavesOfType(PROJECT_EXPLORER_VIEW_TYPE).forEach((l) => l.detach())
    workspace.getLeavesOfType(STATS_PANEL_VIEW_TYPE).forEach((l) => l.detach())

    document.body.removeAttribute('data-lighthouse-workspace')
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

    if (state?.isActive) {
      this.plugin.activateProjectExplorer()
      this.plugin.activateStatsPanel()
      document.body.setAttribute('data-lighthouse-workspace', 'true')
      this._isActive = true
      workspaceActive.set(true)
    }
  }

  private async persistState(): Promise<void> {
    const existing = ((await this.plugin.loadData()) as Record<string, unknown>) ?? {}
    await this.plugin.saveData({
      ...existing,
      [STORAGE_KEY]: { isActive: this._isActive } satisfies PersistedWorkspaceState,
    })
  }
}
