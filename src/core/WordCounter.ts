import type { TFile } from 'obsidian'

export interface WordCountResult {
  words: number
  characters: number
  charactersNoSpaces: number
}

/**
 * Options for word counting
 */
export interface WordCountOptions {
  /** Whether to exclude YAML frontmatter */
  excludeFrontmatter?: boolean
  /** Whether to exclude code blocks */
  excludeCodeBlocks?: boolean
  /** Whether to exclude inline code */
  excludeInlineCode?: boolean
  /** Whether to exclude links */
  excludeLinks?: boolean
}

const DEFAULT_OPTIONS: Required<WordCountOptions> = {
  excludeFrontmatter: true,
  excludeCodeBlocks: true,
  excludeInlineCode: false,
  excludeLinks: false,
}

/**
 * WordCounter handles accurate word counting for markdown files
 * with support for excluding frontmatter, code blocks, and other elements
 */
export class WordCounter {
  private debounceTimers: Map<string, NodeJS.Timeout>
  private readonly debounceMs: number

  constructor(debounceMs = 300) {
    this.debounceTimers = new Map()
    this.debounceMs = debounceMs
  }

  /**
   * Count words in a string of text
   */
  countText(text: string, options: WordCountOptions = {}): WordCountResult {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    let processedText = text

    // Remove frontmatter
    if (opts.excludeFrontmatter) {
      processedText = this.removeFrontmatter(processedText)
    }

    // Remove code blocks
    if (opts.excludeCodeBlocks) {
      processedText = this.removeCodeBlocks(processedText)
    }

    // Remove inline code
    if (opts.excludeInlineCode) {
      processedText = this.removeInlineCode(processedText)
    }

    // Remove links (but keep link text)
    if (opts.excludeLinks) {
      processedText = this.removeLinks(processedText)
    }

    return this.calculateCounts(processedText)
  }

  /**
   * Count words in a file
   */
  countFile(_file: TFile, content: string, options: WordCountOptions = {}): WordCountResult {
    return this.countText(content, options)
  }

  /**
   * Count words with debouncing for real-time updates
   */
  countFileDebounced(
    file: TFile,
    content: string,
    callback: (result: WordCountResult) => void,
    options: WordCountOptions = {},
  ): void {
    const cacheKey = file.path

    // Clear existing timer
    const existingTimer = this.debounceTimers.get(cacheKey)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new timer
    const timer = setTimeout(() => {
      const result = this.countFile(file, content, options)
      callback(result)
      this.debounceTimers.delete(cacheKey)
    }, this.debounceMs)

    this.debounceTimers.set(cacheKey, timer)
  }

  /**
   * Remove YAML frontmatter from text
   */
  private removeFrontmatter(text: string): string {
    // Match frontmatter: starts with ---, ends with ---
    const frontmatterRegex = /^---\s*\n[\s\S]*?\n---\s*\n/
    return text.replace(frontmatterRegex, '')
  }

  /**
   * Remove code blocks from text
   */
  private removeCodeBlocks(text: string): string {
    // Match fenced code blocks: ```...```
    const codeBlockRegex = /```[\s\S]*?```/g
    return text.replace(codeBlockRegex, '')
  }

  /**
   * Remove inline code from text
   */
  private removeInlineCode(text: string): string {
    // Match inline code: `...`
    const inlineCodeRegex = /`[^`]*`/g
    return text.replace(inlineCodeRegex, '')
  }

  /**
   * Remove markdown links but keep link text
   */
  private removeLinks(text: string): string {
    // Replace [text](url) with text
    const markdownLinkRegex = /\[([^\]]+)\]\([^)]+\)/g
    text = text.replace(markdownLinkRegex, '$1')

    // Replace [[wikilink]] with wikilink
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g
    text = text.replace(wikiLinkRegex, '$1')

    return text
  }

  /**
   * Calculate word and character counts
   */
  private calculateCounts(text: string): WordCountResult {
    // Remove extra whitespace and trim
    const trimmedText = text.trim()

    // Count characters
    const characters = trimmedText.length
    const charactersNoSpaces = trimmedText.replace(/\s/g, '').length

    // Count words: split by whitespace, filter empty strings
    const words = trimmedText.split(/\s+/).filter((word) => word.length > 0).length

    return {
      words,
      characters,
      charactersNoSpaces,
    }
  }
}
