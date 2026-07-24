import { describe, expect, it } from 'vitest'

import { isWindowActive, selectActiveWindow } from '../../../src/lib/pricing'

const EB = { price: 100, startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-01-31T23:59:59.999Z' }
const STD = { price: 150, startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-02-28T23:59:59.999Z' }

describe('isWindowActive', () => {
  it('is active when now falls strictly inside the window', () => {
    expect(isWindowActive(EB, new Date('2026-01-15T00:00:00.000Z'))).toBe(true)
  })

  it('is active at the exact start instant (inclusive lower bound)', () => {
    expect(isWindowActive(EB, new Date('2026-01-01T00:00:00.000Z'))).toBe(true)
  })

  it('is active at the exact end instant (inclusive upper bound)', () => {
    expect(isWindowActive(EB, new Date('2026-01-31T23:59:59.999Z'))).toBe(true)
  })

  it('is inactive 1ms before the start instant', () => {
    expect(isWindowActive(EB, new Date('2025-12-31T23:59:59.999Z'))).toBe(false)
  })

  it('is inactive 1ms after the end instant', () => {
    expect(isWindowActive(EB, new Date('2026-02-01T00:00:00.000Z'))).toBe(false)
  })

  it('is inactive when the window is undefined', () => {
    expect(isWindowActive(undefined, new Date('2026-01-15T00:00:00.000Z'))).toBe(false)
  })

  it('is inactive when the window is null', () => {
    expect(isWindowActive(null, new Date('2026-01-15T00:00:00.000Z'))).toBe(false)
  })

  it('is inactive when price is missing even though dates are configured (partial window)', () => {
    const noPrice = { price: undefined, startDate: EB.startDate, endDate: EB.endDate }
    expect(isWindowActive(noPrice, new Date('2026-01-15T00:00:00.000Z'))).toBe(false)
  })

  it('is inactive when startDate is missing (partial window)', () => {
    const noStart = { price: 100, startDate: undefined, endDate: EB.endDate }
    expect(isWindowActive(noStart, new Date('2026-01-15T00:00:00.000Z'))).toBe(false)
  })

  it('is inactive when endDate is missing (partial window)', () => {
    const noEnd = { price: 100, startDate: EB.startDate, endDate: undefined }
    expect(isWindowActive(noEnd, new Date('2026-01-15T00:00:00.000Z'))).toBe(false)
  })

  it('is inactive when price is negative (malformed data)', () => {
    const negativePrice = { price: -5, startDate: EB.startDate, endDate: EB.endDate }
    expect(isWindowActive(negativePrice, new Date('2026-01-15T00:00:00.000Z'))).toBe(false)
  })
})

describe('selectActiveWindow', () => {
  it('picks Early Bird when only Early Bird is active', () => {
    expect(selectActiveWindow({ earlyBird: EB }, new Date('2026-01-15T00:00:00.000Z'))).toEqual({
      appliedWindow: 'earlyBird',
      price: 100,
    })
  })

  it('picks Standard when only Standard is active', () => {
    expect(selectActiveWindow({ standard: STD }, new Date('2026-02-15T00:00:00.000Z'))).toEqual({
      appliedWindow: 'standard',
      price: 150,
    })
  })

  it('picks Early Bird over Standard when BOTH are configured and both happen to be active', () => {
    expect(selectActiveWindow({ earlyBird: EB, standard: STD }, new Date('2026-01-15T00:00:00.000Z'))).toEqual({
      appliedWindow: 'earlyBird',
      price: 100,
    })
  })

  it('falls back to Standard once Early Bird has ended, when both are configured', () => {
    expect(selectActiveWindow({ earlyBird: EB, standard: STD }, new Date('2026-02-15T00:00:00.000Z'))).toEqual({
      appliedWindow: 'standard',
      price: 150,
    })
  })

  it('returns null when neither window is active (not purchasable)', () => {
    expect(selectActiveWindow({ earlyBird: EB, standard: STD }, new Date('2026-03-15T00:00:00.000Z'))).toBeNull()
  })

  it('returns null when neither window is configured at all', () => {
    expect(selectActiveWindow({}, new Date('2026-01-15T00:00:00.000Z'))).toBeNull()
  })
})
