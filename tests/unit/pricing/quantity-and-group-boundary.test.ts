import { describe, expect, it } from 'vitest'

import { computeOrderPricing, GROUP_DISCOUNT_PERCENT, GROUP_MIN_QUANTITY } from '../../../src/lib/pricing'

import { ACTIVE_NOW, WINDOWS_EARLY_BIRD_ONLY } from './fixtures'

/**
 * The `quantity >= 3` group-discount boolean is computed ONCE in `computeOrderPricing`
 * (not inside any strategy), so its branch behaviour is identical across all 3 policies.
 * Exhaustively exercising quantity 1/2/3/5 here — under a single representative policy —
 * covers the branch fully without re-running the same non-strategy-specific logic three
 * times. The member×code interaction matrices (compute-order-pricing.*.test.ts) then only
 * need TWO quantity buckets (2 and 5) to represent "group off" / "group on".
 */
describe('computeOrderPricing — quantity validation and group-discount threshold', () => {
  it('exports the documented constants', () => {
    expect(GROUP_DISCOUNT_PERCENT).toBe(10)
    expect(GROUP_MIN_QUANTITY).toBe(3)
  })

  it.each([
    { quantity: 1, expectGroupDiscount: 0, expectTotal: 100 },
    { quantity: 2, expectGroupDiscount: 0, expectTotal: 200 },
    { quantity: 3, expectGroupDiscount: 30, expectTotal: 270 },
    { quantity: 5, expectGroupDiscount: 50, expectTotal: 450 },
  ])(
    'qty=$quantity: group discount is $expectGroupDiscount, total is $expectTotal',
    ({ quantity, expectGroupDiscount, expectTotal }) => {
      const result = computeOrderPricing({
        windows: WINDOWS_EARLY_BIRD_ONLY,
        quantity,
        isMember: false,
        memberDiscountPercent: 0,
        now: ACTIVE_NOW,
        policy: 'stackAll',
      })

      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.pricing.groupDiscount).toBe(expectGroupDiscount)
      expect(result.pricing.memberDiscount).toBe(0)
      expect(result.pricing.codeDiscount).toBe(0)
      expect(result.pricing.total).toBe(expectTotal)
    },
  )

  it.each([
    { quantity: 0, label: 'zero' },
    { quantity: -1, label: 'negative' },
    { quantity: 1.5, label: 'non-integer' },
    { quantity: Number.NaN, label: 'NaN' },
  ])('rejects an invalid quantity ($label)', ({ quantity }) => {
    const result = computeOrderPricing({
      windows: WINDOWS_EARLY_BIRD_ONLY,
      quantity,
      isMember: false,
      memberDiscountPercent: 0,
      now: ACTIVE_NOW,
      policy: 'stackAll',
    })
    expect(result).toEqual({ ok: false, reason: 'invalidQuantity' })
  })
})
