import { describe, expect, it } from 'vitest'

import { clampPercent, roundCurrency } from '../../../src/lib/pricing'

describe('roundCurrency (round-half-up to 2 decimals)', () => {
  it('rounds a clean half-cent up', () => {
    expect(roundCurrency(1.005)).toBe(1.01)
  })

  it('corrects the classic IEEE-754 representation error for 1.005', () => {
    // 1.005 is stored as ~1.00499999999999989 in binary floating point; a naive
    // Math.round(1.005 * 100) / 100 yields 1.00. The Number.EPSILON nudge fixes this.
    expect(Math.round(1.005 * 100) / 100).toBe(1) // documents the naive-approach bug
    expect(roundCurrency(1.005)).toBe(1.01) // the engine's helper corrects it
  })

  it('collapses float drift from 99.99 * 3 back to an exact 2-decimal amount', () => {
    const drifted = 99.99 * 3 // 299.97000000000003 in IEEE-754
    expect(roundCurrency(drifted)).toBe(299.97)
  })

  it('leaves an already-exact 2-decimal amount unchanged', () => {
    expect(roundCurrency(160)).toBe(160)
    expect(roundCurrency(136.5)).toBe(136.5)
  })

  it('rounds down when the third decimal is below 5', () => {
    expect(roundCurrency(26.994)).toBe(26.99)
  })

  it('rounds up when the third decimal is 5 or above', () => {
    expect(roundCurrency(26.995)).toBe(27)
    expect(roundCurrency(26.997)).toBe(27)
  })

  it('handles zero', () => {
    expect(roundCurrency(0)).toBe(0)
  })
})

describe('clampPercent', () => {
  it('passes values already inside [0, 100] through unchanged', () => {
    expect(clampPercent(0)).toBe(0)
    expect(clampPercent(10)).toBe(10)
    expect(clampPercent(100)).toBe(100)
  })

  it('clamps negative values up to 0', () => {
    expect(clampPercent(-15)).toBe(0)
  })

  it('clamps values above 100 down to 100 (defends the never-negative-total invariant against misconfiguration)', () => {
    expect(clampPercent(150)).toBe(100)
  })
})
