import { ItemView, WorkspaceLeaf } from 'obsidian'
import { mount, unmount } from 'svelte'

import type LighthousePlugin from '@/main'
import Inspector from '@/ui/views/Inspector.svelte'

export const INSPECTOR_VIEW_TYPE = 'lighthouse-inspector'

export class InspectorView extends ItemView {
  private component: ReturnType<typeof mount> | null = null
  private plugin: LighthousePlugin

  constructor(leaf: WorkspaceLeaf, plugin: LighthousePlugin) {
    super(leaf)
    this.plugin = plugin
  }

  getViewType(): string {
    return INSPECTOR_VIEW_TYPE
  }

  getDisplayText(): string {
    return 'Inspector'
  }

  getIcon(): string {
    return 'bar-chart-2'
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1]
    container.empty()

    this.component = mount(Inspector, {
      target: container,
      props: {
        plugin: this.plugin,
      },
    })
    await Promise.resolve()
  }

  async onClose(): Promise<void> {
    if (this.component) {
      void unmount(this.component)
      this.component = null
    }
    await Promise.resolve()
  }
}
