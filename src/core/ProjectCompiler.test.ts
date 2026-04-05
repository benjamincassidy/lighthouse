import { describe, it, expect } from 'vitest'

import type { Project } from '@/types/types'

import {
  ProjectCompiler,
  extractFrontmatter,
  convertWikiLinks,
  stripEmbeds,
  stripHighlights,
  DEFAULT_COMPILE_OPTIONS,
} from './ProjectCompiler'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'test-id',
    name: 'Test Project',
    rootPath: 'Writing/Novel',
    contentFolders: ['Chapters'],
    sourceFolders: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  }
}

function makeCompiler(files: Record<string, string>): ProjectCompiler {
  return new ProjectCompiler(async (path) => {
    if (path in files) return files[path]
    throw new Error(`File not found: ${path}`)
  })
}

// ---------------------------------------------------------------------------
// extractFrontmatter
// ---------------------------------------------------------------------------

describe('extractFrontmatter', () => {
  it('returns empty frontmatter when there is none', () => {
    const { frontmatter, body } = extractFrontmatter('Hello world')
    expect(frontmatter).toEqual({})
    expect(body).toBe('Hello world')
  })

  it('strips frontmatter block', () => {
    const text = '---\ntitle: My Chapter\n---\nBody text here'
    const { frontmatter, body } = extractFrontmatter(text)
    expect(frontmatter.title).toBe('My Chapter')
    expect(body).toBe('Body text here')
  })

  it('parses boolean values', () => {
    const { frontmatter } = extractFrontmatter('---\npublished: true\ndraft: false\n---\n')
    expect(frontmatter.published).toBe(true)
    expect(frontmatter.draft).toBe(false)
  })

  it('parses numeric values', () => {
    const { frontmatter } = extractFrontmatter('---\nchapter: 3\nwords: 1200\n---\n')
    expect(frontmatter.chapter).toBe(3)
    expect(frontmatter.words).toBe(1200)
  })

  it('strips surrounding quotes from string values', () => {
    const { frontmatter } = extractFrontmatter('---\ntitle: "Quoted Title"\n---\n')
    expect(frontmatter.title).toBe('Quoted Title')
  })

  it('handles missing trailing newline after closing ---', () => {
    const text = '---\ntitle: Test\n---'
    const { frontmatter } = extractFrontmatter(text)
    expect(frontmatter.title).toBe('Test')
  })
})

// ---------------------------------------------------------------------------
// convertWikiLinks
// ---------------------------------------------------------------------------

describe('convertWikiLinks', () => {
  it('converts bare [[Target]] to Target', () => {
    expect(convertWikiLinks('See [[Chapter One]] for details')).toBe('See Chapter One for details')
  })

  it('uses alias when present', () => {
    expect(convertWikiLinks('Read [[Chapter One|here]]')).toBe('Read here')
  })

  it('handles multiple links in one string', () => {
    expect(convertWikiLinks('[[A]] and [[B|bee]]')).toBe('A and bee')
  })

  it('leaves normal markdown links untouched', () => {
    const text = '[normal link](https://example.com)'
    expect(convertWikiLinks(text)).toBe(text)
  })

  it('trims whitespace inside aliases', () => {
    expect(convertWikiLinks('[[Target| spaced ]]')).toBe('spaced')
  })
})

// ---------------------------------------------------------------------------
// stripEmbeds
// ---------------------------------------------------------------------------

describe('stripEmbeds', () => {
  it('removes ![[embed]] tokens', () => {
    expect(stripEmbeds('Before ![[image.png]] after')).toBe('Before  after')
  })

  it('removes multiple embeds', () => {
    expect(stripEmbeds('A ![[one]] B ![[two.png]] C')).toBe('A  B  C')
  })

  it('leaves regular wiki links untouched', () => {
    const text = '[[Chapter One]]'
    expect(stripEmbeds(text)).toBe(text)
  })
})

// ---------------------------------------------------------------------------
// stripHighlights
// ---------------------------------------------------------------------------

describe('stripHighlights', () => {
  it('removes == markers but keeps text', () => {
    expect(stripHighlights('This is ==highlighted== text')).toBe('This is highlighted text')
  })

  it('handles multiple highlights', () => {
    expect(stripHighlights('==a== and ==b==')).toBe('a and b')
  })

  it('leaves single = untouched', () => {
    const text = 'x = 1'
    expect(stripHighlights(text)).toBe(text)
  })
})

// ---------------------------------------------------------------------------
// ProjectCompiler.compile
// ---------------------------------------------------------------------------

