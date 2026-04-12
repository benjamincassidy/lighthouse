import { Modal, Notice, Setting } from 'obsidian'

import { CslStyleManager, type CslStyle } from '@/core/CslStyleManager'
import type LighthousePlugin from '@/main'

/**
 * Modal for searching and downloading CSL citation styles from GitHub
 */
export class CslStyleDownloadModal extends Modal {
  private cslManager: CslStyleManager
  private onSelect: (styleId: string) => void
  private searchResults: CslStyle[] = []
  private resultsContainer: HTMLElement | null = null
  private searching = false

  constructor(
    plugin: LighthousePlugin,
    cslManager: CslStyleManager,
    onSelect: (styleId: string) => void,
  ) {
    super(plugin.app)
    this.cslManager = cslManager
    this.onSelect = onSelect
  }

  onOpen(): void {
    const { contentEl } = this

    contentEl.createEl('h2', { text: 'Download citation style' })

    contentEl.createEl('p', {
      text: 'Download citation styles from GitHub',
      cls: 'setting-item-description',
    })

    // Search input
    new Setting(contentEl).setName('Search').addText((text) => {
      text.setPlaceholder('Enter style name').onChange(async (value) => {
        if (value.length >= 2) {
          await this.search(value)
        } else {
          this.clearResults()
        }
      })
      text.inputEl.focus()
    })

    // Results container
    this.resultsContainer = contentEl.createDiv({ cls: 'lighthouse-csl-results' })

    // Info
    contentEl.createEl('p', {
      text: 'Styles are downloaded from github.com/citation-style-language/styles',
      cls: 'setting-item-description',
    })
  }

  private async search(query: string): Promise<void> {
    if (this.searching) return

    this.searching = true
    this.clearResults()

    if (this.resultsContainer) {
      this.resultsContainer.createEl('p', { text: 'Searching...', cls: 'lighthouse-searching' })
    }

    try {
      this.searchResults = await this.cslManager.searchStyles(query)
      this.renderResults()
    } catch (err) {
      new Notice(`Failed to search styles: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      this.searching = false
    }
  }

  private renderResults(): void {
    if (!this.resultsContainer) return

    this.resultsContainer.empty()

    if (this.searchResults.length === 0) {
      this.resultsContainer.createEl('p', {
        text: 'No styles found. Try a different search term.',
        cls: 'lighthouse-no-results',
      })
      return
    }

    this.resultsContainer.createEl('h3', { text: `${this.searchResults.length} results` })

    const list = this.resultsContainer.createDiv({ cls: 'lighthouse-style-list' })

    for (const style of this.searchResults) {
      const item = list.createDiv({ cls: 'lighthouse-style-item' })

      item.createEl('span', { text: style.name, cls: 'lighthouse-style-name' })

      const downloadBtn = item.createEl('button', {
        text: 'Download',
        cls: 'mod-cta',
      })

      downloadBtn.addEventListener('click', () => {
        downloadBtn.disabled = true
        downloadBtn.textContent = 'Downloading...'

        void (async () => {
          try {
            await this.cslManager.downloadStyle(style)
            new Notice(`Downloaded ${style.name}`)
            this.onSelect(style.id)
            this.close()
          } catch (err) {
            new Notice(
              `Failed to download: ${err instanceof Error ? err.message : String(err)}`,
              5000,
            )
            downloadBtn.disabled = false
            downloadBtn.textContent = 'Download'
          }
        })()
      })
    }
  }

  private clearResults(): void {
    if (this.resultsContainer) {
      this.resultsContainer.empty()
    }
    this.searchResults = []
  }

  onClose(): void {
    const { contentEl } = this
    contentEl.empty()
  }
}
