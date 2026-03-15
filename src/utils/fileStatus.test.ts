import { describe, expect, it } from 'vitest'

import { getStatusColor, STATUS_COLORS } from './fileStatus'

describe('STATUS_COLORS', () => {
  it('contains expected default statuses', () => {
    expect(STATUS_COLORS).toHaveProperty('draft')
    expect(STATUS_COLORS).toHaveProperty('revising')
    expect(STATUS_COLORS).toHaveProperty('done')
  })

  it('maps draft to a red color', () => {
    expect(STATUS_COLORS.draft).toBe('var(--color-red)')
  })

  it('maps revising to a yellow color', () => {
    expect(STATUS_COLORS.revising).toBe('var(--color-yellow)')
  })

  it('maps done to a green color', () => {
    expect(STATUS_COLORS.done).toBe('var(--color-green)')
  })
})

describe('getStatusColor', () => {
  it('returns null for undefined', () => {
    expect(getStatusColor(undefined)).toBeNull()
  })

  it('returns null for null', () => {
    expect(getStatusColor(null)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(getStatusColor('')).toBeNull()
  })

  it('returns red for "draft"', () => {
    expect(getStatusColor('draft')).toBe('var(--color-red)')
  })

  it('returns yellow for "revising"', () => {
    expect(getStatusColor('revising')).toBe('var(--color-yellow)')
  })

  it('returns yellow for "editing"', () => {
    expect(getStatusColor('editing')).toBe('var(--color-yellow)')
  })

  it('returns green for "done"', () => {
    expect(getStatusColor('done')).toBe('var(--color-green)')
  })

  it('returns green for "complete"', () => {
    expect(getStatusColor('complete')).toBe('var(--color-green)')
  })

  it('returns green for "published"', () => {
    expect(getStatusColor('published')).toBe('var(--color-green)')
  })

  it('is case-insensitive', () => {
    expect(getStatusColor('Draft')).toBe('var(--color-red)')
    expect(getStatusColor('DONE')).toBe('var(--color-green)')
    expect(getStatusColor('Revising')).toBe('var(--color-yellow)')
  })

  it('trims whitespace', () => {
    expect(getStatusColor('  draft  ')).toBe('var(--color-red)')
  })

  it('returns --text-faint for unknown statuses', () => {
    expect(getStatusColor('unknown-status')).toBe('var(--text-faint)')
    expect(getStatusColor('wip')).toBe('var(--text-faint)')
  })
})
