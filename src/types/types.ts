/**
 * Core data models for Lighthouse plugin
 */

export interface Project {
  id: string
  name: string
  rootPath: string // Vault-relative path
  contentFolders: string[] // Paths relative to rootPath
  sourceFolders: string[] // Paths relative to rootPath
  wordCountGoal?: number
  createdAt: string
  updatedAt: string
  dashboardConfig?: DashboardConfig
  templateFolder?: string
  metadata?: Record<string, unknown>
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
