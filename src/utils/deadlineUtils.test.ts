import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  computeStreak,
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

describe('computeStreak', () => {
  // All tests use 2026-04-01 as "today" via the explicit today param
  const TODAY = '2026-04-01'

  it('returns zeros with no data', () => {
    expect(computeStreak(undefined, [], TODAY)).toEqual({ current: 0, longest: 0 })
    expect(computeStreak({}, [], TODAY)).toEqual({ current: 0, longest: 0 })
  })

  it('counts a streak when today has writing', () => {
    const counts = { '2026-04-01': 500, '2026-03-31': 300 }
    const result = computeStreak(counts, [], TODAY)
    expect(result.current).toBe(2)
  })

  it('counts streak from yesterday if today has no writing yet', () => {
    // Today is in progress — no count yet — but yesterday and two days ago had writing
    const counts = { '2026-03-31': 400, '2026-03-30': 600 }
    const result = computeStreak(counts, [], TODAY)
    expect(result.current).toBe(2)
  })

  it('streak resets to 0 when the most recent active day has a gap before it', () => {
    // Wrote Mar 29, nothing Mar 30 or Mar 31, today Apr 1 in-progress
    const counts = { '2026-03-29': 200 }
    const result = computeStreak(counts, [], TODAY)
    expect(result.current).toBe(0)
  })

  it('a rest day keeps the streak alive', () => {
    // Apr 1 (today) writing + Mar 31 rest day + Mar 30 writing
    const counts = { '2026-04-01': 500, '2026-03-30': 400 }
    const daysOff = ['2026-03-31']
    const result = computeStreak(counts, daysOff, TODAY)
    expect(result.current).toBe(3)
  })

  it('a rest day alone (no surrounding writing) counts as a 1-day streak', () => {
    const daysOff = ['2026-03-31']
    // Today has no writing
    const result = computeStreak({}, daysOff, TODAY)
    expect(result.current).toBe(1)
  })

  it('correctly computes longest streak within a longer history', () => {
    // 5-day run Mar 20-24, gap Mar 25, 2-day run Mar 26-27
    const counts: Record<string, number> = {}
    for (const d of ['2026-03-20', '2026-03-21', '2026-03-22', '2026-03-23', '2026-03-24'])
      counts[d] = 300
    for (const d of ['2026-03-26', '2026-03-27']) counts[d] = 300
    const result = computeStreak(counts, [], TODAY)
    expect(result.longest).toBe(5)
    // current: no writing since Mar 27 → 0
    expect(result.current).toBe(0)
  })

  it('longest equals current when streak is still running', () => {
    // 3-day run ending today
    const counts = { '2026-04-01': 100, '2026-03-31': 100, '2026-03-30': 100 }
    const result = computeStreak(counts, [], TODAY)
    expect(result.current).toBe(3)
    expect(result.longest).toBe(3)
  })

  it('returns 0 current when today has no writing and yesterday is a gap', () => {
    // Writing only 3 days ago
    const counts = { '2026-03-29': 500 }
    const result = computeStreak(counts, [], TODAY)
    expect(result.current).toBe(0)
    expect(result.longest).toBe(1)
  })
})
