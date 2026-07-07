import { describe, expect, it } from 'vitest'

import { deriveSheetTitle } from './sheetTitle'

describe('deriveSheetTitle', () => {
  it('uses the first line, trimmed', () => {
    expect(deriveSheetTitle('  Chapter One  ', 'ch1')).toBe('Chapter One')
  })

  it('strips a leading heading marker', () => {
    expect(deriveSheetTitle('## Chapter One', 'ch1')).toBe('Chapter One')
  })

  it('strips a leading list marker', () => {
    expect(deriveSheetTitle('- Chapter One', 'ch1')).toBe('Chapter One')
  })

  it('strips a leading blockquote marker', () => {
    expect(deriveSheetTitle('> Chapter One', 'ch1')).toBe('Chapter One')
  })

  it('falls back to the filename when the first line is blank', () => {
    expect(deriveSheetTitle('   ', 'Untitled')).toBe('Untitled')
  })

  it('falls back to the filename when firstLine is undefined', () => {
    expect(deriveSheetTitle(undefined, 'Untitled')).toBe('Untitled')
  })

  it('falls back to the filename when stripping leaves nothing', () => {
    expect(deriveSheetTitle('# ', 'Untitled')).toBe('Untitled')
  })
})
