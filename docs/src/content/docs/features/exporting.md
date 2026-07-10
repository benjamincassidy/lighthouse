---
title: Exporting & Compiling
description: Turn a project into a single PDF, DOCX, EPUB, or Markdown document
---

# Exporting & Compiling

Lighthouse compiles a project's files — in your Sheet order — into a single output document, for when it's time to share, print, or submit your work.

## Opening the Export Dialog

- **Command Palette** — `Lighthouse: Export project` (exports the active project)
- **Library** — open the project's "⋯" menu and choose **Export…**

## Formats

| Format | Built with | Notes |
|---|---|---|
| **PDF** | [Typst](https://typst.app/) | Style presets, paper sizes, citations |
| **DOCX** | [Pandoc](https://pandoc.org/) | Style presets, citations, editable in Word/Google Docs |
| **EPUB** | Pandoc | Citations, reflowable e-book format |
| **Markdown** | Built-in | Plain concatenation, no external tools |

PDF export runs entirely offline — Typst is bundled with the plugin, no download required. The first time you export to DOCX or EPUB, Lighthouse downloads the required Pandoc tooling automatically — this needs an internet connection and only happens once.

## Style Presets

PDF and DOCX exports use one of three built-in style presets:

| Style | Details |
|---|---|
| **Novel — Trade** | 5.5 × 8.5 in, Palatino serif, first-line indent, chapter page breaks |
| **Manuscript Standard** | US Letter, 12pt Courier, double-spaced — industry submission format |
| **Academic — A4** | A4, 12pt Times New Roman, 1.5 spacing — for essays, theses, dissertations |

## Paper Size (PDF)

- US Letter (8.5 × 11")
- A4 (210 × 297 mm)
- Trade Paper (5.5 × 8.5")
- A5 (148 × 210 mm)

## Citations

If your project has a **bibliography file** and **citation style** set (in the project editor — see [Projects](/core-concepts/projects/)), PDF, DOCX, and EPUB exports will resolve and format citations automatically. If no bibliography is set, citation markup is stripped instead of left broken.

Ten citation styles are bundled: APA, Chicago (author-date), MLA, Harvard, IEEE, Vancouver, AMA, Nature, Elsevier Harvard, and ACM. You can also download any of the 10,000+ styles from the official CSL repository, or point at a custom `.csl` file, from the project editor.

## Content Options

Available in the export dialog:

- **Strip YAML frontmatter** — remove `---` frontmatter blocks before compiling
- **Convert `[[wiki links]]` to plain text** — resolve wikilinks to their display text
- **Remove `![[embedded file]]` links** — strip embeds rather than trying to inline them
- **Strip `==highlight==` markers** — remove Obsidian's highlight syntax
- **Start chapters on new pages** — page break before each file (PDF/DOCX)
- **Generate table of contents** — auto-generated from headings
- **File separator** — custom text/markup inserted between files; defaults to a sensible page break when "Start chapters on new pages" is enabled and no separator is set

## Output

Choose a **filename** and **output folder** (a native file picker is available), then export. Your last-used settings — format, style, paper size, output folder, and all content options — are remembered per-project and pre-filled next time.

## Related

- [Splitting & Merging Notes](/features/splitting-and-merging/)
- [Projects](/core-concepts/projects/)
