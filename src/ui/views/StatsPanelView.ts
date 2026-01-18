import { ItemView, WorkspaceLeaf } from 'obsidian'
import { mount, unmount } from 'svelte'

import type LighthousePlugin from '@/main'
import StatsPanel from '@/ui/views/StatsPanel.svelte'

export const STATS_PANEL_VIEW_TYPE = 'lighthouse-stats-panel'

export class StatsPanelView extends ItemView {
  private component: ReturnType<typeof mount> | null = null
  private plugin: LighthousePlugin

  constructor(leaf: WorkspaceLeaf, plugin: LighthousePlugin) {
    super(leaf)
    this.plugin = plugin
  }

  getViewType(): string {
    return STATS_PANEL_VIEW_TYPE
  }

  getDisplayText(): string {
    return 'Writing stats'
  }

  getIcon(): string {
    return 'bar-chart-2'
  }

  onOpen(): Promise<void> {
    const container = this.containerEl.children[1]
    container.empty()

    this.component = mount(StatsPanel, {
      target: container,
      props: {
        plugin: this.plugin,
      },
    })
    return Promise.resolve()
  }

  onClose(): Promise<void> {
    if (this.component) {
      void unmount(this.component)
      this.component = null
    }
    return Promise.resolve()
  }
}
