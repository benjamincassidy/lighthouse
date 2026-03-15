import type { Project } from './types'

/**
 * Plugin settings interface - includes both project data and UI preferences
 */
export interface LighthouseSettings {
  // Project Data
  projects: Project[]
  activeProjectId: string | undefined

  // Zen Mode Settings
  zenModeHideStatusBar: boolean
  zenModeHideRibbon: boolean
  zenTypewriterScroll: boolean
  zenFocusMode: 'none' | 'paragraph' | 'sentence'
  zenFont: string
  zenLineHeight: number
  zenLineWidth: number

  // Word Count Settings
  showWordCountInStatusBar: boolean
  excludeCodeBlocks: boolean
  excludeFrontmatter: boolean

  // General Settings
  debugMode: boolean

  // Workspace
  workspaceActive?: boolean
}

export const DEFAULT_SETTINGS: LighthouseSettings = {
  // Project Data
  projects: [],
  activeProjectId: undefined,

  // Zen Mode
  zenModeHideStatusBar: true,
  zenModeHideRibbon: true,
  zenTypewriterScroll: true,
  zenFocusMode: 'none',
  zenFont: '',
  zenLineHeight: 0,
  zenLineWidth: 0,

  // Word Count
  showWordCountInStatusBar: true,
  excludeCodeBlocks: true,
  excludeFrontmatter: true,

  // General
  debugMode: false,

  // Workspace
  workspaceActive: false,
}
