import { beforeEach, describe, expect, it } from 'vitest'

import { FolderManager } from '@/core/FolderManager'
import { HierarchicalCounter } from '@/core/HierarchicalCounter'
import { WordCounter } from '@/core/WordCounter'
import type { Project } from '@/types/types'

import type { App, TFile, TFolder, Vault } from 'obsidian'

describe('HierarchicalCounter', () => {
  let counter: HierarchicalCounter
  let wordCounter: WordCounter
  let folderManager: FolderManager
  let mockVault: Vault

  type MockFile = TFile & { cachedRead?: () => Promise<string> }
  type MockFolder = TFolder

  const createMockFile = (path: string, content: string): MockFile => {
    const name = path.split('/').pop() || ''
    return {
      path,
      name,
      basename: name.replace(/\.md$/, ''),
      extension: 'md',
      stat: { ctime: 0, mtime: 0, size: content.length },
      parent: null,
      vault: mockVault,
      cachedRead: () => Promise.resolve(content),
    }
  }

  const createMockFolder = (
    path: string,
    children: Array<MockFile | MockFolder> = [],
  ): MockFolder => {
    const folder: MockFolder = {
      path,
      name: path.split('/').pop() || '',
      children,
      parent: null,
      vault: mockVault,
      isRoot: () => path === '',
    }

    children.forEach((child) => {
      child.parent = folder
    })

    return folder
  }

  const createTestProject = (): Project => ({
    id: 'test-project',
    name: 'Test Project',
    rootPath: 'projects/novel',
    extrasFolder: 'research',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  beforeEach(() => {
    // Create mock file structure
    const chap1 = createMockFile('projects/novel/chapters/chapter1.md', 'Hello world test content')
    const chap2 = createMockFile('projects/novel/chapters/chapter2.md', 'More test content here')
    const research = createMockFile('projects/novel/research/notes.md', 'Research notes content')

    const chaptersFolder = createMockFolder('projects/novel/chapters', [chap1, chap2])
    const researchFolder = createMockFolder('projects/novel/research', [research])
    const novelFolder = createMockFolder('projects/novel', [chaptersFolder, researchFolder])
    const projectsFolder = createMockFolder('projects', [novelFolder])
    const rootFolder = createMockFolder('', [projectsFolder])

    const fileMap = new Map<string, TFile | TFolder>([
      ['', rootFolder],
      ['projects', projectsFolder],
      ['projects/novel', novelFolder],
      ['projects/novel/chapters', chaptersFolder],
      ['projects/novel/chapters/chapter1.md', chap1],
      ['projects/novel/chapters/chapter2.md', chap2],
      ['projects/novel/research', researchFolder],
      ['projects/novel/research/notes.md', research],
    ])

    mockVault = {
      getAbstractFileByPath: (path: string) => {
        const normalized = path.replace(/^\//, '').replace(/\/$/, '')
        return fileMap.get(normalized) || null
      },
      cachedRead: async (file: TFile) => {
        if ('cachedRead' in file && typeof file.cachedRead === 'function') {
          return await file.cachedRead()
        }
        return ''
      },
      getRoot: () => rootFolder,
      adapter: { constructor: Object },
    } as unknown as Vault

    const mockApp = {
      workspace: {
        getActiveFile: () => null,
      },
    } as unknown as App

    wordCounter = new WordCounter()
    folderManager = new FolderManager(mockVault)
    counter = new HierarchicalCounter(mockVault, wordCounter, folderManager, mockApp)
  })

  describe('countFile', () => {
    it('should count words in a file', async () => {
      const file = createMockFile('test.md', 'Hello world this is a test')
      mockVault.cachedRead = () => Promise.resolve('Hello world this is a test')

      const result = await counter.countFile(file)

      expect(result).toBeDefined()
      expect(result?.words).toBe(6)
    })

    it('should return undefined for non-existent file', async () => {
      const file = createMockFile('missing.md', '')
      mockVault.cachedRead = async () => {
        await Promise.resolve()
        throw new Error('File not found')
      }

      // Suppress console.warn for this expected error
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await counter.countFile(file)

      expect(result).toBeUndefined()
      consoleWarnSpy.mockRestore()
    })
  })

  describe('countFolder', () => {
    it('should count all markdown files in folder', async () => {
      const result = await counter.countFolder('projects/novel/chapters')

      expect(result).toBeDefined()
      expect(result?.fileCount).toBe(2)
      expect(result?.wordCount).toBeGreaterThan(0)
    })

    it('should handle nested folders', async () => {
      const subfolder = createMockFolder('projects/novel/chapters/drafts', [
        createMockFile('projects/novel/chapters/drafts/draft1.md', 'Draft content here'),
      ])

      const chaptersFolder = mockVault.getAbstractFileByPath('projects/novel/chapters')
      if (
        chaptersFolder &&
        'children' in chaptersFolder &&
        Array.isArray(chaptersFolder.children)
      ) {
        ;(chaptersFolder.children as Array<TFile | TFolder>).push(subfolder)
      }

      const result = await counter.countFolder('projects/novel/chapters')

      expect(result).toBeDefined()
      expect(result?.fileCount).toBe(3) // 2 chapters + 1 draft
      expect(result?.children).toHaveLength(1) // subfolder
    })

    it('should return undefined for non-existent folder', async () => {
      const result = await counter.countFolder('nonexistent')

      expect(result).toBeUndefined()
    })
  })

  describe('countProject', () => {
    it('should count everything under rootPath except the Extras folder', async () => {
      const project = createTestProject()

      const result = await counter.countProject(project)

      expect(result.totalFiles).toBe(2) // chapters only, research is Extras
      expect(result.totalWords).toBeGreaterThan(0)
      expect(result.folderStats.has(project.rootPath)).toBe(true)
    })

    it('should count everything when no Extras folder is configured', async () => {
      const project = createTestProject()
      project.extrasFolder = undefined

      const result = await counter.countProject(project)

      expect(result.totalFiles).toBe(3) // 2 chapters + 1 research, nothing excluded
      expect(result.totalWords).toBeGreaterThan(0)
    })

    it('should exclude the Extras subtree while aggregating other sibling folders', async () => {
      const project = createTestProject()

      // Add a sibling "scenes" folder alongside chapters/research
      const scenesFolder = createMockFolder('projects/novel/scenes', [
        createMockFile('projects/novel/scenes/scene1.md', 'Scene one content'),
      ])
      const novelFolder = mockVault.getAbstractFileByPath('projects/novel')
      if (novelFolder && 'children' in novelFolder && Array.isArray(novelFolder.children)) {
        ;(novelFolder.children as Array<TFile | TFolder>).push(scenesFolder)
      }

      const originalGet = mockVault.getAbstractFileByPath.bind(mockVault)
      mockVault.getAbstractFileByPath = (path: string) => {
        if (path === 'projects/novel/scenes') return scenesFolder
        return originalGet(path)
      }

      const result = await counter.countProject(project)

      expect(result.totalFiles).toBe(3) // 2 chapters + 1 scene, research excluded
    })
  })

  describe('hierarchical structure', () => {
    it('should maintain folder hierarchy in stats', async () => {
      const result = await counter.countFolder('projects/novel/chapters')

      expect(result).toBeDefined()
      expect(result?.path).toBe('projects/novel/chapters')
      expect(result?.fileCount).toBeGreaterThan(0)
      expect(result?.wordCount).toBeGreaterThan(0)
    })

    it('should aggregate child folder stats', async () => {
      // Add a subfolder
      const subfolder = createMockFolder('projects/novel/chapters/arc1', [
        createMockFile('projects/novel/chapters/arc1/scene1.md', 'Scene content'),
      ])

      const chaptersFolder = mockVault.getAbstractFileByPath('projects/novel/chapters')
      if (
        chaptersFolder &&
        'children' in chaptersFolder &&
        Array.isArray(chaptersFolder.children)
      ) {
        ;(chaptersFolder.children as Array<TFile | TFolder>).push(subfolder)
      }

      const result = await counter.countFolder('projects/novel/chapters')

      expect(result?.children).toHaveLength(1)
      expect(result?.children[0].path).toBe('projects/novel/chapters/arc1')
      expect(result?.wordCount).toBeGreaterThan(0)
    })
  })

  describe('root vs Extras distinction', () => {
    it('should exclude the Extras folder from the project count', async () => {
      const project = createTestProject()

      const result = await counter.countProject(project)

      // Research exists and is directly countable...
      const researchStats = await counter.countFolder('projects/novel/research')
      expect(researchStats?.fileCount).toBeGreaterThan(0)

      // ...but the project total (Extras excluded) should just be the chapters
      const rootStats = result.folderStats.get(project.rootPath)
      expect(result.totalFiles).toBe(2)
      expect(rootStats?.fileCount).toBe(2)
    })

    it('should allow counting the Extras folder directly', async () => {
      const result = await counter.countFolder('projects/novel/research')

      expect(result).toBeDefined()
      expect(result?.fileCount).toBeGreaterThan(0)
      expect(result?.wordCount).toBeGreaterThan(0)
    })
  })
})
