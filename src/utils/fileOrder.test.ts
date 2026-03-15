import { describe, expect, it } from 'vitest'

import { reorderPaths, sortByFileOrder } from './fileOrder'

describe('sortByFileOrder', () => {
  const items = [
    { path: 'novel/ch1.md', name: 'ch1.md', type: 'file' as const },
    { path: 'novel/ch2.md', name: 'ch2.md', type: 'file' as const },
    { path: 'novel/ch3.md', name: 'ch3.md', type: 'file' as const },
  ]

  it('returns folders-first alphabetical order when fileOrder is empty', () => {
    const mixed = [
      { path: 'novel/z-file.md', name: 'z-file.md', type: 'file' as const },
      { path: 'novel/a-folder', name: 'a-folder', type: 'folder' as const },
      { path: 'novel/a-file.md', name: 'a-file.md', type: 'file' as const },
    ]
    const result = sortByFileOrder(mixed, [])
    expect(result[0].type).toBe('folder')
    expect(result[1].name).toBe('a-file.md')
    expect(result[2].name).toBe('z-file.md')
  })

  it('sorts items by their position in fileOrder', () => {
    const order = ['novel/ch3.md', 'novel/ch1.md', 'novel/ch2.md']
    const result = sortByFileOrder(items, order)
    expect(result.map((i) => i.path)).toEqual(['novel/ch3.md', 'novel/ch1.md', 'novel/ch2.md'])
  })

  it('puts ordered items before unordered items', () => {
    const order = ['novel/ch3.md']
    const result = sortByFileOrder(items, order)
    expect(result[0].path).toBe('novel/ch3.md')
  })

  it('sorts unordered items alphabetically after ordered items', () => {
    const order = ['novel/ch2.md']
    const result = sortByFileOrder(items, order)
    expect(result.map((i) => i.path)).toEqual(['novel/ch2.md', 'novel/ch1.md', 'novel/ch3.md'])
  })

  it('does not mutate the input array', () => {
    const original = items.map((i) => ({ ...i }))
    sortByFileOrder(items, ['novel/ch3.md', 'novel/ch1.md', 'novel/ch2.md'])
    expect(items).toEqual(original)
  })

  it('handles an empty items array', () => {
    expect(sortByFileOrder([], ['novel/ch1.md'])).toEqual([])
  })
})

describe('reorderPaths', () => {
  const all = ['a', 'b', 'c', 'd']

  it('moves item before target', () => {
    const result = reorderPaths(['a', 'b', 'c', 'd'], all, 'c', 'a', 'before')
    expect(result).toEqual(['c', 'a', 'b', 'd'])
  })

  it('moves item after target', () => {
    const result = reorderPaths(['a', 'b', 'c', 'd'], all, 'a', 'c', 'after')
    expect(result).toEqual(['b', 'c', 'a', 'd'])
  })

  it('moves item to the beginning', () => {
    const result = reorderPaths(['a', 'b', 'c', 'd'], all, 'd', 'a', 'before')
    expect(result).toEqual(['d', 'a', 'b', 'c'])
  })

  it('moves item to the end', () => {
    const result = reorderPaths(['a', 'b', 'c', 'd'], all, 'a', 'd', 'after')
    expect(result).toEqual(['b', 'c', 'd', 'a'])
  })

  it('appends unregistered paths before computing the move', () => {
    // 'c' is in allPaths but not yet in order
    const result = reorderPaths(['a', 'b'], ['a', 'b', 'c'], 'c', 'a', 'after')
    expect(result).toEqual(['a', 'c', 'b'])
  })

  it('appends dragged item at end when target path is not found', () => {
    const result = reorderPaths(['a', 'b', 'c'], ['a', 'b', 'c', 'd'], 'd', 'z', 'before')
    expect(result).toEqual(['a', 'b', 'c', 'd'])
  })

  it('does not mutate the input arrays', () => {
    const order = ['a', 'b', 'c', 'd']
    const snapshot = [...order]
    reorderPaths(order, all, 'c', 'a', 'before')
    expect(order).toEqual(snapshot)
  })
})
