import type { TFile, Vault } from 'obsidian'

const DEFAULT_PREVIEW_LENGTH = 120

interface CacheEntry {
  firstLine: string
  preview: string
  mtime: number
}

/**
 * Caches each file's first line (Sheet List row title) and a short body
 * preview snippet (Sheet card preview). Reading this text for every visible
 * row/card on every render would mean re-reading every file in a group each
 * time the Library draws; this cache keeps that to one read per file until
 * its mtime changes.
 */
export class FirstLineCache {
  private vault: Vault
  private cache = new Map<string, CacheEntry>()

  constructor(vault: Vault) {
    this.vault = vault
  }

  async getFirstLine(file: TFile): Promise<string> {
    const entry = await this.getEntry(file)
    return entry.firstLine
  }

  async getPreview(file: TFile): Promise<string> {
    const entry = await this.getEntry(file)
    return entry.preview
  }

  private async getEntry(file: TFile): Promise<CacheEntry> {
    const cached = this.cache.get(file.path)
    if (cached && cached.mtime === file.stat.mtime) {
      return cached
    }

    const content = await this.vault.cachedRead(file)
    const entry: CacheEntry = {
      firstLine: extractFirstLine(content),
      preview: extractPreview(content),
      mtime: file.stat.mtime,
    }
    this.cache.set(file.path, entry)
    return entry
  }

  /** Drop a cached entry, e.g. on vault delete. */
  invalidate(path: string): void {
    this.cache.delete(path)
  }

  /** Move a cached entry to a new key after a rename, without forcing a re-read. */
  rename(oldPath: string, newPath: string): void {
    const entry = this.cache.get(oldPath)
    if (entry) {
      this.cache.delete(oldPath)
      this.cache.set(newPath, entry)
    }
  }
}

/** Strip a leading YAML frontmatter block, if present. */
function stripFrontmatter(content: string): string {
  if (!content.startsWith('---')) return content
  const end = content.indexOf('\n---', 3)
  return end === -1 ? content : content.slice(end + 4)
}

/** First non-empty line of a file's content, skipping YAML frontmatter. */
export function extractFirstLine(content: string): string {
  const text = stripFrontmatter(content)

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.length > 0) {
      return trimmed
    }
  }
  return ''
}

/**
 * Short body-text preview for a Sheet card: everything after the first line,
 * whitespace-collapsed and truncated with an ellipsis.
 */
export function extractPreview(content: string, maxLength = DEFAULT_PREVIEW_LENGTH): string {
  const text = stripFrontmatter(content)
  const lines = text.split('\n')

  let i = 0
  while (i < lines.length && lines[i].trim().length === 0) i++

  const rest = lines
    .slice(i + 1)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (rest.length <= maxLength) return rest
  return `${rest.slice(0, maxLength).trimEnd()}…`
}
