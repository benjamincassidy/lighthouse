import { ItemView, WorkspaceLeaf } from 'obsidian'
import { mount, unmount } from 'svelte'

import type LighthousePlugin from '@/main'
import Dashboard from '@/ui/views/Dashboard.svelte'

export const DASHBOARD_VIEW_TYPE = 'lighthouse-dashboard'

export class DashboardView extends ItemView {
  private component: ReturnType<typeof mount> | null = null
  private plugin: LighthousePlugin

  constructor(leaf: WorkspaceLeaf, plugin: LighthousePlugin) {
    super(leaf)
    this.plugin = plugin
  }

  getViewType(): string {
    return DASHBOARD_VIEW_TYPE
  }

  getDisplayText(): string {
    return 'Project dashboard'
  }

  getIcon(): string {
    return 'layout-dashboard'
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1]
    container.empty()

    this.component = mount(Dashboard, {
      target: container,
      props: {
        plugin: this.plugin,
      },
    })
  }

  async onClose(): Promise<void> {
    if (this.component) {
      void unmount(this.component)
      this.component = null
    }
  }
}
