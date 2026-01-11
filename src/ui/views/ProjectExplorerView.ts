import { ItemView, WorkspaceLeaf } from 'obsidian'

import type LighthousePlugin from '@/main'
import ProjectExplorer from '@/ui/views/ProjectExplorer.svelte'

export const PROJECT_EXPLORER_VIEW_TYPE = 'lighthouse-project-explorer'

export class ProjectExplorerView extends ItemView {
  private component: ProjectExplorer | null = null
  private plugin: LighthousePlugin

  constructor(leaf: WorkspaceLeaf, plugin: LighthousePlugin) {
    super(leaf)
    this.plugin = plugin
  }

  getViewType(): string {
    return PROJECT_EXPLORER_VIEW_TYPE
  }

  getDisplayText(): string {
    return 'Project Explorer'
  }

  getIcon(): string {
    return 'folder-tree'
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1]
    container.empty()

    this.component = new ProjectExplorer({
      target: container,
      props: {
        plugin: this.plugin,
        showFullVault: false,
      },
    })
  }

  async onClose(): Promise<void> {
    if (this.component) {
      this.component.$destroy()
      this.component = null
    }
  }
}
