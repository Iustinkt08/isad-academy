import { describe, expect, it } from 'vitest'

import { computeOrderPricing } from '../../../src/lib/pricing'

import { ACTIVE_NOW, WINDOWS_EARLY_BIRD_ONLY, validGeneralCode, validMemberCode } from './fixtures'

/**
 * Discount-code validity is checked ONCE in `computeOrderPricing`, before the strategy
 * pattern ever runs (window selection and code validation both gate entry identically
 * regardless of `policy`) — so this table is deliberately policy-independent. Exercising
 * it under all 3 policies would re-run the exact same branch three times without covering
 * any new code path. `policy: 'stackAll'` below is an arbitrary, inert choice.
 */
const base = { windows: WINDOWS_EARLY_BIRD_ONLY, quantity: 1, isMember: false, memberDiscountPercent: 0, now: ACTIVE_NOW, policy: 'stackAll' } as const

describe('computeOrderPricing — discount code validation', () => {
  it('absent code: purchasable, no code in the snapshot, codeDiscount 0', () => {
    const result = computeOrderPricing({ ...base, code: undefined })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.pricing.code).toBeNull()
      expect(result.pricing.codeDiscount).toBe(0)
    }
  })

  it('null code: same as absent', () => {
    const result = computeOrderPricing({ ...base, code: null })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.pricing.code).toBeNull()
  })

  it('valid general code: purchasable, code identifier carried through for T6 to persist', () => {
    const result = computeOrderPricing({ ...base, code: validGeneralCode() })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.pricing.code).toBe('code-general-20')
  })

  it('valid member code: purchasable, code identifier carried through', () => {
    const result = computeOrderPricing({ ...base, code: validMemberCode() })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.pricing.code).toBe('code-member-20')
  })

  it('falls back to the human-readable code string when no `id` was supplied', () => {
    const result = computeOrderPricing({ ...base, code: validGeneralCode({ id: undefined }) })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.pricing.code).toBe('GEN20')
  })

  it('inactive code: rejected with reason invalidCode / detail inactive', () => {
    const result = computeOrderPricing({ ...base, code: validGeneralCode({ isActive: false }) })
    expect(result).toEqual({ ok: false, reason: 'invalidCode', detail: 'inactive' })
  })

  it('expired code (expiresAt strictly before now): rejected, detail expired', () => {
    const result = computeOrderPricing({
      ...base,
      code: validGeneralCode({ expiresAt: '2026-01-01T00:00:00.000Z' }), // ACTIVE_NOW is 2026-01-15
    })
    expect(result).toEqual({ ok: false, reason: 'invalidCode', detail: 'expired' })
  })

  it('boundary: expiresAt exactly equal to now is still VALID (inclusive, like price windows)', () => {
    const result = computeOrderPricing({
      ...base,
      code: validGeneralCode({ expiresAt: ACTIVE_NOW.toISOString() }),
    })
    expect(result.ok).toBe(true)
  })

  it('boundary: expiresAt 1ms before now is INVALID', () => {
    const oneMsBefore = new Date(ACTIVE_NOW.getTime() - 1).toISOString()
    const result = computeOrderPricing({ ...base, code: validGeneralCode({ expiresAt: oneMsBefore }) })
    expect(result).toEqual({ ok: false, reason: 'invalidCode', detail: 'expired' })
  })

  it('usage limit reached (usageCount === usageLimit): rejected, detail usageLimitReached', () => {
    const result = computeOrderPricing({ ...base, code: validGeneralCode({ usageLimit: 5, usageCount: 5 }) })
    expect(result).toEqual({ ok: false, reason: 'invalidCode', detail: 'usageLimitReached' })
  })

  it('boundary: usageCount one below usageLimit is still VALID (last allowed use)', () => {
    const result = computeOrderPricing({ ...base, code: validGeneralCode({ usageLimit: 5, usageCount: 4 }) })
    expect(result.ok).toBe(true)
  })

  it('no usageLimit set (unlimited uses): valid regardless of usageCount', () => {
    const result = computeOrderPricing({ ...base, code: validGeneralCode({ usageLimit: null, usageCount: 9999 }) })
    expect(result.ok).toBe(true)
  })

  it('both inactive AND expired: fixed check order reports "inactive" first', () => {
    const result = computeOrderPricing({
      ...base,
      code: validGeneralCode({ isActive: false, expiresAt: '2020-01-01T00:00:00.000Z' }),
    })
    expect(result).toEqual({ ok: false, reason: 'invalidCode', detail: 'inactive' })
  })

  it('both expired AND usage-limit-reached: fixed check order reports "expired" before usage limit', () => {
    const result = computeOrderPricing({
      ...base,
      code: validGeneralCode({ expiresAt: '2020-01-01T00:00:00.000Z', usageLimit: 1, usageCount: 1 }),
    })
    expect(result).toEqual({ ok: false, reason: 'invalidCode', detail: 'expired' })
  })
})
