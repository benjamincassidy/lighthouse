import { ItemView, WorkspaceLeaf } from 'obsidian'

import type LighthousePlugin from '@/main'
import StatsPanel from '@/ui/views/StatsPanel.svelte'

export const STATS_PANEL_VIEW_TYPE = 'lighthouse-stats-panel'

export class StatsPanelView extends ItemView {
  private component: StatsPanel | null = null
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

    const props: { plugin: LighthousePlugin } = {
      plugin: this.plugin,
    }

    this.component = new StatsPanel({
      target: container,
      props,
    })
  }

  async onClose(): Promise<void> {
    if (this.component) {
      this.component.$destroy()
      this.component = null
    }
  }
}
