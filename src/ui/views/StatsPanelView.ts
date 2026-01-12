import { ItemView, WorkspaceLeaf } from 'obsidian'
import { mount, unmount } from 'svelte'

import type LighthousePlugin from '@/main'
import StatsPanel from '@/ui/views/StatsPanel.svelte'

export const STATS_PANEL_VIEW_TYPE = 'lighthouse-stats-panel'

export class StatsPanelView extends ItemView {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private component: any = null
  private plugin: LighthousePlugin

  constructor(leaf: WorkspaceLeaf, plugin: LighthousePlugin) {
    super(leaf)
    this.plugin = plugin
  }

  getViewType(): string {
    return STATS_PANEL_VIEW_TYPE
  }

  getDisplayText(): string {
    return 'Writing Stats'
  }

  getIcon(): string {
    return 'bar-chart-2'
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1]
    container.empty()

    this.component = mount(StatsPanel, {
      target: container,
      props: {
        plugin: this.plugin,
      },
    })
  }

  async onClose(): Promise<void> {
    if (this.component) {
      unmount(this.component)
      this.component = null
    }
  }
}
