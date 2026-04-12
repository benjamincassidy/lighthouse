/**
 * CslStyleManager - Manages bundled and downloaded CSL citation styles
 */

import { requestUrl } from 'obsidian'

import type LighthousePlugin from '@/main'

export interface CslStyle {
  id: string
  name: string
  path?: string // Set for bundled styles
  isCustom?: boolean
}

export const BUNDLED_CSL_STYLES: CslStyle[] = [
  { id: 'apa', name: 'APA (7th edition)', path: 'apa.csl' },
  { id: 'chicago-author-date', name: 'Chicago (author-date)', path: 'chicago-author-date.csl' },
  { id: 'mla', name: 'MLA (9th edition)', path: 'modern-language-association.csl' },
  { id: 'harvard', name: 'Harvard', path: 'harvard-cite-them-right.csl' },
  { id: 'ieee', name: 'IEEE', path: 'ieee.csl' },
  { id: 'vancouver', name: 'Vancouver', path: 'vancouver.csl' },
  {
    id: 'ama',
    name: 'AMA (American Medical Association)',
    path: 'american-medical-association.csl',
  },
  { id: 'nature', name: 'Nature', path: 'nature.csl' },
  { id: 'elsevier-harvard', name: 'Elsevier Harvard', path: 'elsevier-harvard.csl' },
  { id: 'acm', name: 'ACM', path: 'association-for-computing-machinery.csl' },
]

/**
 * GitHub repo metadata for style discovery
 */
interface GitHubStyleEntry {
  name: string
  path: string
  sha: string
  size: number
  url: string
  html_url: string
  git_url: string
  download_url: string
  type: 'file'
}

export class CslStyleManager {
  private plugin: LighthousePlugin
  private downloadedStyles: Map<string, string> = new Map() // id -> absolute path

  constructor(plugin: LighthousePlugin) {
    this.plugin = plugin
    this.loadDownloadedStyles()
  }

  /**
   * Get path to a bundled CSL style
   */
  getBundledStylePath(styleId: string): string | undefined {
    const style = BUNDLED_CSL_STYLES.find((s) => s.id === styleId)
    if (!style?.path) return undefined

    // Return path to bundled style in plugin directory
    const adapter = this.plugin.app.vault.adapter as unknown as { basePath: string }
    const pluginDir = adapter.basePath
    const manifestDir = this.plugin.manifest.dir
    return `${pluginDir}/${manifestDir}/csl-styles/${style.path}`
  }

  /**
   * Get path to a downloaded CSL style
   */
  getDownloadedStylePath(styleId: string): string | undefined {
    return this.downloadedStyles.get(styleId)
  }

  /**
   * Resolve a style ID or custom path to an absolute path
   */
  resolveStylePath(styleIdOrPath: string): string | undefined {
    if (!styleIdOrPath) return undefined

    // If it's an absolute path or contains path separators, treat as custom file
    if (styleIdOrPath.includes('/') || styleIdOrPath.includes('\\')) {
      return styleIdOrPath
    }

    // Check bundled styles first
    const bundledPath = this.getBundledStylePath(styleIdOrPath)
    if (bundledPath) return bundledPath

    // Check downloaded styles
    const downloadedPath = this.getDownloadedStylePath(styleIdOrPath)
    if (downloadedPath) return downloadedPath

    return undefined
  }

  /**
   * Search available CSL styles from GitHub repository
   */
  async searchStyles(query: string): Promise<CslStyle[]> {
    try {
      const response = await requestUrl({
        url: 'https://api.github.com/repos/citation-style-language/styles/contents',
      })

      const entries: GitHubStyleEntry[] = response.json as GitHubStyleEntry[]

      // Filter to .csl files and search by name
      const cslFiles = entries.filter((e) => e.type === 'file' && e.name.endsWith('.csl'))

      const queryLower = query.toLowerCase()
      const matches = cslFiles
        .filter((f) => {
          const nameLower = f.name.toLowerCase()
          return nameLower.includes(queryLower)
        })
        .map((f) => ({
          id: f.name.replace('.csl', ''),
          name: this.formatStyleName(f.name),
          path: f.download_url,
        }))
        .slice(0, 50) // Limit results

      return matches
    } catch (err) {
      console.error('[Lighthouse] Failed to fetch CSL styles:', err)
      return []
    }
  }

  /**
   * Download and install a CSL style from GitHub
   */
  async downloadStyle(style: CslStyle): Promise<void> {
    if (!style.path) {
      throw new Error('Style does not have a download URL')
    }

    try {
      const response = await requestUrl({ url: style.path })
      const content = response.text

      // Save to plugin data directory
      const dataDir = `${this.plugin.manifest.dir}/csl-styles/downloaded`
      const adapter = this.plugin.app.vault.adapter as unknown as {
        basePath: string
        mkdir: (path: string) => Promise<void>
        write: (path: string, data: string) => Promise<void>
      }
      const fullPath = `${adapter.basePath}/${dataDir}`

      // Ensure directory exists (Obsidian API - works on all platforms)
      try {
        await adapter.mkdir(fullPath)
      } catch {
        // Directory might already exist, that's fine
      }

      // Write file
      const filePath = `${fullPath}/${style.id}.csl`
      await adapter.write(filePath, content)

      // Track in memory
      this.downloadedStyles.set(style.id, filePath)

      // Persist to plugin settings
      await this.saveDownloadedStyles()
    } catch (err) {
      console.error('[Lighthouse] Failed to download style:', err)
      throw err
    }
  }

  /**
   * Get all available styles (bundled + downloaded)
   */
  getAllStyles(): CslStyle[] {
    const downloaded = Array.from(this.downloadedStyles.keys()).map((id) => ({
      id,
      name: this.formatStyleName(id),
      isCustom: false,
    }))

    return [...BUNDLED_CSL_STYLES, ...downloaded]
  }

  /**
   * Format a style filename into a display name
   */
  private formatStyleName(filename: string): string {
    return filename
      .replace('.csl', '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
  }

  /**
   * Load downloaded styles from plugin settings
   */
  private loadDownloadedStyles(): void {
    const settings = this.plugin.settings
    if (settings.downloadedCslStyles) {
      this.downloadedStyles = new Map(Object.entries(settings.downloadedCslStyles))
    }
  }

  /**
   * Save downloaded styles to plugin settings
   */
  private async saveDownloadedStyles(): Promise<void> {
    this.plugin.settings.downloadedCslStyles = Object.fromEntries(this.downloadedStyles)
    await this.plugin.saveSettings()
  }
}
