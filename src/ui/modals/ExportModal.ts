import { Modal, Notice } from 'obsidian'
import { mount, unmount } from 'svelte'

import type LighthousePlugin from '@/main'
import type { Project } from '@/types/types'
import ExportModalComponent from './ExportModal.svelte'

export class ExportModal extends Modal {
  private component: ReturnType<typeof mount> | null = null

  constructor(
    private plugin: LighthousePlugin,
    private project: Project,
  ) {
    super(plugin.app)
    this.modalEl.addClass('lh-export-modal')
  }

  onOpen(): void {
    this.contentEl.empty()
    this.component = mount(ExportModalComponent, {
      target: this.contentEl,
      props: {
        plugin: this.plugin,
        project: this.project,
        onClose: () => this.close(),
        onSuccess: (message: string) => {
          new Notice(message)
          this.close()
        },
      },
    })
  }

  onClose(): void {
    if (this.component) {
      void unmount(this.component)
      this.component = null
    }
    this.contentEl.empty()
  }
}
