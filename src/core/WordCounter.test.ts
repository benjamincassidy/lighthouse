import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WordCounter } from '@/core/WordCounter'

import type { TFile, Vault } from 'obsidian'

describe('WordCounter', () => {
  let counter: WordCounter

  beforeEach(() => {
    counter = new WordCounter()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('countText', () => {
    it('should count words in simple text', () => {
      const result = counter.countText('Hello world this is a test')

      expect(result.words).toBe(6)
      expect(result.characters).toBe(26)
      expect(result.charactersNoSpaces).toBe(21)
    })

    it('should handle empty text', () => {
      const result = counter.countText('')

      expect(result.words).toBe(0)
      expect(result.characters).toBe(0)
      expect(result.charactersNoSpaces).toBe(0)
    })

    it('should handle text with multiple spaces', () => {
      const result = counter.countText('Hello    world')

      expect(result.words).toBe(2)
    })

    it('should handle text with newlines', () => {
      const result = counter.countText('Hello\nworld\ntest')

      expect(result.words).toBe(3)
    })

    it('should exclude frontmatter by default', () => {
      const text = `---
title: Test
date: 2024-01-01
---

Hello world this is content`

      const result = counter.countText(text)

      expect(result.words).toBe(5) // Only counts "Hello world this is content"
    })

    it('should include frontmatter when option is false', () => {
      const text = `---
title: Test
date: 2024-01-01
---

Hello world`

      const result = counter.countText(text, { excludeFrontmatter: false })

      expect(result.words).toBeGreaterThan(2) // Includes frontmatter words
    })

    it('should exclude code blocks by default', () => {
      const text = `Hello world

\`\`\`javascript
const x = 1
const y = 2
\`\`\`

More text`

      const result = counter.countText(text)

      expect(result.words).toBe(4) // "Hello world More text"
    })

    it('should include code blocks when option is false', () => {
      const text = `Hello world

\`\`\`javascript
const x = 1
\`\`\`

More text`

      const result = counter.countText(text, { excludeCodeBlocks: false })

      expect(result.words).toBeGreaterThan(4)
    })

    it('should handle inline code when excluded', () => {
      const text = 'This is `inline code` in text'

      const result = counter.countText(text, { excludeInlineCode: true })

      expect(result.words).toBe(4) // "This is in text"
    })

    it('should keep inline code by default', () => {
      const text = 'This is `code` here'

      const result = counter.countText(text, { excludeInlineCode: false })

      expect(result.words).toBe(4) // "This is code here"
    })

    it('should handle markdown links when excluded', () => {
      const text = 'Click [here](http://example.com) for info'

      const result = counter.countText(text, { excludeLinks: true })

      expect(result.words).toBe(4) // "Click here for info"
    })

    it('should handle wiki links when excluded', () => {
      const text = 'See [[Other Note]] for details'

      const result = counter.countText(text, { excludeLinks: true })

      expect(result.words).toBe(5) // "See Other Note for details"
    })

    it('should handle complex markdown document', () => {
      const text = `---
title: My Document
---

# Chapter One

This is a paragraph with **bold** and *italic* text.

\`\`\`typescript
const example = 'code'
\`\`\`

Another paragraph with [a link](http://example.com).

- List item one
- List item two`

      const result = counter.countText(text)

      // Should exclude frontmatter and code block
      // Counts: "Chapter One" + paragraph + link text + list items
      expect(result.words).toBeGreaterThan(15)
      expect(result.words).toBeLessThanOrEqual(25)
    })
  })

  describe('countFile', () => {
    const mockFile: TFile = {
      path: 'test.md',
      name: 'test.md',
      basename: 'test',
      extension: 'md',
      stat: { ctime: 0, mtime: 0, size: 0 },
      vault: {} as Vault,
      parent: null,
    }

    it('should count words in file', () => {
      const content = 'Hello world'

      const result = counter.countFile(mockFile, content)

      expect(result.words).toBe(2)
    })

    it('should count different content correctly', () => {
      const content1 = 'Hello world'
      const content2 = 'Hello world test more'

      const result1 = counter.countFile(mockFile, content1)
      const result2 = counter.countFile(mockFile, content2)

      expect(result1.words).toBe(2)
      expect(result2.words).toBe(4)
    })

    it('should handle multiple files independently', () => {
      const file1: TFile = {
        path: 'file1.md',
        name: 'file1.md',
        basename: 'file1',
        extension: 'md',
        stat: { ctime: 0, mtime: 0, size: 0 },
        vault: {} as Vault,
        parent: null,
      }
      const file2: TFile = {
        path: 'file2.md',
        name: 'file2.md',
        basename: 'file2',
        extension: 'md',
        stat: { ctime: 0, mtime: 0, size: 0 },
        vault: {} as Vault,
        parent: null,
      }

      const result1 = counter.countFile(file1, 'First file content')
      const result2 = counter.countFile(file2, 'Second file')

      expect(result1.words).toBe(3)
      expect(result2.words).toBe(2)
    })
  })

  describe('countFileDebounced', () => {
    const mockFile: TFile = {
      path: 'test.md',
      name: 'test.md',
      basename: 'test',
      extension: 'md',
      stat: { ctime: 0, mtime: 0, size: 0 },
      vault: {} as Vault,
      parent: null,
    }

    it('should debounce word count updates', () => {
      const callback = vi.fn()
      const content = 'Hello world'

      counter.countFileDebounced(mockFile, content, callback)

      // Should not call immediately
      expect(callback).not.toHaveBeenCalled()

      // Fast-forward time
      vi.advanceTimersByTime(300)

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith({
        words: 2,
        characters: 11,
        charactersNoSpaces: 10,
      })
    })

    it('should cancel previous timer on rapid updates', () => {
      const callback = vi.fn()

      counter.countFileDebounced(mockFile, 'First', callback)
      vi.advanceTimersByTime(100)

      counter.countFileDebounced(mockFile, 'Second update', callback)
      vi.advanceTimersByTime(100)

      counter.countFileDebounced(mockFile, 'Third update here', callback)
      vi.advanceTimersByTime(300)

      // Should only call once with final content
      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith({
        words: 3,
        characters: 17,
        charactersNoSpaces: 15,
      })
    })

    it('should handle multiple files independently', () => {
      const file1: TFile = {
        path: 'file1.md',
        name: 'file1.md',
        basename: 'file1',
        extension: 'md',
        stat: { ctime: 0, mtime: 0, size: 0 },
        vault: {} as Vault,
        parent: null,
      }
      const file2: TFile = {
        path: 'file2.md',
        name: 'file2.md',
        basename: 'file2',
        extension: 'md',
        stat: { ctime: 0, mtime: 0, size: 0 },
        vault: {} as Vault,
        parent: null,
      }
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      counter.countFileDebounced(file1, 'File one', callback1)
      counter.countFileDebounced(file2, 'File two', callback2)

      vi.advanceTimersByTime(300)

      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).toHaveBeenCalledTimes(1)
    })
  })

  describe('edge cases', () => {
    it('should handle text with only whitespace', () => {
      const result = counter.countText('   \n\n  \t  ')

      expect(result.words).toBe(0)
      expect(result.characters).toBe(0)
    })

    it('should handle text with special characters', () => {
      const result = counter.countText('Hello! How are you? Fine.')

      expect(result.words).toBe(5)
    })

    it('should handle very long text efficiently', () => {
      const longText = 'word '.repeat(10000)

      const start = Date.now()
      const result = counter.countText(longText)
      const duration = Date.now() - start

      expect(result.words).toBe(10000)
      expect(duration).toBeLessThan(100) // Should be fast
    })

    it('should handle nested code blocks correctly', () => {
      const text = `Text before

\`\`\`markdown
# This is code

const test = 'nested'
\`\`\`

Text after`

      const result = counter.countText(text)

      expect(result.words).toBe(4) // "Text before Text after"
    })

    it('should handle incomplete frontmatter', () => {
      const text = `---
title: Incomplete
no closing ---

Regular content here`

      const result = counter.countText(text)

      // Should not remove incomplete frontmatter
      expect(result.words).toBeGreaterThan(3)
    })
  })
})
