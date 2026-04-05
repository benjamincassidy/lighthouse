/**
 * DocxExporter — converts a CompiledDocument into a .docx file.
 *
 * Uses the `docx` npm package (pure JS, no native dependencies).
 * Each Section in the document becomes a Word section with a page break
 * before it (except the first). Headings, bold, italic, and inline code
 * are mapped to native Word styles.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  PageBreak,
  AlignmentType,
  convertInchesToTwip,
} from 'docx'

import type { CompiledDocument, Section } from '../ProjectCompiler'

export interface DocxExportOptions {
  /** Author name written into the document metadata */
  author?: string
}

// ---------------------------------------------------------------------------
// Inline markdown → TextRun conversion
// ---------------------------------------------------------------------------

interface InlineSpan {
  text: string
  bold?: boolean
  italics?: boolean
  code?: boolean
}

/** Very small inline Markdown parser — handles **bold**, *italic*, `code` */
function parseInline(text: string): InlineSpan[] {
  const spans: InlineSpan[] = []
  // Combined regex: **bold**, *italic*, `code`
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+?)`)/g
  let last = 0
  let m: RegExpExecArray | null

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) spans.push({ text: text.slice(last, m.index) })
    if (m[0].startsWith('**')) spans.push({ text: m[2], bold: true })
    else if (m[0].startsWith('*')) spans.push({ text: m[3], italics: true })
    else spans.push({ text: m[4], code: true })
    last = m.index + m[0].length
  }

  if (last < text.length) spans.push({ text: text.slice(last) })
  return spans
}

function spansToRuns(spans: InlineSpan[]): TextRun[] {
  return spans.map(
    (s) =>
      new TextRun({
        text: s.text,
        bold: s.bold,
        italics: s.italics,
        font: s.code ? 'Courier New' : undefined,
        size: s.code ? 20 : undefined, // 10pt in half-points
      }),
  )
}

// ---------------------------------------------------------------------------
// Markdown block → Paragraph conversion
// ---------------------------------------------------------------------------

function lineToParagraph(line: string, firstInSection: boolean): Paragraph | null {
  // Blank line → skip (Word handles paragraph spacing)
  if (line.trim() === '') return null

  // Headings
  const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line)
  if (headingMatch) {
    const level = ['', 'HEADING_1', 'HEADING_2', 'HEADING_3', 'HEADING_4', 'HEADING_5', 'HEADING_6'][headingMatch[1].length] as keyof typeof HeadingLevel
    return new Paragraph({
      text: headingMatch[2].trim(),
      heading: HeadingLevel[level],
    })
  }

  // Horizontal rule → centred asterisks (scene break convention)
  if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
    return new Paragraph({
      children: [new TextRun({ text: '* * *', italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 240 },
    })
  }

  // Block quote
  if (line.startsWith('> ')) {
    const inner = line.slice(2)
    return new Paragraph({
      children: spansToRuns(parseInline(inner)),
      indent: { left: convertInchesToTwip(0.5) },
      style: 'Quote',
    })
  }

  // List items (unordered + ordered)
  const listMatch = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(line)
  if (listMatch) {
    return new Paragraph({
      children: spansToRuns(parseInline(listMatch[3])),
      bullet: { level: Math.floor(listMatch[1].length / 2) },
    })
  }

  // Normal paragraph — first paragraph in a section has no indent
  return new Paragraph({
    children: spansToRuns(parseInline(line)),
    indent: firstInSection ? undefined : { firstLine: convertInchesToTwip(0.5) },
  })
}

function sectionToParagraphs(section: Section, isFirst: boolean): Paragraph[] {
  const paragraphs: Paragraph[] = []

  // Page break before every section except the first
  if (!isFirst) {
    paragraphs.push(new Paragraph({ children: [new PageBreak()] }))
  }

  const lines = section.content.split('\n')
  let firstNonBlank = true

  for (const line of lines) {
    const para = lineToParagraph(line, firstNonBlank)
    if (para) {
      paragraphs.push(para)
      firstNonBlank = false
    }
  }

  return paragraphs
}

// ---------------------------------------------------------------------------
// Exporter
// ---------------------------------------------------------------------------

export class DocxExporter {
  async export(doc: CompiledDocument, options: DocxExportOptions = {}): Promise<Buffer> {
    const allParagraphs: Paragraph[] = []

    doc.sections.forEach((section, i) => {
      allParagraphs.push(...sectionToParagraphs(section, i === 0))
    })

    const document = new Document({
      creator: options.author ?? '',
      title: doc.projectName,
      description: `Compiled ${doc.compiledAt}`,
      styles: {
        default: {
          document: {
            run: { font: 'Times New Roman', size: 24 }, // 12pt
          },
        },
      },
      sections: [{ children: allParagraphs }],
    })

    return Packer.toBuffer(document)
  }
}
