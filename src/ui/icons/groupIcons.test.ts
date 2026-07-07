import { describe, expect, it } from 'vitest'

import { DEFAULT_GROUP_ICON, getGroupIcon, GROUP_ICONS } from './groupIcons'

describe('getGroupIcon', () => {
  it('returns the matching icon definition for a known ID', () => {
    const people = GROUP_ICONS.find((icon) => icon.id === 'people')
    expect(people).toBeDefined()
    expect(getGroupIcon('people')).toBe(people)
  })

  it('falls back to the default folder icon when the ID is unknown', () => {
    const folder = GROUP_ICONS.find((icon) => icon.id === DEFAULT_GROUP_ICON)
    expect(getGroupIcon('not-a-real-icon')).toBe(folder)
  })

  it('falls back to the default folder icon when undefined', () => {
    const folder = GROUP_ICONS.find((icon) => icon.id === DEFAULT_GROUP_ICON)
    expect(getGroupIcon(undefined)).toBe(folder)
  })

  it('every icon has at least one shape', () => {
    for (const icon of GROUP_ICONS) {
      expect(icon.shapes.length).toBeGreaterThan(0)
    }
  })

  it('every icon id is unique', () => {
    const ids = GROUP_ICONS.map((icon) => icon.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
