import { MarkdownView, TFile, TFolder, type App, type Vault } from 'obsidian'

import { FolderManager } from '@/core/FolderManager'
import { WordCounter, type WordCountOptions, type WordCountResult } from '@/core/WordCounter'
import type { FolderStats, Project, ProjectStats } from '@/types/types'

/**
 * HierarchicalCounter aggregates word counts at file, folder, and project levels
 * Integrates WordCounter and FolderManager to respect content vs source folder designations
 */
export class HierarchicalCounter {
  private wordCounter: WordCounter
  private folderManager: FolderManager
  private vault: Vault
  private app: App
  /** Type guard: narrow an abstract file to a TFolder using shape properties */
  private isTFolder(file: unknown): file is TFolder {
    return (
      typeof file === 'object' &&
      file !== null &&
      'children' in (file as Record<string, unknown>) &&
      typeof (file as Record<string, unknown>).children !== 'undefined' &&
      typeof (file as { isRoot?: () => boolean }).isRoot === 'function'
    )
  }

  /** Type guard: narrow an abstract file to a TFile using shape properties */
  private isTFile(file: unknown): file is TFile {
    return (
      typeof file === 'object' &&
      file !== null &&
      'extension' in (file as Record<string, unknown>) &&
      typeof (file as Record<string, unknown>).extension === 'string'
    )
  }

  constructor(vault: Vault, wordCounter: WordCounter, folderManager: FolderManager, app: App) {
    this.vault = vault
    this.wordCounter = wordCounter
    this.folderManager = folderManager
    this.app = app
  }

  /**
   * Calculate word count for a specific file
   */
  async countFile(file: TFile, options?: WordCountOptions): Promise<WordCountResult | undefined> {
    try {
      let content: string

      // Try to get content from active editor first (for unsaved changes)
      if (this.app) {
        const activeFile = this.app.workspace.getActiveFile()
        if (activeFile?.path === file.path) {
          // Get content from editor to include unsaved changes
          // Use getActiveViewOfType for more reliable editor access
          const view = this.app.workspace.getActiveViewOfType(MarkdownView)
          if (view?.editor) {
            content = view.editor.getValue()
          } else {
            content = await this.vault.cachedRead(file)
          }
        } else {
          content = await this.vault.cachedRead(file)
        }
      } else {
        content = await this.vault.cachedRead(file)
      }

      return this.wordCounter.countFile(file, content, options)
    } catch (error) {
      console.warn(`Error counting file ${file.path}:`, error)
      return undefined
    }
  }

  /**
   * Calculate total word count for a folder (including subfolders)
   */
  async countFolder(
    folderPath: string,
    options?: WordCountOptions,
    excludePath?: string,
  ): Promise<FolderStats | undefined> {
    const folder = this.vault.getAbstractFileByPath(folderPath)
    if (!this.isTFolder(folder)) {
      return undefined
    }

    const stats = await this.calculateFolderStats(folder, options, excludePath)

    return stats
  }

  /**
   * Calculate total word count for a project.
   * Walks the entire rootPath tree, excluding the Extras subtree (if set).
   */
  async countProject(project: Project, options?: WordCountOptions): Promise<ProjectStats> {
    const excludePath = project.extrasFolder
      ? this.folderManager.resolveProjectPath(project.rootPath, project.extrasFolder)
      : undefined

    const stats = await this.countFolder(project.rootPath, options, excludePath)

    const folderStats = new Map<string, FolderStats>()
    if (stats) {
      folderStats.set(project.rootPath, stats)
    }

    return {
      totalWords: stats?.wordCount ?? 0,
      totalFiles: stats?.fileCount ?? 0,
      folderStats,
    }
  }

  /**
   * True if the file's frontmatter has `lighthouse-uncounted: true`, excluding
   * it from word-count totals independent of Extras-folder membership.
   */
  private isUncounted(file: TFile): boolean {
    return this.app.metadataCache.getFileCache(file)?.frontmatter?.['lighthouse-uncounted'] === true
  }

  /**
   * Calculate stats for a folder and its children recursively.
   * Skips recursing into `excludePath` entirely (neither its words nor its
   * files are counted) — used to exclude a project's Extras subtree. Also
   * skips individual files flagged `lighthouse-uncounted: true`.
   */
  private async calculateFolderStats(
    folder: TFolder,
    options?: WordCountOptions,
    excludePath?: string,
  ): Promise<FolderStats> {
    let wordCount = 0
    let fileCount = 0
    const children: FolderStats[] = []

    for (const child of folder.children) {
      if (excludePath && child.path === excludePath) {
        continue
      }
      if (this.isTFolder(child)) {
        // It's a folder
        const childStats = await this.calculateFolderStats(child, options, excludePath)
        children.push(childStats)
        wordCount += childStats.wordCount
        fileCount += childStats.fileCount
      } else if (this.isTFile(child) && child.extension === 'md') {
        if (this.isUncounted(child)) {
          continue
        }
        // It's a markdown file
        const result = await this.countFile(child, options)
        if (result) {
          wordCount += result.words
          fileCount++
        }
      }
    }

    return {
      path: folder.path,
      wordCount,
      fileCount,
      children,
    }
  }
}
