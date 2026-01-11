import { FolderManager } from '@/core/FolderManager'
import { WordCounter, type WordCountOptions, type WordCountResult } from '@/core/WordCounter'
import type { FolderStats, Project, ProjectStats } from '@/types/types'

import type { TFile, TFolder, Vault } from 'obsidian'

/**
 * HierarchicalCounter aggregates word counts at file, folder, and project levels
 * Integrates WordCounter and FolderManager to respect content vs source folder designations
 */
export class HierarchicalCounter {
  private wordCounter: WordCounter
  private folderManager: FolderManager
  private vault: Vault
  private folderStatsCache: Map<string, FolderStats>
  private projectStatsCache: Map<string, ProjectStats>

  constructor(vault: Vault, wordCounter: WordCounter, folderManager: FolderManager) {
    this.vault = vault
    this.wordCounter = wordCounter
    this.folderManager = folderManager
    this.folderStatsCache = new Map()
    this.projectStatsCache = new Map()
  }

  /**
   * Calculate word count for a specific file
   */
  async countFile(file: TFile, options?: WordCountOptions): Promise<WordCountResult | undefined> {
    try {
      const content = await this.vault.cachedRead(file)
      return this.wordCounter.countFile(file, content, options)
    } catch (error) {
      console.error(`Error counting file ${file.path}:`, error)
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
    // Check cache
    const cached = this.folderStatsCache.get(folderPath)
    if (cached) {
      return cached
    }

    const folder = this.vault.getAbstractFileByPath(folderPath)
    if (!folder || !('children' in folder)) {
      return undefined
    }

    const stats = await this.calculateFolderStats(folder as TFolder, options)
    this.folderStatsCache.set(folderPath, stats)

    return stats
  }

  /**
   * Calculate total word count for a project
   * Only includes content folders, excludes source folders
   */
  async countProject(project: Project, options?: WordCountOptions): Promise<ProjectStats> {
    // Check cache
    const cached = this.projectStatsCache.get(project.id)
    if (cached) {
      return cached
    }

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

    this.projectStatsCache.set(project.id, projectStats)

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
      if ('children' in child) {
        // It's a folder
        const childStats = await this.calculateFolderStats(child as TFolder, options)
        children.push(childStats)
        wordCount += childStats.wordCount
        fileCount += childStats.fileCount
      } else {
        // It's a file
        const file = child as TFile
        if (file.extension === 'md') {
          const result = await this.countFile(file, options)
          if (result) {
            wordCount += result.words
            fileCount++
          }
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

  /**
   * Clear cache for a specific folder
   */
  clearFolderCache(folderPath: string): void {
    this.folderStatsCache.delete(folderPath)
  }

  /**
   * Clear cache for a specific project
   */
  clearProjectCache(projectId: string): void {
    this.projectStatsCache.delete(projectId)
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.folderStatsCache.clear()
    this.projectStatsCache.clear()
    this.wordCounter.clearAllCaches()
  }

  /**
   * Invalidate caches for a project and its folders
   */
  invalidateProjectCaches(project: Project): void {
    this.clearProjectCache(project.id)

    // Clear content folder caches
    for (const contentFolder of project.contentFolders) {
      const fullPath = this.folderManager.resolveProjectPath(project.rootPath, contentFolder)
      this.clearFolderCache(fullPath)
    }
  }

  /**
   * Get cached stats without recalculating
   */
  getCachedProjectStats(projectId: string): ProjectStats | undefined {
    return this.projectStatsCache.get(projectId)
  }

  /**
   * Get cached folder stats without recalculating
   */
  getCachedFolderStats(folderPath: string): FolderStats | undefined {
    return this.folderStatsCache.get(folderPath)
  }
}
