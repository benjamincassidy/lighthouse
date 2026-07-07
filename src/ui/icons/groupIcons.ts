/**
 * Curated icon set for Library groups (folders), matching the hand-drawn
 * stroke-icon style already used everywhere else in the app (24x24 viewBox,
 * stroke="currentColor", stroke-width="2", round caps/joins).
 *
 * Icons are modeled as plain shape data (not raw SVG markup) so they can be
 * rendered directly as Svelte template elements, or via Obsidian's `createSvg`
 * DOM helper in plain-TS modals — no `{@html}`/`innerHTML` needed anywhere.
 */
export type IconShape =
  | { type: 'path'; d: string }
  | { type: 'circle'; cx: number; cy: number; r: number }
  | { type: 'rect'; x: number; y: number; width: number; height: number; rx?: number }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { type: 'polygon'; points: string }

export interface GroupIconDef {
  id: string
  label: string
  shapes: IconShape[]
}

export const DEFAULT_GROUP_ICON = 'folder'

export const GROUP_ICONS: GroupIconDef[] = [
  {
    id: 'folder',
    label: 'Folder',
    shapes: [
      {
        type: 'path',
        d: 'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z',
      },
    ],
  },
  {
    id: 'note',
    label: 'Note',
    shapes: [
      { type: 'rect', x: 4, y: 2, width: 16, height: 20, rx: 2 },
      { type: 'line', x1: 8, y1: 8, x2: 16, y2: 8 },
      { type: 'line', x1: 8, y1: 12, x2: 16, y2: 12 },
      { type: 'line', x1: 8, y1: 16, x2: 12, y2: 16 },
    ],
  },
  {
    id: 'people',
    label: 'Characters',
    shapes: [
      { type: 'path', d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' },
      { type: 'circle', cx: 9, cy: 7, r: 4 },
      { type: 'path', d: 'M22 21v-2a4 4 0 0 0-3-3.87' },
      { type: 'path', d: 'M16 3.13a4 4 0 0 1 0 7.75' },
    ],
  },
  {
    id: 'map-pin',
    label: 'Location',
    shapes: [
      { type: 'path', d: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z' },
      { type: 'circle', cx: 12, cy: 10, r: 3 },
    ],
  },
  {
    id: 'rocket',
    label: 'Plot',
    shapes: [
      {
        type: 'path',
        d: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z',
      },
      {
        type: 'path',
        d: 'M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z',
      },
      { type: 'path', d: 'M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0' },
      { type: 'path', d: 'M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5' },
    ],
  },
  {
    id: 'book',
    label: 'Book',
    shapes: [
      { type: 'path', d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20' },
      { type: 'path', d: 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' },
    ],
  },
  {
    id: 'star',
    label: 'Star',
    shapes: [
      {
        type: 'path',
        d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z',
      },
    ],
  },
  {
    id: 'flag',
    label: 'Flag',
    shapes: [
      { type: 'path', d: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z' },
      { type: 'line', x1: 4, y1: 22, x2: 4, y2: 15 },
    ],
  },
  {
    id: 'lightbulb',
    label: 'Idea',
    shapes: [
      { type: 'path', d: 'M15 14c.2-1 .7-1.7 1.5-2.5A5.5 5.5 0 1 0 6 7.5c0 3 1.5 5 2.5 6.5' },
      { type: 'path', d: 'M9 18h6' },
      { type: 'path', d: 'M10 22h4' },
    ],
  },
  {
    id: 'archive',
    label: 'Archive',
    shapes: [
      { type: 'rect', x: 2, y: 4, width: 20, height: 5, rx: 1 },
      { type: 'path', d: 'M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9' },
      { type: 'line', x1: 10, y1: 13, x2: 14, y2: 13 },
    ],
  },
  {
    id: 'message-circle',
    label: 'Notes',
    shapes: [
      {
        type: 'path',
        d: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z',
      },
    ],
  },
  {
    id: 'target',
    label: 'Goal',
    shapes: [
      { type: 'circle', cx: 12, cy: 12, r: 10 },
      { type: 'circle', cx: 12, cy: 12, r: 6 },
      { type: 'circle', cx: 12, cy: 12, r: 2 },
    ],
  },
  {
    id: 'compass',
    label: 'Other',
    shapes: [
      { type: 'circle', cx: 12, cy: 12, r: 10 },
      { type: 'polygon', points: '16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76' },
    ],
  },
]

const ICONS_BY_ID = new Map(GROUP_ICONS.map((icon) => [icon.id, icon]))
const DEFAULT_ICON = ICONS_BY_ID.get(DEFAULT_GROUP_ICON) as GroupIconDef

/** The icon definition for a given ID, falling back to the default folder icon. */
export function getGroupIcon(iconId: string | undefined): GroupIconDef {
  return (iconId && ICONS_BY_ID.get(iconId)) || DEFAULT_ICON
}

/**
 * Build a <svg> element for the given icon inside `container`, using
 * Obsidian's `createSvg` DOM helper — no `innerHTML` involved.
 */
export function renderGroupIconInto(
  container: HTMLElement,
  iconId: string | undefined,
  size = 18,
): SVGSVGElement {
  const icon = getGroupIcon(iconId)
  const svg = container.createSvg('svg', {
    attr: {
      xmlns: 'http://www.w3.org/2000/svg',
      width: String(size),
      height: String(size),
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
  })

  for (const shape of icon.shapes) {
    if (shape.type === 'path') {
      svg.createSvg('path', { attr: { d: shape.d } })
    } else if (shape.type === 'circle') {
      svg.createSvg('circle', {
        attr: { cx: String(shape.cx), cy: String(shape.cy), r: String(shape.r) },
      })
    } else if (shape.type === 'rect') {
      svg.createSvg('rect', {
        attr: {
          x: String(shape.x),
          y: String(shape.y),
          width: String(shape.width),
          height: String(shape.height),
          ...(shape.rx !== undefined ? { rx: String(shape.rx) } : {}),
        },
      })
    } else if (shape.type === 'line') {
      svg.createSvg('line', {
        attr: {
          x1: String(shape.x1),
          y1: String(shape.y1),
          x2: String(shape.x2),
          y2: String(shape.y2),
        },
      })
    } else if (shape.type === 'polygon') {
      svg.createSvg('polygon', { attr: { points: shape.points } })
    }
  }

  return svg
}
