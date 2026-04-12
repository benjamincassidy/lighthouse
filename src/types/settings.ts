import type { Project } from './types'

/**
 * Plugin settings interface - includes both project data and UI preferences
 */
export interface LighthouseSettings {
  // Project Data
  projects: Project[]
  activeProjectId: string | undefined

  // Flow Mode Settings
  flowModeHideStatusBar: boolean
  flowModeHideRibbon: boolean
  flowTypewriterScroll: boolean
  flowFont: string
  flowLineHeight: number
  flowLineWidth: number

  // Word Count Settings
  showWordCountInStatusBar: boolean
  excludeCodeBlocks: boolean
  excludeFrontmatter: boolean

  // CSL Citation Styles
  downloadedCslStyles?: Record<string, string> // styleId -> absolute path

  // General Settings
  debugMode: boolean

  // Workspace
  workspaceActive?: boolean
}

export const DEFAULT_SETTINGS: LighthouseSettings = {
  // Project Data
  projects: [],
  activeProjectId: undefined,

  // Flow Mode
  flowModeHideStatusBar: true,
  flowModeHideRibbon: true,
  flowTypewriterScroll: true,
  flowFont: '',
  flowLineHeight: 0,
  flowLineWidth: 0,

  // Word Count
  showWordCountInStatusBar: true,
  excludeCodeBlocks: true,
  excludeFrontmatter: true,

  // General
  debugMode: false,

  // Workspace
  workspaceActive: false,
}
