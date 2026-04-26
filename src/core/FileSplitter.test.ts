import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FileSplitter } from '@/core/FileSplitter'
import type { ProjectManager } from '@/core/ProjectManager'
import type { Project } from '@/types/types'

import type { App, Editor, TFile, TFolder, Vault, Workspace } from 'obsidian'

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'proj-1',
  name: 'Test Project',
  rootPath: 'projects/novel',
  contentFolders: ['chapters'],
  sourceFolders: ['research'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  fileOrder: ['projects/novel/chapters/ch1.md'],
  ...overrides,
})

const makeFile = (path: string, content = 'content'): TFile => {
  const parent = {
    path: path.split('/').slice(0, -1).join('/'),
    children: [],
    // eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast
  } as unknown as TFolder
  return {
    path,
    name: path.split('/').pop()!,
    basename: path.split('/').pop()!.replace(/\.md$/, ''),
    extension: 'md',
    parent,
    vault: {} as Vault,
    stat: { ctime: 0, mtime: 0, size: content.length },
    // eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast
  } as unknown as TFile
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('FileSplitter', () => {
  let splitter: FileSplitter
  let mockApp: App
  let mockProjectManager: ProjectManager
  let project: Project

  // Named spy references used in expect() calls (avoids unbound-method lint)
  let createSpy: ReturnType<typeof vi.fn>
  let modifySpy: ReturnType<typeof vi.fn>
  let trashFileSpy: ReturnType<typeof vi.fn>
  let readSpy: ReturnType<typeof vi.fn>
  let reorderSpy: ReturnType<typeof vi.fn>
  let getActiveProjectSpy: ReturnType<typeof vi.fn>

  const vaultFiles = new Map<string, string>()

  beforeEach(() => {
    project = makeProject()
    vaultFiles.clear()
    vaultFiles.set('projects/novel/chapters/ch1.md', 'First half content')

    createSpy = vi.fn(async (path: string, content: string) => {
      vaultFiles.set(path, content)
      return makeFile(path, content)
    })
    modifySpy = vi.fn(async (file: TFile, content: string) => {
      vaultFiles.set(file.path, content)
    })
    trashFileSpy = vi.fn(async (file: TFile) => {
      vaultFiles.delete(file.path)
    })
    readSpy = vi.fn(async (file: TFile) => vaultFiles.get(file.path) ?? '')

    const mockVault = {
      getAbstractFileByPath: (path: string) => {
        if (vaultFiles.has(path)) return makeFile(path, vaultFiles.get(path))
        return null
      },
      create: createSpy,
      modify: modifySpy,
      read: readSpy,
    } as unknown as Vault

    const openFileSpy = vi.fn(async () => {})
    const mockLeaf = { openFile: openFileSpy }

    const mockWorkspace = {
      getLeaf: vi.fn(() => mockLeaf),
      getLeavesOfType: vi.fn(() => []),
    } as unknown as Workspace

    const mockFileManager = {
      trashFile: trashFileSpy,
    }

    mockApp = {
      vault: mockVault,
      workspace: mockWorkspace,
      fileManager: mockFileManager,
    } as unknown as App

    getActiveProjectSpy = vi.fn(() => project)
    reorderSpy = vi.fn(async (_id: string, order: string[]) => {
      project = { ...project, fileOrder: order }
    })

    mockProjectManager = {
      getActiveProject: getActiveProjectSpy,
      reorderProjectFiles: reorderSpy,
    } as unknown as ProjectManager

    splitter = new FileSplitter(mockApp, mockProjectManager)
  })

  // ── splitAtCursor ──────────────────────────────────────────────────────────

  describe('splitAtCursor', () => {
    it('splits content at cursor and creates a sibling file', async () => {
      const sourceFile = makeFile('projects/novel/chapters/ch1.md', 'Line 1\nLine 2\nLine 3')
      const setValueSpy = vi.fn()
      const mockEditor = {
        getCursor: vi.fn(() => ({ line: 1, ch: 0 })),
        getValue: vi.fn(() => 'Line 1\nLine 2\nLine 3'),
        setValue: setValueSpy,
      } as unknown as Editor

      await splitter.splitAtCursor(mockEditor, sourceFile)

      expect(setValueSpy).toHaveBeenCalledWith('Line 1')
      expect(createSpy).toHaveBeenCalledWith(
        'projects/novel/chapters/ch1 2.md',
        'Line 2\nLine 3',
      )
    })

    it('inserts the new file immediately after the source in fileOrder', async () => {
      const sourceFile = makeFile('projects/novel/chapters/ch1.md', 'Line 1\nLine 2')
      const mockEditor = {
        getCursor: vi.fn(() => ({ line: 1, ch: 0 })),
        getValue: vi.fn(() => 'Line 1\nLine 2'),
        setValue: vi.fn(),
      } as unknown as Editor

      await splitter.splitAtCursor(mockEditor, sourceFile)

      expect(reorderSpy).toHaveBeenCalledWith('proj-1', [
        'projects/novel/chapters/ch1.md',
        'projects/novel/chapters/ch1 2.md',
      ])
    })

    it('shows a notice and does nothing when cursor is at the end', async () => {
      const sourceFile = makeFile('projects/novel/chapters/ch1.md', 'All content')
      const mockEditor = {
        getCursor: vi.fn(() => ({ line: 1, ch: 0 })),
        getValue: vi.fn(() => 'All content\n'),
        setValue: vi.fn(),
      } as unknown as Editor

      await splitter.splitAtCursor(mockEditor, sourceFile)

      expect(createSpy).not.toHaveBeenCalled()
    })

    it('generates a unique name when the default sibling name is taken', async () => {
      vaultFiles.set('projects/novel/chapters/ch1 2.md', 'existing')

      const sourceFile = makeFile('projects/novel/chapters/ch1.md', 'Line 1\nLine 2')
      const mockEditor = {
        getCursor: vi.fn(() => ({ line: 1, ch: 0 })),
        getValue: vi.fn(() => 'Line 1\nLine 2'),
        setValue: vi.fn(),
      } as unknown as Editor

      await splitter.splitAtCursor(mockEditor, sourceFile)

      expect(createSpy).toHaveBeenCalledWith(
        'projects/novel/chapters/ch1 3.md',
        expect.any(String),
      )
    })
  })

  // ── mergeInto ─────────────────────────────────────────────────────────────

  describe('mergeInto', () => {
    it('appends source content to target with a separator', async () => {
      const sourceFile = makeFile('projects/novel/chapters/ch2.md', 'Second chapter')
      const targetFile = makeFile('projects/novel/chapters/ch1.md', 'First chapter')

      vaultFiles.set(sourceFile.path, 'Second chapter')
      vaultFiles.set(targetFile.path, 'First chapter')

      await splitter.mergeInto(sourceFile, targetFile)

      expect(modifySpy).toHaveBeenCalledWith(
        targetFile,
        'First chapter\n\n---\n\nSecond chapter',
      )
    })

    it('deletes the source file from the vault', async () => {
      const sourceFile = makeFile('projects/novel/chapters/ch2.md', 'Source')
      const targetFile = makeFile('projects/novel/chapters/ch1.md', 'Target')

      vaultFiles.set(sourceFile.path, 'Source')
      vaultFiles.set(targetFile.path, 'Target')

      await splitter.mergeInto(sourceFile, targetFile)

      expect(trashFileSpy).toHaveBeenCalledWith(sourceFile)
    })

    it('removes the source file from fileOrder', async () => {
      project = makeProject({
        fileOrder: ['projects/novel/chapters/ch1.md', 'projects/novel/chapters/ch2.md'],
      })
      getActiveProjectSpy.mockReturnValue(project)

      const sourceFile = makeFile('projects/novel/chapters/ch2.md', 'Source')
      const targetFile = makeFile('projects/novel/chapters/ch1.md', 'Target')

      vaultFiles.set(sourceFile.path, 'Source')
      vaultFiles.set(targetFile.path, 'Target')

      await splitter.mergeInto(sourceFile, targetFile)

      expect(reorderSpy).toHaveBeenCalledWith('proj-1', ['projects/novel/chapters/ch1.md'])
    })

    it('refuses to merge a file into itself', async () => {
      const file = makeFile('projects/novel/chapters/ch1.md', 'Content')
      vaultFiles.set(file.path, 'Content')

      await splitter.mergeInto(file, file)

      expect(modifySpy).not.toHaveBeenCalled()
      expect(trashFileSpy).not.toHaveBeenCalled()
    })
  })
})