describe('ProjectCompiler', () => {
  const project = makeProject()

  it('compiles a single file into one section', async () => {
    const compiler = makeCompiler({ 'Chapters/01.md': 'It was a dark and stormy night.' })
    const doc = await compiler.compile(project, ['Chapters/01.md'])
    expect(doc.sections).toHaveLength(1)
    expect(doc.sections[0].content).toBe('It was a dark and stormy night.')
    expect(doc.projectName).toBe('Test Project')
  })

  it('joins multiple files with double newline when separator is empty', async () => {
    const compiler = makeCompiler({
      'Ch/01.md': 'First chapter.',
      'Ch/02.md': 'Second chapter.',
    })
    const doc = await compiler.compile(project, ['Ch/01.md', 'Ch/02.md'])
    expect(doc.fullText).toBe('First chapter.\n\nSecond chapter.')
  })

  it('inserts custom separator between sections', async () => {
    const compiler = makeCompiler({
      'Ch/01.md': 'A',
      'Ch/02.md': 'B',
    })
    const doc = await compiler.compile(project, ['Ch/01.md', 'Ch/02.md'], {
      fileSeparator: '---',
    })
    expect(doc.fullText).toBe('A\n\n---\n\nB')
  })

  it('strips frontmatter and uses title key for section title', async () => {
    const compiler = makeCompiler({
      'Ch/01.md': '---\ntitle: The Beginning\nstatus: draft\n---\nOnce upon a time.',
    })
    const doc = await compiler.compile(project, ['Ch/01.md'])
    expect(doc.sections[0].title).toBe('The Beginning')
    expect(doc.sections[0].frontmatter.status).toBe('draft')
    expect(doc.sections[0].content).toBe('Once upon a time.')
  })

  it('falls back to filename when frontmatter has no title', async () => {
    const compiler = makeCompiler({ 'Ch/01-opening.md': 'Text' })
    const doc = await compiler.compile(project, ['Ch/01-opening.md'])
    expect(doc.sections[0].title).toBe('01-opening')
  })

  it('converts wiki links when convertWikiLinks is true', async () => {
    const compiler = makeCompiler({ 'Ch/01.md': 'See [[Chapter Two]] for more.' })
    const doc = await compiler.compile(project, ['Ch/01.md'])
    expect(doc.sections[0].content).toBe('See Chapter Two for more.')
  })

  it('leaves wiki links intact when convertWikiLinks is false', async () => {
    const compiler = makeCompiler({ 'Ch/01.md': 'See [[Chapter Two]]' })
    const doc = await compiler.compile(project, ['Ch/01.md'], { convertWikiLinks: false })
    expect(doc.sections[0].content).toContain('[[Chapter Two]]')
  })

  it('strips embeds by default', async () => {
    const compiler = makeCompiler({ 'Ch/01.md': 'Text ![[image.png]] more text' })
    const doc = await compiler.compile(project, ['Ch/01.md'])
    expect(doc.sections[0].content).not.toContain('![[')
  })

  it('does not strip highlights by default', async () => {
    const compiler = makeCompiler({ 'Ch/01.md': 'This is ==important==' })
    const doc = await compiler.compile(project, ['Ch/01.md'])
    expect(doc.sections[0].content).toContain('==important==')
  })

  it('strips highlights when option is enabled', async () => {
    const compiler = makeCompiler({ 'Ch/01.md': 'This is ==important==' })
    const doc = await compiler.compile(project, ['Ch/01.md'], { stripHighlights: true })
    expect(doc.sections[0].content).toBe('This is important')
  })

  it('skips unreadable files without aborting', async () => {
    const compiler = makeCompiler({ 'Ch/01.md': 'Good file' })
    // 'Ch/missing.md' will throw
    const doc = await compiler.compile(project, ['Ch/01.md', 'Ch/missing.md'])
    expect(doc.sections).toHaveLength(1)
    expect(doc.sections[0].content).toBe('Good file')
  })

  it('does not strip frontmatter when stripFrontmatter is false', async () => {
    const compiler = makeCompiler({
      'Ch/01.md': '---\ntitle: Test\n---\nBody',
    })
    const doc = await compiler.compile(project, ['Ch/01.md'], { stripFrontmatter: false })
    expect(doc.sections[0].content).toContain('---')
    expect(doc.sections[0].frontmatter).toEqual({})
  })

  it('trims trailing whitespace from each section', async () => {
    const compiler = makeCompiler({ 'Ch/01.md': 'Text   \n\n' })
    const doc = await compiler.compile(project, ['Ch/01.md'])
    expect(doc.sections[0].content).toBe('Text')
  })

  it('exposes default compile options', () => {
    expect(DEFAULT_COMPILE_OPTIONS.stripFrontmatter).toBe(true)
    expect(DEFAULT_COMPILE_OPTIONS.convertWikiLinks).toBe(true)
    expect(DEFAULT_COMPILE_OPTIONS.fileSeparator).toBe('')
  })
})
