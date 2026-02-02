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

  // Word Count Settings
  showWordCountInStatusBar: boolean
  excludeCodeBlocks: boolean
  excludeFrontmatter: boolean

  // Writing Stats Tracking
  todayWordCountBaseline: number
  todayWordCountDate: string

  // General Settings
  debugMode: boolean
}

export const DEFAULT_SETTINGS: LighthouseSettings = {
  // Project Data
  projects: [],
  activeProjectId: undefined,

  // Zen Mode
  zenModeHideStatusBar: true,
  zenModeHideRibbon: true,

  // Word Count
  showWordCountInStatusBar: true,
  excludeCodeBlocks: true,
  excludeFrontmatter: true,

  // Writing Stats Tracking
  todayWordCountBaseline: 0,
  todayWordCountDate: '', // Empty string ensures first load triggers baseline initialization

  // General
  debugMode: false,
}
