import { TFolder, type Vault } from 'obsidian'

import type { Project } from '@/types/types'

/**
 * Result of folder validation
 */
export interface FolderValidationResult {
  valid: boolean
  error?: string
}

/**
 * Every project has an Extras area — a Lighthouse-managed folder at the
 * project root, excluded from word counts. This is the folder name used when
 * a project doesn't yet have `extrasFolder` explicitly set (e.g. before it's
 * been auto-provisioned on first view).
 */
export const DEFAULT_EXTRAS_FOLDER_NAME = 'Extras'

/**
 * FolderManager handles path resolution/validation and the project's
 * root/Extras folder relationship.
 */
export class FolderManager {
  private vault: Vault
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

  constructor(vault: Vault) {
    this.vault = vault
  }

  /**
   * Check if a folder path exists in the vault
   */
  folderExists(path: string): boolean {
    const abstractFile = this.vault.getAbstractFileByPath(path)
    return this.isTFolder(abstractFile)
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
   * True if `path` is the project's Extras folder, or lives inside it.
   * Extras contents are excluded from word counts and shown as a separate
   * section in the Library, but everything else under rootPath counts.
   * Every project has Extras — falls back to the default folder name when
   * `extrasFolder` hasn't been explicitly set yet (e.g. before the Library
   * has auto-provisioned it for a freshly created project).
   */
  isExtras(project: Project, path: string): boolean {
    const extrasPath = this.resolveProjectPath(
      project.rootPath,
      project.extrasFolder || DEFAULT_EXTRAS_FOLDER_NAME,
    )
    const normalizedPath = this.normalizePath(path)
    return normalizedPath === extrasPath || normalizedPath.startsWith(`${extrasPath}/`)
  }

  /**
   * Resolve a relative path to an absolute vault path
   */
  resolveProjectPath(rootPath: string, relativePath: string): string {
    if (!relativePath) {
      return rootPath
    }

    const normalized = this.normalizePath(relativePath)

    // If path starts with '/', it's already absolute
    if (normalized.startsWith('/')) {
      return normalized.slice(1)
    }

    // If path already starts with rootPath, it's already absolute
    if (normalized.startsWith(rootPath)) {
      return normalized
    }

    // Otherwise, treat as relative and prepend rootPath
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
        if (this.isTFolder(child)) {
          collectFolders(child)
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
    if (!this.isTFolder(abstractFile)) {
      return []
    }

    const folders: TFolder[] = []
    const folder = abstractFile

    const collectFolders = (f: TFolder) => {
      folders.push(f)
      f.children.forEach((child) => {
        if (this.isTFolder(child)) {
          collectFolders(child)
        }
      })
    }

    collectFolders(folder)

    return folders
  }
}
