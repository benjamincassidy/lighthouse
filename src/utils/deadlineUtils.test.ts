import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  daysRemaining,
  formatDuration,
  readTime,
  requiredDaily,
  rollingAverage,
  speakTime,
} from './deadlineUtils'

// Fix "today" for deterministic tests
const FIXED_TODAY = '2026-03-31'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(FIXED_TODAY + 'T10:00:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('daysRemaining', () => {
  it('returns 1 when deadline is today', () => {
    expect(daysRemaining(FIXED_TODAY)).toBe(1)
  })

  it('returns correct days for a future deadline', () => {
    // March 31 → April 30: 31 days inclusive
    expect(daysRemaining('2026-04-30')).toBe(31)
  })

  it('returns 0 when deadline has passed', () => {
    expect(daysRemaining('2026-03-30')).toBe(0)
  })

  it('returns 0 for a deadline far in the past', () => {
    expect(daysRemaining('2025-01-01')).toBe(0)
  })
})

describe('requiredDaily', () => {
  it('returns ceil(wordsLeft / daysLeft)', () => {
    expect(requiredDaily(10000, 7)).toBe(1429) // ceil(10000/7)
  })

  it('returns 0 when no days left', () => {
    expect(requiredDaily(5000, 0)).toBe(0)
  })

  it('returns 0 when goal already met', () => {
    expect(requiredDaily(0, 10)).toBe(0)
  })

  it('returns 0 when wordsLeft is negative', () => {
    expect(requiredDaily(-100, 10)).toBe(0)
  })
})

describe('rollingAverage', () => {
  it('returns 0 with undefined dailyWordCounts', () => {
    expect(rollingAverage(undefined)).toBe(0)
  })

  it('returns 0 with empty record', () => {
    expect(rollingAverage({})).toBe(0)
  })

  it('averages over days with entries only', () => {
    // Today is 2026-03-31, so last 7 days: 03-31, 03-30, ..., 03-25
    const counts = {
      '2026-03-31': 500,
      '2026-03-30': 1000,
      '2026-03-29': 0, // 0 should be excluded (not a writing day)
    }
    // Only 2 days with >0: (500 + 1000) / 2 = 750
    expect(rollingAverage(counts, 7)).toBe(750)
  })

  it('respects the days window', () => {
    const counts: Record<string, number> = {}
    for (let i = 0; i < 14; i++) {
      const d = new Date('2026-03-31')
      d.setDate(d.getDate() - i)
      counts[d.toISOString().split('T')[0]] = 100
    }
    // 7-day window: 7 days × 100 words, avg = 100
    expect(rollingAverage(counts, 7)).toBe(100)
    // 14-day window: 14 days × 100 words, avg = 100
    expect(rollingAverage(counts, 14)).toBe(100)
  })
})

describe('readTime', () => {
  it('returns ceil(words / 250)', () => {
    expect(readTime(1000)).toBe(4)
    expect(readTime(1001)).toBe(5)
  })

  it('returns 0 for 0 words', () => {
    expect(readTime(0)).toBe(0)
  })
})

describe('speakTime', () => {
  it('returns ceil(words / 130)', () => {
    expect(speakTime(130)).toBe(1)
    expect(speakTime(131)).toBe(2)
    expect(speakTime(1300)).toBe(10)
  })

  it('returns 0 for 0 words', () => {
    expect(speakTime(0)).toBe(0)
  })
})

describe('formatDuration', () => {
  it('formats minutes only', () => {
    expect(formatDuration(45)).toBe('45m')
  })

  it('formats hours and minutes', () => {
    expect(formatDuration(135)).toBe('2h 15m')
  })

  it('formats exact hours', () => {
    expect(formatDuration(120)).toBe('2h')
  })

  it('returns 0m for 0', () => {
    expect(formatDuration(0)).toBe('0m')
  })
})
