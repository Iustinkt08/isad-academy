import { describe, expect, it } from 'vitest'

import { computeOrderPricing, DEFAULT_MEMBER_DISCOUNT_PERCENT } from '../../../src/lib/pricing'

import { ACTIVE_NOW, STANDARD_ACTIVE, validMemberCode, WINDOWS_EARLY_BIRD_ONLY } from './fixtures'

const POLICIES = ['stackAll', 'bestOf', 'groupMemberStack_codeExclusive'] as const

describe('computeOrderPricing — rounding compounding case (spec-required)', () => {
  it('99.99 x 3 with compounded 10% group + 10% member rounds every step to the cent, no drift', () => {
    // subtotal = roundCurrency(99.99 * 3) = roundCurrency(299.97000000000003) = 299.97
    // group 10%  -> round(29.997)  = 30.00 -> running 269.97
    // member 10% -> round(26.997)  = 27.00 -> running 242.97
    const result = computeOrderPricing({
      windows: { earlyBird: { price: 99.99, startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-01-31T23:59:59.999Z' } },
      quantity: 3,
      isMember: true,
      memberDiscountPercent: 10,
      now: ACTIVE_NOW,
      policy: 'stackAll',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.pricing.basePrice).toBe(99.99)
    expect(result.pricing.groupDiscount).toBe(30)
    expect(result.pricing.memberDiscount).toBe(27)
    expect(result.pricing.codeDiscount).toBe(0)
    expect(result.pricing.total).toBe(242.97)
    // The engine's own rounding contract (rounding.ts) makes this an EXACT identity in
    // `computeOrderPricing`'s output (asserted above via `.toBe`), by construction — each
    // step rounds before the next reads it. A naive raw-JS restatement of the same sum
    // (`299.97 - (30 + 27)`) is NOT exact (IEEE-754 gives 242.97000000000003), which is
    // precisely the drift this engine's per-step rounding is designed to avoid.
    expect(299.97 - (30 + 27 + 0)).toBeCloseTo(242.97, 10)
  })
})

describe('computeOrderPricing — member-type code implies member discount (CLAUDE.md §4)', () => {
  // `groupMemberStack_codeExclusive` is deliberately excluded from this table: under that
  // policy, ANY valid code present (including a member-type one) makes the code discount
  // apply EXCLUSIVELY, zeroing memberDiscount regardless of the grant — that exclusivity
  // is already asserted explicitly in
  // `compute-order-pricing.groupMemberStackCodeExclusive.test.ts` (rows using `code=member`
  // are annotated "member grant irrelevant once a code is present"). Re-testing "the grant
  // shows up in memberDiscount" here for that policy would assert something the policy is
  // specifically designed NOT to do.
  it.each(['stackAll', 'bestOf'] as const)('under %s: a valid member-type code grants member pricing even when isMember=false', (policy) => {
    const withoutCode = computeOrderPricing({
      windows: WINDOWS_EARLY_BIRD_ONLY,
      quantity: 1,
      isMember: false,
      memberDiscountPercent: 20,
      now: ACTIVE_NOW,
      policy,
    })
    const withMemberCode = computeOrderPricing({
      windows: WINDOWS_EARLY_BIRD_ONLY,
      quantity: 1,
      isMember: false,
      memberDiscountPercent: 20,
      code: validMemberCode({ percentage: 0 }), // 0% code so ONLY the member grant shows through
      now: ACTIVE_NOW,
      policy,
    })

    expect(withoutCode.ok).toBe(true)
    expect(withMemberCode.ok).toBe(true)
    if (!withoutCode.ok || !withMemberCode.ok) return

    expect(withoutCode.pricing.memberDiscount).toBe(0)
    // A 0%-value member code still flips `effectiveMember` on; the resulting discount
    // amount is only non-zero here because it's driven by `memberDiscountPercent`, proving
    // the grant is independent of the code's own percentage.
    expect(withMemberCode.pricing.memberDiscount).toBe(20)
  })
})

describe('computeOrderPricing — window wiring end-to-end', () => {
  it('propagates appliedWindow=earlyBird and its price into the snapshot', () => {
    const result = computeOrderPricing({
      windows: WINDOWS_EARLY_BIRD_ONLY,
      quantity: 1,
      isMember: false,
      memberDiscountPercent: 0,
      now: ACTIVE_NOW,
      policy: 'stackAll',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.pricing.appliedWindow).toBe('earlyBird')
    expect(result.pricing.basePrice).toBe(100)
  })

  it('propagates appliedWindow=standard and its price when Early Bird has ended', () => {
    const result = computeOrderPricing({
      windows: { earlyBird: { price: 100, startDate: '2025-01-01', endDate: '2025-01-31' }, standard: STANDARD_ACTIVE },
      quantity: 1,
      isMember: false,
      memberDiscountPercent: 0,
      now: ACTIVE_NOW,
      policy: 'stackAll',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.pricing.appliedWindow).toBe('standard')
    expect(result.pricing.basePrice).toBe(150)
  })

  it('is not purchasable when neither window is active', () => {
    const result = computeOrderPricing({
      windows: { earlyBird: { price: 100, startDate: '2025-01-01', endDate: '2025-01-31' } },
      quantity: 1,
      isMember: false,
      memberDiscountPercent: 0,
      now: ACTIVE_NOW,
      policy: 'stackAll',
    })
    expect(result).toEqual({ ok: false, reason: 'noActiveWindow' })
  })
})

describe('computeOrderPricing — memberDiscountPercent defaults to 0 per §13 when omitted', () => {
  it('uses DEFAULT_MEMBER_DISCOUNT_PERCENT (0) when the caller omits memberDiscountPercent', () => {
    expect(DEFAULT_MEMBER_DISCOUNT_PERCENT).toBe(0)
    const result = computeOrderPricing({
      windows: WINDOWS_EARLY_BIRD_ONLY,
      quantity: 1,
      isMember: true,
      now: ACTIVE_NOW,
      policy: 'stackAll',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.pricing.memberDiscount).toBe(0)
    expect(result.pricing.total).toBe(100)
  })
})

describe('computeOrderPricing — property: total is never negative and never exceeds the subtotal', () => {
  const quantities = [1, 2, 3, 5, 10, 100]
  const memberPercents = [0, 10, 50, 100, 150 /* misconfigured, must be clamped */]
  const codePercents = [0, 10, 50, 100]

  it.each(POLICIES)('%s holds 0 <= total <= subtotal across a wide input grid', (policy) => {
    for (const quantity of quantities) {
      for (const memberDiscountPercent of memberPercents) {
        for (const codePercentage of codePercents) {
          for (const isMember of [true, false]) {
            const subtotal = Math.round((100 * quantity + Number.EPSILON) * 100) / 100
            const result = computeOrderPricing({
              windows: WINDOWS_EARLY_BIRD_ONLY,
              quantity,
              isMember,
              memberDiscountPercent,
              code: codePercentage > 0 ? validMemberCode({ percentage: codePercentage }) : undefined,
              now: ACTIVE_NOW,
              policy,
            })

            expect(result.ok).toBe(true)
            if (!result.ok) continue
            expect(result.pricing.total).toBeGreaterThanOrEqual(0)
            expect(result.pricing.total).toBeLessThanOrEqual(subtotal)
          }
        }
      }
    }
  })
})
