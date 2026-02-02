import { ItemView, WorkspaceLeaf } from 'obsidian'
import { mount, unmount } from 'svelte'

import type LighthousePlugin from '@/main'
import ProjectExplorer from '@/ui/views/ProjectExplorer.svelte'

export const PROJECT_EXPLORER_VIEW_TYPE = 'lighthouse-project-explorer'

export class ProjectExplorerView extends ItemView {
  private component: ReturnType<typeof mount> | null = null
  private plugin: LighthousePlugin

  constructor(leaf: WorkspaceLeaf, plugin: LighthousePlugin) {
    super(leaf)
    this.plugin = plugin
  }

  getViewType(): string {
    return PROJECT_EXPLORER_VIEW_TYPE
  }

  getDisplayText(): string {
    return 'Project explorer'
  }

  getIcon(): string {
    return 'lightbulb'
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1]
    container.empty()

    this.component = mount(ProjectExplorer, {
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
