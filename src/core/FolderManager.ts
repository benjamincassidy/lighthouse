import type { Project } from '@/types/types'

import type { TFolder, Vault } from 'obsidian'

/**
 * Result of folder validation
 */
export interface FolderValidationResult {
  valid: boolean
  error?: string
}

/**
 * FolderManager handles folder type designation and validation
 */
export class FolderManager {
  private vault: Vault

  constructor(vault: Vault) {
    this.vault = vault
  }

  /**
   * Check if a folder path exists in the vault
   */
  folderExists(path: string): boolean {
    const abstractFile = this.vault.getAbstractFileByPath(path)
    return abstractFile !== null && abstractFile instanceof this.vault.adapter.constructor
  }

  /**
   * Validate a folder path
   */
  validateFolderPath(path: string): FolderValidationResult {
    if (!path || path.trim() === '') {
      return { valid: false, error: 'Folder path cannot be empty' }
    }

    // Normalize path (remove leading/trailing slashes)
    const normalizedPath = this.normalizePath(path)

    // Check if folder exists
    const abstractFile = this.vault.getAbstractFileByPath(normalizedPath)
    if (!abstractFile) {
      return { valid: false, error: `Folder not found: ${normalizedPath}` }
    }

    // Check if it's actually a folder
    if (!('children' in abstractFile)) {
      return { valid: false, error: `Path is not a folder: ${normalizedPath}` }
    }

    return { valid: true }
  }

  /**
   * Validate all folders in a project
   */
  validateProjectFolders(project: Project): {
    contentFolders: Map<string, FolderValidationResult>
    sourceFolders: Map<string, FolderValidationResult>
  } {
    const contentFolders = new Map<string, FolderValidationResult>()
    const sourceFolders = new Map<string, FolderValidationResult>()

    for (const folder of project.contentFolders) {
      const fullPath = this.resolveProjectPath(project.rootPath, folder)
      contentFolders.set(folder, this.validateFolderPath(fullPath))
    }

    for (const folder of project.sourceFolders) {
      const fullPath = this.resolveProjectPath(project.rootPath, folder)
      sourceFolders.set(folder, this.validateFolderPath(fullPath))
    }

    return { contentFolders, sourceFolders }
  }

  /**
   * Add a content folder to a project
   */
  addContentFolder(project: Project, folderPath: string): { success: boolean; error?: string } {
    const relativePath = this.makeRelativePath(project.rootPath, folderPath)

    // Check if already exists
    if (project.contentFolders.includes(relativePath)) {
      return { success: false, error: 'Folder already designated as content folder' }
    }

    // Check if it's in source folders
    if (project.sourceFolders.includes(relativePath)) {
      return {
        success: false,
        error: 'Folder is already designated as source folder. Remove it from source first.',
      }
    }

    // Validate folder exists
    const validation = this.validateFolderPath(folderPath)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    project.contentFolders.push(relativePath)
    return { success: true }
  }

  /**
   * Add a source folder to a project
   */
  addSourceFolder(project: Project, folderPath: string): { success: boolean; error?: string } {
    const relativePath = this.makeRelativePath(project.rootPath, folderPath)

    // Check if already exists
    if (project.sourceFolders.includes(relativePath)) {
      return { success: false, error: 'Folder already designated as source folder' }
    }

    // Check if it's in content folders
    if (project.contentFolders.includes(relativePath)) {
      return {
        success: false,
        error: 'Folder is already designated as content folder. Remove it from content first.',
      }
    }

    // Validate folder exists
    const validation = this.validateFolderPath(folderPath)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    project.sourceFolders.push(relativePath)
    return { success: true }
  }

  /**
   * Remove a content folder from a project
   */
  removeContentFolder(project: Project, folderPath: string): boolean {
    const relativePath = this.makeRelativePath(project.rootPath, folderPath)
    const index = project.contentFolders.indexOf(relativePath)

    if (index === -1) {
      return false
    }

    project.contentFolders.splice(index, 1)
    return true
  }

  /**
   * Remove a source folder from a project
   */
  removeSourceFolder(project: Project, folderPath: string): boolean {
    const relativePath = this.makeRelativePath(project.rootPath, folderPath)
    const index = project.sourceFolders.indexOf(relativePath)

    if (index === -1) {
      return false
    }

    project.sourceFolders.splice(index, 1)
    return true
  }

  /**
   * Check if a folder is a content folder in the project
   */
  isContentFolder(project: Project, folderPath: string): boolean {
    const relativePath = this.makeRelativePath(project.rootPath, folderPath)
    return project.contentFolders.includes(relativePath)
  }

  /**
   * Check if a folder is a source folder in the project
   */
  isSourceFolder(project: Project, folderPath: string): boolean {
    const relativePath = this.makeRelativePath(project.rootPath, folderPath)
    return project.sourceFolders.includes(relativePath)
  }

  /**
   * Get the folder type (content, source, or neither)
   */
  getFolderType(project: Project, folderPath: string): 'content' | 'source' | 'none' {
    if (this.isContentFolder(project, folderPath)) {
      return 'content'
    }
    if (this.isSourceFolder(project, folderPath)) {
      return 'source'
    }
    return 'none'
  }

  /**
   * Resolve a relative path to an absolute vault path
   */
  resolveProjectPath(rootPath: string, relativePath: string): string {
    if (!relativePath) {
      return rootPath
    }

    const normalized = this.normalizePath(relativePath)
    if (normalized.startsWith('/')) {
      return normalized.slice(1)
    }

    return this.normalizePath(`${rootPath}/${normalized}`)
  }

  /**
   * Make a path relative to the project root
   */
  makeRelativePath(rootPath: string, absolutePath: string): string {
    const normalizedRoot = this.normalizePath(rootPath)
    const normalizedPath = this.normalizePath(absolutePath)

    // If path starts with root, make it relative
    if (normalizedPath.startsWith(normalizedRoot + '/')) {
      return normalizedPath.slice(normalizedRoot.length + 1)
    }

    // If they're the same, return empty string
    if (normalizedPath === normalizedRoot) {
      return ''
    }

    // Otherwise, return as-is (might already be relative)
    return normalizedPath
  }

  /**
   * Normalize a path (remove leading/trailing slashes, collapse multiple slashes)
   */
  private normalizePath(path: string): string {
    return path
      .replace(/\\/g, '/') // Convert backslashes to forward slashes
      .replace(/\/+/g, '/') // Collapse multiple slashes
      .replace(/^\//, '') // Remove leading slash
      .replace(/\/$/, '') // Remove trailing slash
  }

  /**
   * Get all folders in the vault
   */
  getAllFolders(): TFolder[] {
    const folders: TFolder[] = []

    const collectFolders = (folder: TFolder) => {
      folders.push(folder)
      folder.children.forEach((child) => {
        if ('children' in child) {
          collectFolders(child as TFolder)
        }
      })
    }

    const root = this.vault.getRoot()
    collectFolders(root)

    return folders
  }

  /**
   * Get folders under a specific path
   */
  getFoldersInPath(path: string): TFolder[] {
    const abstractFile = this.vault.getAbstractFileByPath(path)
    if (!abstractFile || !('children' in abstractFile)) {
      return []
    }

    const folders: TFolder[] = []
    const folder = abstractFile as TFolder

    const collectFolders = (f: TFolder) => {
      folders.push(f)
      f.children.forEach((child) => {
        if ('children' in child) {
          collectFolders(child as TFolder)
        }
      })
    }

    collectFolders(folder)

    return folders
  }
}
