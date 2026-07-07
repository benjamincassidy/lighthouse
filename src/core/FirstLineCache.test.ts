import { describe, expect, it, vi } from 'vitest'

import { extractFirstLine, extractPreview, FirstLineCache } from './FirstLineCache'

import type { TFile, Vault } from 'obsidian'

function createMockFile(path: string, mtime = 0): TFile {
  const name = path.split('/').pop() ?? ''
  return {
    path,
    name,
    basename: name.replace(/\.md$/, ''),
    extension: 'md',
    stat: { ctime: 0, mtime, size: 0 },
    parent: null,
    vault: {} as Vault,
  }
}

describe('extractFirstLine', () => {
  it('returns the first non-empty line', () => {
    expect(extractFirstLine('\n\nHello world\nSecond line')).toBe('Hello world')
  })

  it('skips YAML frontmatter', () => {
    const content = '---\nstatus: draft\n---\n\nFirst real line'
    expect(extractFirstLine(content)).toBe('First real line')
  })

  it('returns an empty string for blank content', () => {
    expect(extractFirstLine('   \n\n  ')).toBe('')
  })
})

describe('extractPreview', () => {
  it('returns the text after the first line, whitespace-collapsed', () => {
    const content = 'Chapter One\n\nThe morning was   quiet.\nToo quiet.'
    expect(extractPreview(content)).toBe('The morning was quiet. Too quiet.')
  })

  it('skips YAML frontmatter before finding the first line', () => {
    const content = '---\nstatus: draft\n---\n\nChapter One\n\nBody text here.'
    expect(extractPreview(content)).toBe('Body text here.')
  })

  it('truncates with an ellipsis past maxLength', () => {
    const body = 'word '.repeat(40).trim()
    const content = `Title\n\n${body}`
    const preview = extractPreview(content, 20)
    expect(preview.endsWith('…')).toBe(true)
    expect(preview.length).toBeLessThanOrEqual(21)
  })

  it('returns an empty string when there is no body text', () => {
    expect(extractPreview('Only a title')).toBe('')
  })
})

describe('FirstLineCache', () => {
  it('reads through the vault on first access', async () => {
    const file = createMockFile('novel/ch1.md')
    const cachedRead = vi.fn().mockResolvedValue('Chapter One\n\nBody text')
    const vault = { cachedRead } as unknown as Vault

    const cache = new FirstLineCache(vault)
    const firstLine = await cache.getFirstLine(file)

    expect(firstLine).toBe('Chapter One')
    expect(cachedRead).toHaveBeenCalledTimes(1)
  })

  it('serves from cache when mtime is unchanged', async () => {
    const file = createMockFile('novel/ch1.md', 100)
    const cachedRead = vi.fn().mockResolvedValue('Chapter One')
    const vault = { cachedRead } as unknown as Vault

    const cache = new FirstLineCache(vault)
    await cache.getFirstLine(file)
    await cache.getFirstLine(file)

    expect(cachedRead).toHaveBeenCalledTimes(1)
  })

  it('re-reads when mtime changes', async () => {
    const file = createMockFile('novel/ch1.md', 100)
    const cachedRead = vi.fn().mockResolvedValue('Chapter One')
    const vault = { cachedRead } as unknown as Vault

    const cache = new FirstLineCache(vault)
    await cache.getFirstLine(file)

    file.stat.mtime = 200
    await cache.getFirstLine(file)

    expect(cachedRead).toHaveBeenCalledTimes(2)
  })

  it('invalidate drops the cached entry', async () => {
    const file = createMockFile('novel/ch1.md', 100)
    const cachedRead = vi.fn().mockResolvedValue('Chapter One')
    const vault = { cachedRead } as unknown as Vault

    const cache = new FirstLineCache(vault)
    await cache.getFirstLine(file)
    cache.invalidate(file.path)
    await cache.getFirstLine(file)

    expect(cachedRead).toHaveBeenCalledTimes(2)
  })

  it('shares one read between getFirstLine and getPreview', async () => {
    const file = createMockFile('novel/ch1.md', 100)
    const cachedRead = vi.fn().mockResolvedValue('Chapter One\n\nBody text here.')
    const vault = { cachedRead } as unknown as Vault

    const cache = new FirstLineCache(vault)
    const firstLine = await cache.getFirstLine(file)
    const preview = await cache.getPreview(file)

    expect(firstLine).toBe('Chapter One')
    expect(preview).toBe('Body text here.')
    expect(cachedRead).toHaveBeenCalledTimes(1)
  })

  it('rename moves the cached entry to the new path without re-reading', async () => {
    const file = createMockFile('novel/ch1.md', 100)
    const cachedRead = vi.fn().mockResolvedValue('Chapter One')
    const vault = { cachedRead } as unknown as Vault

    const cache = new FirstLineCache(vault)
    await cache.getFirstLine(file)

    cache.rename('novel/ch1.md', 'novel/chapter-one.md')
    const renamedFile = createMockFile('novel/chapter-one.md', 100)
    const firstLine = await cache.getFirstLine(renamedFile)

    expect(firstLine).toBe('Chapter One')
    expect(cachedRead).toHaveBeenCalledTimes(1)
  })
})
