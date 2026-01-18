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
  ): Promise<FolderStats | undefined> {
    const folder = this.vault.getAbstractFileByPath(folderPath)
    if (!this.isTFolder(folder)) {
      return undefined
    }

    const stats = await this.calculateFolderStats(folder, options)

    return stats
  }

  /**
   * Calculate total word count for a project
   * Only includes content folders, excludes source folders
   */
  async countProject(project: Project, options?: WordCountOptions): Promise<ProjectStats> {
    const folderStats = new Map<string, FolderStats>()
    let totalWords = 0
    let totalFiles = 0

    // Count only content folders
    for (const contentFolder of project.contentFolders) {
      const fullPath = this.folderManager.resolveProjectPath(project.rootPath, contentFolder)
      const stats = await this.countFolder(fullPath, options)

      if (stats) {
        folderStats.set(contentFolder, stats)
        totalWords += stats.wordCount
        totalFiles += stats.fileCount
      }
    }

    const projectStats: ProjectStats = {
      totalWords,
      totalFiles,
      folderStats,
    }

    return projectStats
  }

  /**
   * Calculate stats for a folder and its children recursively
   */
  private async calculateFolderStats(
    folder: TFolder,
    options?: WordCountOptions,
  ): Promise<FolderStats> {
    let wordCount = 0
    let fileCount = 0
    const children: FolderStats[] = []

    for (const child of folder.children) {
      if (this.isTFolder(child)) {
        // It's a folder
        const childStats = await this.calculateFolderStats(child, options)
        children.push(childStats)
        wordCount += childStats.wordCount
        fileCount += childStats.fileCount
      } else if (this.isTFile(child) && child.extension === 'md') {
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
