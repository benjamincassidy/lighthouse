import { beforeEach, describe, expect, it } from 'vitest'

import { FolderManager } from '@/core/FolderManager'
import type { Project } from '@/types/types'

import type { TFile, TFolder, Vault } from 'obsidian'

describe('FolderManager', () => {
  let manager: FolderManager
  let mockVault: Vault

  const createMockFolder = (path: string): TFolder => ({
    path,
    name: path.split('/').pop() || '',
    children: [],
    parent: null,
    vault: mockVault,
    isRoot: () => path === '',
  })

  const createTestProject = (): Project => ({
    id: 'test-id',
    name: 'Test Project',
    rootPath: 'projects/novel',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  beforeEach(() => {
    // Create mock folders with hierarchy
    const rootFolder = createMockFolder('')
    const projectsFolder = createMockFolder('projects')
    const novelFolder = createMockFolder('projects/novel')
    const chaptersFolder = createMockFolder('projects/novel/chapters')
    const researchFolder = createMockFolder('projects/novel/research')
    const notesFolder = createMockFolder('projects/novel/notes')
    const otherFolder = createMockFolder('other')

    // Set up folder hierarchy
    rootFolder.children = [projectsFolder, otherFolder]
    projectsFolder.children = [novelFolder]
    novelFolder.children = [chaptersFolder, researchFolder, notesFolder]
    chaptersFolder.children = []
    researchFolder.children = []
    notesFolder.children = []
    otherFolder.children = []

    // Mock vault with folder structure
    const folderMap = new Map<string, TFolder>([
      ['', rootFolder],
      ['projects', projectsFolder],
      ['projects/novel', novelFolder],
      ['projects/novel/chapters', chaptersFolder],
      ['projects/novel/research', researchFolder],
      ['projects/novel/notes', notesFolder],
      ['other', otherFolder],
    ])

    mockVault = {
      getAbstractFileByPath: (path: string) => {
        const normalized = path.replace(/^\//, '').replace(/\/$/, '')
        return folderMap.get(normalized) || null
      },
      getRoot: () => rootFolder,
      adapter: { constructor: Object },
    } as unknown as Vault

    manager = new FolderManager(mockVault)
  })

  describe('validateFolderPath', () => {
    it('should validate existing folder', () => {
      const result = manager.validateFolderPath('projects/novel/chapters')

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject non-existent folder', () => {
      const result = manager.validateFolderPath('projects/nonexistent')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should reject empty path', () => {
      const result = manager.validateFolderPath('')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('cannot be empty')
    })

    it('should normalize paths with slashes', () => {
      const result = manager.validateFolderPath('/projects/novel/chapters/')

      expect(result.valid).toBe(true)
    })
  })

  describe('isExtras', () => {
    it('should fall back to the default "Extras" folder name when unset', () => {
      const project = createTestProject()

      expect(manager.isExtras(project, 'projects/novel/Extras')).toBe(true)
      expect(manager.isExtras(project, 'projects/novel/research')).toBe(false)
    })

    it('should identify the Extras folder itself', () => {
      const project = createTestProject()
      project.extrasFolder = 'research'

      expect(manager.isExtras(project, 'projects/novel/research')).toBe(true)
    })

    it('should identify paths inside the Extras folder', () => {
      const project = createTestProject()
      project.extrasFolder = 'research'

      expect(manager.isExtras(project, 'projects/novel/research/notes.md')).toBe(true)
    })

    it('should not match sibling folders', () => {
      const project = createTestProject()
      project.extrasFolder = 'research'

      expect(manager.isExtras(project, 'projects/novel/chapters')).toBe(false)
    })

    it('should not match a folder that merely shares a name prefix', () => {
      const project = createTestProject()
      project.extrasFolder = 'research'

      expect(manager.isExtras(project, 'projects/novel/research-notes')).toBe(false)
    })
  })

  describe('path resolution', () => {
    it('should resolve relative path to absolute', () => {
      const result = manager.resolveProjectPath('projects/novel', 'chapters')

      expect(result).toBe('projects/novel/chapters')
    })

    it('should handle empty relative path', () => {
      const result = manager.resolveProjectPath('projects/novel', '')

      expect(result).toBe('projects/novel')
    })

    it('should handle path with leading slash', () => {
      const result = manager.resolveProjectPath('projects/novel', '/chapters')

      expect(result).toBe('projects/novel/chapters')
    })

    it('should make absolute path relative to root', () => {
      const result = manager.makeRelativePath('projects/novel', 'projects/novel/chapters')

      expect(result).toBe('chapters')
    })

    it('should handle same path', () => {
      const result = manager.makeRelativePath('projects/novel', 'projects/novel')

      expect(result).toBe('')
    })

    it('should handle already relative path', () => {
      const result = manager.makeRelativePath('projects/novel', 'chapters')

      expect(result).toBe('chapters')
    })
  })

  describe('path normalization', () => {
    it('should normalize paths with backslashes', () => {
      const result = manager.resolveProjectPath('projects\\novel', 'chapters\\drafts')

      expect(result).toBe('projects/novel/chapters/drafts')
    })

    it('should collapse multiple slashes', () => {
      const result = manager.resolveProjectPath('projects//novel', 'chapters///drafts')

      expect(result).toBe('projects/novel/chapters/drafts')
    })

    it('should remove leading and trailing slashes', () => {
      const result = manager.makeRelativePath('/projects/novel/', '/chapters/')

      expect(result).toBe('chapters')
    })
  })

  describe('getAllFolders', () => {
    it('should return all folders in the vault', () => {
      const folders = manager.getAllFolders()

      expect(folders.length).toBeGreaterThan(0)
      expect(folders.some((f) => f.path === '')).toBe(true) // root
      expect(folders.some((f) => f.path === 'projects')).toBe(true)
      expect(folders.some((f) => f.path === 'projects/novel')).toBe(true)
    })
  })

  describe('getFoldersInPath', () => {
    it('should return folders under a specific path', () => {
      const folders = manager.getFoldersInPath('projects/novel')

      expect(folders.length).toBeGreaterThan(0)
      expect(folders.some((f) => f.path === 'projects/novel')).toBe(true)
      expect(folders.some((f) => f.path === 'projects/novel/chapters')).toBe(true)
    })

    it('should return empty array for non-existent path', () => {
      const folders = manager.getFoldersInPath('non/existent')

      expect(folders).toEqual([])
    })

    it('should return empty array for file path', () => {
      // Mock a file instead of folder
      const originalGet = mockVault.getAbstractFileByPath.bind(mockVault)
      mockVault.getAbstractFileByPath = (path: string) => {
        if (path === 'projects/novel/file.md') {
          const mockFile: TFile = {
            path,
            name: 'file.md',
            basename: 'file',
            extension: 'md',
            stat: { ctime: 0, mtime: 0, size: 0 },
            vault: mockVault,
            parent: null,
          }
          return mockFile
        }
        return originalGet(path)
      }

      const folders = manager.getFoldersInPath('projects/novel/file.md')

      expect(folders).toEqual([])
    })
  })
})
