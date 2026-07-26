import { describe, expect, it } from 'vitest'

import { computeOrderPricing, MAX_DISCOUNT_CODES, type PricingCodeInput } from '../../../src/lib/pricing'

import {
  ACTIVE_NOW,
  expectConsistentSnapshot,
  validGeneralCode,
  validMemberCode,
  WINDOWS_EARLY_BIRD_ONLY,
} from './fixtures'

/**
 * TWO stacked discount codes (owner decision 2026-07-25: codes stack, max 2 per order).
 * Fixture: basePrice = 100/seat (Early Bird active). Codes: GEN20 (20%) + GEN10 (10%).
 * All expected values below were computed BY HAND, not by re-invoking the formula:
 *
 *   stackAll qty2:  200 → code₁ 40 → 160 → code₂ 16 → 144
 *   stackAll qty5:  500 → group 50 → 450 → code₁ 90 → 360 → code₂ 36 → 324
 *   bestOf   qty5:  winner = code₁ (20% of 500 = 100) → 400 (codes never combine)
 *   exclusive qty5: 500 → code₁ 100 → 400 → code₂ 40 → 360 (group zeroed)
 */

const gen10 = (overrides: Partial<PricingCodeInput> = {}): PricingCodeInput =>
  validGeneralCode({ id: 'code-general-10', code: 'GEN10', percentage: 10, ...overrides })

describe('computeOrderPricing — two stacked codes (max 2, owner 2026-07-25)', () => {
  it('stackAll: codes compound sequentially after group/member, per-code lines are exact', () => {
    const result = computeOrderPricing({
      windows: WINDOWS_EARLY_BIRD_ONLY,
      quantity: 2,
      codes: [validGeneralCode(), gen10()],
      policy: 'stackAll',
      now: ACTIVE_NOW,
    })
    expectConsistentSnapshot(result, 100, 2)
    if (!result.ok) return
    expect(result.pricing.codes).toEqual([
      { code: 'code-general-20', discount: 40 },
      { code: 'code-general-10', discount: 16 },
    ])
    expect(result.pricing.codeDiscount).toBe(56)
    expect(result.pricing.code).toBe('code-general-20') // legacy field = FIRST code
    expect(result.pricing.total).toBe(144)
  })

  it('stackAll qty5: group discount applies first, then both codes in order', () => {
    const result = computeOrderPricing({
      windows: WINDOWS_EARLY_BIRD_ONLY,
      quantity: 5,
      codes: [validGeneralCode(), gen10()],
      policy: 'stackAll',
      now: ACTIVE_NOW,
    })
    expectConsistentSnapshot(result, 100, 5)
    if (!result.ok) return
    expect(result.pricing.groupDiscount).toBe(50)
    expect(result.pricing.codes.map((line) => line.discount)).toEqual([90, 36])
    expect(result.pricing.codeDiscount).toBe(126)
    expect(result.pricing.total).toBe(324)
  })

  it('stackAll: a member-type SECOND code still grants member pricing', () => {
    // 200 → member 15% = 30 → 170 → GEN20 = 34 → 136 → MEM20 = 27.2 → 108.8
    const result = computeOrderPricing({
      windows: WINDOWS_EARLY_BIRD_ONLY,
      quantity: 2,
      codes: [validGeneralCode(), validMemberCode()],
      isMember: false,
      memberDiscountPercent: 15,
      policy: 'stackAll',
      now: ACTIVE_NOW,
    })
    expectConsistentSnapshot(result, 100, 2)
    if (!result.ok) return
    expect(result.pricing.memberDiscount).toBe(30)
    expect(result.pricing.codes.map((line) => line.discount)).toEqual([34, 27.2])
    expect(result.pricing.total).toBe(108.8)
  })

  it('bestOf: each code is its OWN candidate — the single largest discount wins', () => {
    const result = computeOrderPricing({
      windows: WINDOWS_EARLY_BIRD_ONLY,
      quantity: 5,
      codes: [validGeneralCode(), gen10()],
      policy: 'bestOf',
      now: ACTIVE_NOW,
    })
    expectConsistentSnapshot(result, 100, 5)
    if (!result.ok) return
    expect(result.pricing.groupDiscount).toBe(0)
    expect(result.pricing.codes.map((line) => line.discount)).toEqual([100, 0])
    expect(result.pricing.codeDiscount).toBe(100)
    expect(result.pricing.total).toBe(400)
  })

  it('groupMemberStack_codeExclusive: codes compound between themselves, group zeroed', () => {
    const result = computeOrderPricing({
      windows: WINDOWS_EARLY_BIRD_ONLY,
      quantity: 5,
      codes: [validGeneralCode(), gen10()],
      policy: 'groupMemberStack_codeExclusive',
      now: ACTIVE_NOW,
    })
    expectConsistentSnapshot(result, 100, 5)
    if (!result.ok) return
    expect(result.pricing.groupDiscount).toBe(0)
    expect(result.pricing.codes.map((line) => line.discount)).toEqual([100, 40])
    expect(result.pricing.codeDiscount).toBe(140)
    expect(result.pricing.total).toBe(360)
  })

  it('rejects the SAME code applied twice (case-insensitive) as invalidCode/duplicate', () => {
    const result = computeOrderPricing({
      windows: WINDOWS_EARLY_BIRD_ONLY,
      quantity: 2,
      codes: [validGeneralCode(), validGeneralCode({ id: 'other-id', code: 'gen20' })],
      policy: 'stackAll',
      now: ACTIVE_NOW,
    })
    expect(result).toEqual({
      ok: false,
      reason: 'invalidCode',
      detail: 'duplicate',
      codeValue: 'gen20',
    })
  })

  it(`rejects more than ${MAX_DISCOUNT_CODES} codes as tooManyCodes`, () => {
    const result = computeOrderPricing({
      windows: WINDOWS_EARLY_BIRD_ONLY,
      quantity: 2,
      codes: [
        validGeneralCode(),
        gen10(),
        validGeneralCode({ id: 'code-3', code: 'THIRD5', percentage: 5 }),
      ],
      policy: 'stackAll',
      now: ACTIVE_NOW,
    })
    expect(result).toEqual({ ok: false, reason: 'tooManyCodes' })
  })

  it('attributes an invalid SECOND code via codeValue', () => {
    const result = computeOrderPricing({
      windows: WINDOWS_EARLY_BIRD_ONLY,
      quantity: 2,
      codes: [validGeneralCode(), gen10({ isActive: false })],
      policy: 'stackAll',
      now: ACTIVE_NOW,
    })
    expect(result).toEqual({
      ok: false,
      reason: 'invalidCode',
      detail: 'inactive',
      codeValue: 'GEN10',
    })
  })

  it('legacy single `code` input still works and yields a one-line codes snapshot', () => {
    const result = computeOrderPricing({
      windows: WINDOWS_EARLY_BIRD_ONLY,
      quantity: 2,
      code: validGeneralCode(),
      policy: 'stackAll',
      now: ACTIVE_NOW,
    })
    expectConsistentSnapshot(result, 100, 2)
    if (!result.ok) return
    expect(result.pricing.codes).toEqual([{ code: 'code-general-20', discount: 40 }])
    expect(result.pricing.code).toBe('code-general-20')
    expect(result.pricing.codeDiscount).toBe(40)
  })
})
