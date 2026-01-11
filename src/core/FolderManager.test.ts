import { beforeEach, describe, expect, it } from 'vitest'

import { FolderManager } from '@/core/FolderManager'
import type { Project } from '@/types/types'

import type { TFolder, Vault } from 'obsidian'

describe('FolderManager', () => {
  let manager: FolderManager
  let mockVault: Vault

  const createMockFolder = (path: string): TFolder =>
    ({
      path,
      name: path.split('/').pop() || '',
      children: [],
      parent: null,
      vault: mockVault,
      isRoot: () => path === '',
    }) as TFolder

  const createTestProject = (): Project => ({
    id: 'test-id',
    name: 'Test Project',
    rootPath: 'projects/novel',
    contentFolders: [],
    sourceFolders: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  beforeEach(() => {
    // Mock vault with folder structure
    const folderMap = new Map<string, TFolder>([
      ['', createMockFolder('')],
      ['projects', createMockFolder('projects')],
      ['projects/novel', createMockFolder('projects/novel')],
      ['projects/novel/chapters', createMockFolder('projects/novel/chapters')],
      ['projects/novel/research', createMockFolder('projects/novel/research')],
      ['projects/novel/notes', createMockFolder('projects/novel/notes')],
      ['other', createMockFolder('other')],
    ])

    mockVault = {
      getAbstractFileByPath: (path: string) => {
        const normalized = path.replace(/^\//, '').replace(/\/$/, '')
        return folderMap.get(normalized) || null
      },
      getRoot: () => folderMap.get(''),
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

  describe('validateProjectFolders', () => {
    it('should validate all project folders', () => {
      const project = createTestProject()
      project.contentFolders = ['chapters', 'scenes']
      project.sourceFolders = ['research']

      const result = manager.validateProjectFolders(project)

      expect(result.contentFolders.size).toBe(2)
      expect(result.sourceFolders.size).toBe(1)
      expect(result.contentFolders.get('chapters')?.valid).toBe(true)
      expect(result.sourceFolders.get('research')?.valid).toBe(true)
    })

    it('should report invalid folders', () => {
      const project = createTestProject()
      project.contentFolders = ['nonexistent']

      const result = manager.validateProjectFolders(project)

      expect(result.contentFolders.get('nonexistent')?.valid).toBe(false)
      expect(result.contentFolders.get('nonexistent')?.error).toContain('not found')
    })
  })

  describe('addContentFolder', () => {
    it('should add content folder', () => {
      const project = createTestProject()

      const result = manager.addContentFolder(project, 'projects/novel/chapters')

      expect(result.success).toBe(true)
      expect(project.contentFolders).toContain('chapters')
    })

    it('should prevent duplicate content folders', () => {
      const project = createTestProject()
      project.contentFolders = ['chapters']

      const result = manager.addContentFolder(project, 'projects/novel/chapters')

      expect(result.success).toBe(false)
      expect(result.error).toContain('already designated')
    })

    it('should prevent folder in both content and source', () => {
      const project = createTestProject()
      project.sourceFolders = ['chapters']

      const result = manager.addContentFolder(project, 'projects/novel/chapters')

      expect(result.success).toBe(false)
      expect(result.error).toContain('already designated as source')
    })

    it('should reject non-existent folder', () => {
      const project = createTestProject()

      const result = manager.addContentFolder(project, 'projects/novel/nonexistent')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })

  describe('addSourceFolder', () => {
    it('should add source folder', () => {
      const project = createTestProject()

      const result = manager.addSourceFolder(project, 'projects/novel/research')

      expect(result.success).toBe(true)
      expect(project.sourceFolders).toContain('research')
    })

    it('should prevent duplicate source folders', () => {
      const project = createTestProject()
      project.sourceFolders = ['research']

      const result = manager.addSourceFolder(project, 'projects/novel/research')

      expect(result.success).toBe(false)
      expect(result.error).toContain('already designated')
    })

    it('should prevent folder in both source and content', () => {
      const project = createTestProject()
      project.contentFolders = ['research']

      const result = manager.addSourceFolder(project, 'projects/novel/research')

      expect(result.success).toBe(false)
      expect(result.error).toContain('already designated as content')
    })
  })

  describe('removeContentFolder', () => {
    it('should remove content folder', () => {
      const project = createTestProject()
      project.contentFolders = ['chapters', 'scenes']

      const result = manager.removeContentFolder(project, 'projects/novel/chapters')

      expect(result).toBe(true)
      expect(project.contentFolders).not.toContain('chapters')
      expect(project.contentFolders).toContain('scenes')
    })

    it('should return false if folder not in list', () => {
      const project = createTestProject()

      const result = manager.removeContentFolder(project, 'projects/novel/chapters')

      expect(result).toBe(false)
    })
  })

  describe('removeSourceFolder', () => {
    it('should remove source folder', () => {
      const project = createTestProject()
      project.sourceFolders = ['research', 'notes']

      const result = manager.removeSourceFolder(project, 'projects/novel/research')

      expect(result).toBe(true)
      expect(project.sourceFolders).not.toContain('research')
      expect(project.sourceFolders).toContain('notes')
    })

    it('should return false if folder not in list', () => {
      const project = createTestProject()

      const result = manager.removeSourceFolder(project, 'projects/novel/research')

      expect(result).toBe(false)
    })
  })

  describe('folder type checking', () => {
    it('should identify content folder', () => {
      const project = createTestProject()
      project.contentFolders = ['chapters']

      expect(manager.isContentFolder(project, 'projects/novel/chapters')).toBe(true)
      expect(manager.isSourceFolder(project, 'projects/novel/chapters')).toBe(false)
    })

    it('should identify source folder', () => {
      const project = createTestProject()
      project.sourceFolders = ['research']

      expect(manager.isSourceFolder(project, 'projects/novel/research')).toBe(true)
      expect(manager.isContentFolder(project, 'projects/novel/research')).toBe(false)
    })

    it('should return correct folder type', () => {
      const project = createTestProject()
      project.contentFolders = ['chapters']
      project.sourceFolders = ['research']

      expect(manager.getFolderType(project, 'projects/novel/chapters')).toBe('content')
      expect(manager.getFolderType(project, 'projects/novel/research')).toBe('source')
      expect(manager.getFolderType(project, 'projects/novel/other')).toBe('none')
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
})
