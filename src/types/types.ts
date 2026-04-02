/**
 * Core data models for Lighthouse plugin
 */

export type GoalDirection = 'at-least' | 'at-most'

export interface Project {
  id: string
  name: string
  rootPath: string // Vault-relative path
  contentFolders: string[] // Paths relative to rootPath
  sourceFolders: string[] // Paths relative to rootPath
  wordCountGoal?: number
  // 'at-least' = minimum (default); 'at-most' = word limit (turns red when exceeded)
  goalDirection?: GoalDirection
  // Per-folder word count goals keyed by full vault-relative path
  folderGoals?: Record<string, number>
  // Per-file word count goals: keyed by vault-relative file path
  fileGoals?: Record<string, number>
  createdAt: string
  updatedAt: string
  dashboardConfig?: DashboardConfig
  templateFolder?: string
  metadata?: Record<string, unknown>
  // Custom sort order: vault-relative paths in user-defined sequence
  fileOrder?: string[]
  // Daily word count tracking (per-project)
  todayWordCountBaseline?: number
  todayWordCountDate?: string // ISO date format (YYYY-MM-DD)
  // Per-day word counts for rolling average + heatmap: keyed by YYYY-MM-DD, value = words written
  dailyWordCounts?: Record<string, number>
  // Target finish date for pacing calculations (YYYY-MM-DD)
  deadline?: string
  // Explicit daily writing goal used for heatmap levels and pacing display
  dailyGoal?: number
  // Dates the writer has marked as planned rest days (YYYY-MM-DD, local time).
  // Rest days count toward the writing streak but don't require words.
  daysOff?: string[]
}

export interface DashboardConfig {
  dataviewQueries?: string[]
  showWordCount: boolean
  showFileCount: boolean
  customWidgets?: Widget[]
}

export interface Widget {
  id: string
  type: 'stat' | 'query' | 'custom'
  config: Record<string, unknown>
}

export interface ProjectStats {
  totalWords: number
  totalFiles: number
  folderStats: Map<string, FolderStats>
}

export interface FolderStats {
  path: string
  wordCount: number
  fileCount: number
  children: FolderStats[]
}
