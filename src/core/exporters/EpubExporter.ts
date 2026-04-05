/**
 * EpubExporter — converts a CompiledDocument into an .epub file.
 *
 * Uses `epub-gen-memory` (pure JS, works in Electron/Node).
 * Each Section becomes a separate chapter in the ePub.
 * Markdown is lightly converted to HTML for the ePub content.
 */

import Epub from 'epub-gen-memory'

import type { CompiledDocument, Section } from '../ProjectCompiler'

export interface EpubExportOptions {
  author?: string
  language?: string
  /** CSS string to include in the ePub's stylesheet */
  css?: string
}

// ---------------------------------------------------------------------------
// Minimal Markdown → HTML conversion
// ---------------------------------------------------------------------------

function markdownToHtml(md: string): string {
  const lines = md.split('\n')
  const html: string[] = []
  let inParagraph = false

  const closeParagraph = () => {
    if (inParagraph) {
      html.push('</p>')
      inParagraph = false
    }
  }

  const inlineToHtml = (text: string): string =>
    text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+?)`/g, '<code>$1</code>')

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed === '') {
      closeParagraph()
      continue
    }

    // Headings
    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(trimmed)
    if (headingMatch) {
      closeParagraph()
      const level = headingMatch[1].length
      html.push(`<h${level}>${inlineToHtml(headingMatch[2])}</h${level}>`)
      continue
    }

    // Horizontal rule → scene break
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      closeParagraph()
      html.push('<p class="scene-break">* * *</p>')
      continue
    }

    // Block quote
    if (trimmed.startsWith('> ')) {
      closeParagraph()
      html.push(`<blockquote><p>${inlineToHtml(trimmed.slice(2))}</p></blockquote>`)
      continue
    }

    // List items
    const listMatch = /^[-*+]\s+(.+)$/.exec(trimmed)
    if (listMatch) {
      closeParagraph()
      html.push(`<li>${inlineToHtml(listMatch[1])}</li>`)
      continue
    }

    // Normal paragraph line
    if (!inParagraph) {
      html.push('<p>')
      inParagraph = true
    } else {
      html.push(' ')
    }
    html.push(inlineToHtml(trimmed))
  }

  closeParagraph()
  return html.join('')
}

const DEFAULT_EPUB_CSS = `
body { font-family: serif; font-size: 1em; line-height: 1.6; margin: 0 5%; }
h1 { text-align: center; font-style: italic; font-weight: normal; margin: 3em 0 2em; }
h2 { text-align: center; margin: 2em 0 1em; }
p { text-indent: 1.5em; margin: 0; }
p:first-of-type, h1 + p, h2 + p { text-indent: 0; }
blockquote { margin: 1em 2em; font-style: italic; }
.scene-break { text-align: center; margin: 1.5em 0; text-indent: 0; }
`

// ---------------------------------------------------------------------------
// Exporter
// ---------------------------------------------------------------------------

export class EpubExporter {
  async export(doc: CompiledDocument, options: EpubExportOptions = {}): Promise<Uint8Array> {
    const css = options.css ?? DEFAULT_EPUB_CSS
    const chapters = doc.sections.map((section: Section) => ({
      title: section.title,
      content: markdownToHtml(section.content),
    }))

    // epub-gen-memory: Epub(options, chapters) — chapters are the second argument
    const buffer = await Epub(
      {
        title: doc.projectName,
        author: options.author ?? '',
        lang: options.language ?? 'en',
        css,
      },
      chapters,
    )

    return new Uint8Array(buffer)
  }
}
