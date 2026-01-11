import type { Project } from '@/types/types'

/**
 * Validates a project object
 */
export function validateProject(project: Partial<Project>): string[] {
  const errors: string[] = []

  if (!project.id || typeof project.id !== 'string' || project.id.trim() === '') {
    errors.push('Project ID is required and must be a non-empty string')
  }

  if (!project.name || typeof project.name !== 'string' || project.name.trim() === '') {
    errors.push('Project name is required and must be a non-empty string')
  }

  if (!project.rootPath || typeof project.rootPath !== 'string') {
    errors.push('Project root path is required')
  }

  if (!Array.isArray(project.contentFolders)) {
    errors.push('Content folders must be an array')
  }

  if (!Array.isArray(project.sourceFolders)) {
    errors.push('Source folders must be an array')
  }

  if (project.wordCountGoal !== undefined && typeof project.wordCountGoal !== 'number') {
    errors.push('Word count goal must be a number')
  }

  if (
    project.wordCountGoal !== undefined &&
    (project.wordCountGoal < 0 || !Number.isInteger(project.wordCountGoal))
  ) {
    errors.push('Word count goal must be a positive integer')
  }

  return errors
}

/**
 * Validates that a project has all required fields
 */
export function isValidProject(project: unknown): project is Project {
  return validateProject(project as Partial<Project>).length === 0
}

/**
 * Generates a UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Normalizes a vault-relative path (removes leading/trailing slashes)
 */
export function normalizeVaultPath(path: string): string {
  return path.replace(/^\/+|\/+$/g, '')
}
