/**
 * ProjectCompiler — format-agnostic compilation of project content files.
 *
 * Reads every content file in the project's fileOrder, applies the requested
 * transforms (strip frontmatter, convert wiki links, etc.), and returns an
 * intermediate CompiledDocument that every exporter consumes.
 *
 * No Obsidian or Electron dependencies — fully unit-testable.
 */

import type { Project } from '@/types/types'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CompileOptions {
  /** Strip YAML `---` frontmatter blocks (default: true) */
  stripFrontmatter: boolean
  /** Convert [[wiki links]] → plain text (default: true) */
  convertWikiLinks: boolean
  /** Remove ![[embed]] links (default: true) */
  stripEmbeds: boolean
  /** Strip ==highlights== markers, keeping text (default: false) */
  stripHighlights: boolean
  /** String to insert between file sections (default: '') */
  fileSeparator: string
}

export const DEFAULT_COMPILE_OPTIONS: CompileOptions = {
  stripFrontmatter: true,
  convertWikiLinks: true,
  stripEmbeds: true,
  stripHighlights: false,
  fileSeparator: '',
}

/**
 * One source file's contribution to the compiled output.
 * Exporters can use sections to split into chapters (ePub) or posts (blog).
 */
export interface Section {
  /** Vault-relative source file path */
  sourceFile: string
  /** Display title: `title` frontmatter key if present, otherwise filename without extension */
  title: string
  /** Processed body text (transforms applied, frontmatter stripped) */
  content: string
  /** Raw frontmatter keys extracted before stripping — useful for metadata in ePub/blog */
  frontmatter: Record<string, unknown>
}

export interface CompiledDocument {
  sections: Section[]
  /** Full text: sections joined with fileSeparator */
  fullText: string
  /** Project metadata snapshot at compile time */
  projectName: string
  compiledAt: string
}

// ---------------------------------------------------------------------------
// Internal helpers (exported for tests)
// ---------------------------------------------------------------------------

export function extractFrontmatter(text: string): {
  frontmatter: Record<string, unknown>
  body: string
} {
  const match = /^---\s*\n([\s\S]*?)\n---\s*\n?/.exec(text)
  if (!match) return { frontmatter: {}, body: text }

  const raw = match[1]
  const body = text.slice(match[0].length)
  const frontmatter: Record<string, unknown> = {}

  // Simple line-by-line YAML key:value parser — handles strings, numbers, booleans.
  // For complex YAML (arrays, nested maps) the raw string is kept as-is.
  for (const line of raw.split('\n')) {
    const kv = /^(\w[\w\s-]*):\s*(.*)$/.exec(line.trim())
    if (!kv) continue
    const [, key, val] = kv
    if (val === 'true') frontmatter[key.trim()] = true
    else if (val === 'false') frontmatter[key.trim()] = false
    else if (!isNaN(Number(val)) && val !== '') frontmatter[key.trim()] = Number(val)
    else frontmatter[key.trim()] = val.replace(/^["']|["']$/g, '')
  }

  return { frontmatter, body }
}

export function convertWikiLinks(text: string): string {
  // [[Target|Alias]] → Alias
  // [[Target]]       → Target
  return text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) =>
    (alias ?? target).trim(),
  )
}

export function stripEmbeds(text: string): string {
  // ![[anything]] → '' (remove the whole token)
  return text.replace(/!\[\[[^\]]*\]\]/g, '')
}

export function stripHighlights(text: string): string {
  // ==text== → text
  return text.replace(/==([^=]+)==/g, '$1')
}

function titleFromPath(filePath: string): string {
  const name = filePath.split('/').pop() ?? filePath
  return name.replace(/\.md$/i, '')
}

// ---------------------------------------------------------------------------
// ProjectCompiler
// ---------------------------------------------------------------------------

/** Injected file-reader — in production: `app.vault.adapter.read`; in tests: a mock. */
export type FileReader = (path: string) => Promise<string>

export class ProjectCompiler {
  constructor(private readFile: FileReader) {}

  /**
   * Compile all content-folder files listed in `filePaths` into a single document.
   * `filePaths` should be ordered (caller resolves from FolderManager + fileOrder).
   */
  async compile(
    project: Project,
    filePaths: string[],
    options: Partial<CompileOptions> = {},
  ): Promise<CompiledDocument> {
    const opts: CompileOptions = { ...DEFAULT_COMPILE_OPTIONS, ...options }
    const sections: Section[] = []

    for (const path of filePaths) {
      let raw: string
      try {
        raw = await this.readFile(path)
      } catch {
        // Skip unreadable files rather than aborting the whole compile
        continue
      }

      const { frontmatter, body } = opts.stripFrontmatter
        ? extractFrontmatter(raw)
        : { frontmatter: {}, body: raw }

      let content = body

      if (opts.convertWikiLinks) content = convertWikiLinks(content)
      if (opts.stripEmbeds) content = stripEmbeds(content)
      if (opts.stripHighlights) content = stripHighlights(content)

      // Trim trailing whitespace from each section
      content = content.trimEnd()

      const title = (frontmatter['title'] as string | undefined) ?? titleFromPath(path)

      sections.push({ sourceFile: path, title, content, frontmatter })
    }

    const fullText = sections.map((s) => s.content).join(buildSeparator(opts.fileSeparator))

    return {
      sections,
      fullText,
      projectName: project.name,
      compiledAt: new Date().toISOString(),
    }
  }
}

function buildSeparator(sep: string): string {
  if (sep === '') return '\n\n'
  return `\n\n${sep}\n\n`
}
