/**
 * Export style registry.
 *
 * Built-in styles are embedded as string constants so the plugin bundles them
 * without needing to load files from disk at runtime.
 *
 * Each ExportStyle carries:
 *   - id / name / description
 *   - css: the full @media print stylesheet
 *   - previewSvg: an inline SVG thumbnail shown in the style gallery
 *   - builtIn: true for bundled styles; false for user styles loaded from vault
 */

// ---------------------------------------------------------------------------
// CSS strings (embedded at build time via esbuild text loader)
// ---------------------------------------------------------------------------

// Raw imports handled by the text loader configured in esbuild.config.mjs
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import novelTradeCss from './styles/novel-trade.css'
// @ts-ignore
import manuscriptStandardCss from './styles/manuscript-standard.css'
// @ts-ignore
import academicA4Css from './styles/academic-a4.css'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExportStyle {
  id: string
  name: string
  description: string
  pageSize: string
  css: string
  /** Inline SVG data URI used in the gallery thumbnail */
  previewSvg: string
  builtIn: boolean
}

// ---------------------------------------------------------------------------
// SVG thumbnail helpers
// The thumbnails are simple typographic previews — they show mock text lines
// at the style's characteristic font/spacing to give the user a clear visual
// cue without requiring a full rendered screenshot.
// ---------------------------------------------------------------------------

function makeThumbnail(opts: {
  fontFamily: string
  fontSize: number
  lineHeight: number
  indent: number
  headingStyle: 'italic-center' | 'bold-center' | 'bold-left'
  sceneBreak: string
  bgColor?: string
  textColor?: string
}): string {
  const {
    fontFamily,
    fontSize,
    lineHeight,
    indent,
    headingStyle,
    sceneBreak,
    bgColor = '#fff',
    textColor = '#222',
  } = opts

  const lh = lineHeight * fontSize
  // Portrait page dimensions (coordiniate units, scaled via viewBox)
  const w = 160
  const h = 220
  const pad = 13
  const textW = w - pad * 2

  let y = pad + fontSize + 2

  const els: string[] = []

  const addText = (
    text: string,
    x: number,
    anchor: string,
    attrs: string,
    size: number,
    dy: number,
  ) => {
    els.push(
      `<text x="${x}" y="${y}" font-family="${fontFamily}" font-size="${size}" fill="${textColor}" text-anchor="${anchor}" ${attrs}>${text}</text>`,
    )
    y += dy
  }

  // Grey rectangle representing one line of body text
  const textRect = (lineWidth: number, indented: boolean) => {
    const rx = pad + (indented ? indent : 0)
    els.push(
      `<rect x="${rx}" y="${Math.round(y - fontSize * 0.78)}" width="${lineWidth}" height="${Math.round(fontSize * 0.6)}" rx="1" fill="#bbb" opacity="0.7"/>`,
    )
    y += lh
  }

  // Heading
  const headingX = headingStyle === 'bold-left' ? pad : w / 2
  const headingAnchor = headingStyle === 'bold-left' ? 'start' : 'middle'
  const headingAttrs =
    headingStyle === 'italic-center'
      ? 'font-style="italic" font-weight="normal"'
      : 'font-style="normal" font-weight="bold"'

  addText('Chapter One', headingX, headingAnchor, headingAttrs, fontSize + 1, Math.round(lh * 2.0))

  // First paragraph — 4 lines (last one short)
  const hasIndent = indent > 0
  textRect(Math.round(textW * 0.94 - (hasIndent ? indent : 0)), hasIndent)
  textRect(Math.round(textW * 0.98), false)
  textRect(Math.round(textW * 0.91), false)
  textRect(Math.round(textW * 0.52), false)

  // Scene break
  y += Math.round(lh * 0.3)
  addText(sceneBreak, w / 2, 'middle', '', fontSize - 1, Math.round(lh * 1.5))

  // Second paragraph — 3 lines
  textRect(Math.round(textW * 0.93 - (hasIndent ? indent : 0)), hasIndent)
  textRect(Math.round(textW * 0.95), false)
  textRect(Math.round(textW * 0.65), false)

  // Return raw SVG with width/height="100%" so it scales to its container.
  // Using viewBox to preserve the coordinate system.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${bgColor}" rx="3"/>
  ${els.join('\n  ')}
</svg>`
}

// ---------------------------------------------------------------------------
// Built-in styles
// ---------------------------------------------------------------------------

export const BUILT_IN_STYLES: ExportStyle[] = [
  {
    id: 'novel-trade',
    name: 'Novel — Trade',
    description: '5.5 × 8.5 in, Palatino serif, first-line indent, chapter page breaks',
    pageSize: '5.5 × 8.5 in',
    css: novelTradeCss as string,
    builtIn: true,
    previewSvg: makeThumbnail({
      fontFamily: 'Palatino, serif',
      fontSize: 9,
      lineHeight: 1.6,
      indent: 14,
      headingStyle: 'italic-center',
      sceneBreak: '* * *',
    }),
  },
  {
    id: 'manuscript-standard',
    name: 'Manuscript Standard',
    description: 'US Letter, 12pt Courier, double-spaced — industry submission format',
    pageSize: 'US Letter',
    css: manuscriptStandardCss as string,
    builtIn: true,
    previewSvg: makeThumbnail({
      fontFamily: 'Courier New, monospace',
      fontSize: 8,
      lineHeight: 2,
      indent: 20,
      headingStyle: 'bold-center',
      sceneBreak: '#',
    }),
  },
  {
    id: 'academic-a4',
    name: 'Academic — A4',
    description: 'A4, 12pt Times New Roman, 1.5 spacing — for essays, theses, dissertations',
    pageSize: 'A4',
    css: academicA4Css as string,
    builtIn: true,
    previewSvg: makeThumbnail({
      fontFamily: 'Times New Roman, serif',
      fontSize: 9,
      lineHeight: 1.5,
      indent: 0,
      headingStyle: 'bold-left',
      sceneBreak: '— — —',
    }),
  },
]

/**
 * Strip `@media print { ... }` wrapper so that the CSS renders on-screen
 * inside the export modal preview container.
 */
export function cssForScreenPreview(css: string): string {
  return css
    .replace(/@media\s+print\s*\{([\s\S]*)\}\s*$/, '$1')
    .replace(/@page[^{]*\{[^}]*\}/g, '')
    .trim()
}

/**
 * Scope all selectors in a CSS string from `.markdown-preview-view …`
 * to `.lh-export-preview …` for use inside the modal iframe.
 */
export function scopePreviewCss(css: string): string {
  return css.replace(/\.markdown-preview-view/g, '.lh-export-preview')
}
