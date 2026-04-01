import { describe, expect, it } from 'vitest'

import { calcGoalPercent } from './goalProgress'

describe('calcGoalPercent', () => {
  it('returns 0 when goal is zero', () => {
    expect(calcGoalPercent(500, 0)).toBe(0)
  })

  it('returns 0 when goal is negative', () => {
    expect(calcGoalPercent(500, -100)).toBe(0)
  })

  it('returns 0 when word count is 0', () => {
    expect(calcGoalPercent(0, 1000)).toBe(0)
  })

  it('returns correct fraction at midpoint', () => {
    expect(calcGoalPercent(500, 1000)).toBe(0.5)
  })

  it('returns 1 when word count equals goal', () => {
    expect(calcGoalPercent(1000, 1000)).toBe(1)
  })

  it('clamps to 1 when word count exceeds goal', () => {
    expect(calcGoalPercent(1500, 1000)).toBe(1)
  })

  it('handles non-round numbers', () => {
    expect(calcGoalPercent(333, 1000)).toBeCloseTo(0.333)
  })
})
