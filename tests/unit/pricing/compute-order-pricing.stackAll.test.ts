import { describe, expect, it } from 'vitest'

import { computeOrderPricing } from '../../../src/lib/pricing'

import {
  ACTIVE_NOW,
  expectConsistentSnapshot,
  validGeneralCode,
  validMemberCode,
  WINDOWS_EARLY_BIRD_ONLY,
} from './fixtures'

type CodeState = 'none' | 'general' | 'member'

const codeFor = (state: CodeState) => {
  if (state === 'general') return validGeneralCode()
  if (state === 'member') return validMemberCode()
  return undefined
}

/**
 * stackAll (CLAUDE.md §8): all applicable discounts compound MULTIPLICATIVELY, in the
 * fixed order group -> member -> code. Every step rounds its own discount amount and the
 * resulting running total to the cent (round-half-up) before the next step runs — see
 * `src/lib/pricing/rounding.ts` for the documented contract.
 *
 * Fixture: basePrice = 100/seat (Early Bird active). Quantity is collapsed to two
 * representative buckets — qty=2 (group discount NOT applicable) and qty=5 (group
 * discount applicable) — because quantity only ever affects this matrix through that one
 * boolean plus linear subtotal scaling, both already covered exhaustively (qty 1/2/3/5) in
 * `quantity-and-group-boundary.test.ts`. Crossing all 4 quantities here would just re-run
 * identical arithmetic twice per bucket.
 *
 * All 24 expected values below were computed by hand (see task derivation), NOT by
 * re-invoking the formula under test.
 */
describe('computeOrderPricing — stackAll policy (24-row combinatorial matrix)', () => {
  it.each<{
    label: string
    quantity: number
    isMember: boolean
    memberDiscountPercent: number
    codeState: CodeState
    expectGroup: number
    expectMember: number
    expectCode: number
    expectTotal: number
  }>([
    // ---- qty=2 (subtotal 200, group NOT applicable) ----
    { label: 'qty2 notMember pct0 code=none', quantity: 2, isMember: false, memberDiscountPercent: 0, codeState: 'none', expectGroup: 0, expectMember: 0, expectCode: 0, expectTotal: 200 },
    { label: 'qty2 notMember pct0 code=general', quantity: 2, isMember: false, memberDiscountPercent: 0, codeState: 'general', expectGroup: 0, expectMember: 0, expectCode: 40, expectTotal: 160 },
    { label: 'qty2 notMember pct0 code=member', quantity: 2, isMember: false, memberDiscountPercent: 0, codeState: 'member', expectGroup: 0, expectMember: 0, expectCode: 40, expectTotal: 160 },
    { label: 'qty2 notMember pct15 code=none', quantity: 2, isMember: false, memberDiscountPercent: 15, codeState: 'none', expectGroup: 0, expectMember: 0, expectCode: 0, expectTotal: 200 },
    { label: 'qty2 notMember pct15 code=general', quantity: 2, isMember: false, memberDiscountPercent: 15, codeState: 'general', expectGroup: 0, expectMember: 0, expectCode: 40, expectTotal: 160 },
    { label: 'qty2 notMember pct15 code=member (member-type code GRANTS member pricing)', quantity: 2, isMember: false, memberDiscountPercent: 15, codeState: 'member', expectGroup: 0, expectMember: 30, expectCode: 34, expectTotal: 136 },
    { label: 'qty2 isMember pct0 code=none', quantity: 2, isMember: true, memberDiscountPercent: 0, codeState: 'none', expectGroup: 0, expectMember: 0, expectCode: 0, expectTotal: 200 },
    { label: 'qty2 isMember pct0 code=general', quantity: 2, isMember: true, memberDiscountPercent: 0, codeState: 'general', expectGroup: 0, expectMember: 0, expectCode: 40, expectTotal: 160 },
    { label: 'qty2 isMember pct0 code=member', quantity: 2, isMember: true, memberDiscountPercent: 0, codeState: 'member', expectGroup: 0, expectMember: 0, expectCode: 40, expectTotal: 160 },
    { label: 'qty2 isMember pct15 code=none', quantity: 2, isMember: true, memberDiscountPercent: 15, codeState: 'none', expectGroup: 0, expectMember: 30, expectCode: 0, expectTotal: 170 },
    { label: 'qty2 isMember pct15 code=general', quantity: 2, isMember: true, memberDiscountPercent: 15, codeState: 'general', expectGroup: 0, expectMember: 30, expectCode: 34, expectTotal: 136 },
    { label: 'qty2 isMember pct15 code=member', quantity: 2, isMember: true, memberDiscountPercent: 15, codeState: 'member', expectGroup: 0, expectMember: 30, expectCode: 34, expectTotal: 136 },

    // ---- qty=5 (subtotal 500, group applicable => 50) ----
    { label: 'qty5 notMember pct0 code=none', quantity: 5, isMember: false, memberDiscountPercent: 0, codeState: 'none', expectGroup: 50, expectMember: 0, expectCode: 0, expectTotal: 450 },
    { label: 'qty5 notMember pct0 code=general', quantity: 5, isMember: false, memberDiscountPercent: 0, codeState: 'general', expectGroup: 50, expectMember: 0, expectCode: 90, expectTotal: 360 },
    { label: 'qty5 notMember pct0 code=member', quantity: 5, isMember: false, memberDiscountPercent: 0, codeState: 'member', expectGroup: 50, expectMember: 0, expectCode: 90, expectTotal: 360 },
    { label: 'qty5 notMember pct15 code=none', quantity: 5, isMember: false, memberDiscountPercent: 15, codeState: 'none', expectGroup: 50, expectMember: 0, expectCode: 0, expectTotal: 450 },
    { label: 'qty5 notMember pct15 code=general', quantity: 5, isMember: false, memberDiscountPercent: 15, codeState: 'general', expectGroup: 50, expectMember: 0, expectCode: 90, expectTotal: 360 },
    { label: 'qty5 notMember pct15 code=member (member-type code GRANTS member pricing)', quantity: 5, isMember: false, memberDiscountPercent: 15, codeState: 'member', expectGroup: 50, expectMember: 67.5, expectCode: 76.5, expectTotal: 306 },
    { label: 'qty5 isMember pct0 code=none', quantity: 5, isMember: true, memberDiscountPercent: 0, codeState: 'none', expectGroup: 50, expectMember: 0, expectCode: 0, expectTotal: 450 },
    { label: 'qty5 isMember pct0 code=general', quantity: 5, isMember: true, memberDiscountPercent: 0, codeState: 'general', expectGroup: 50, expectMember: 0, expectCode: 90, expectTotal: 360 },
    { label: 'qty5 isMember pct0 code=member', quantity: 5, isMember: true, memberDiscountPercent: 0, codeState: 'member', expectGroup: 50, expectMember: 0, expectCode: 90, expectTotal: 360 },
    { label: 'qty5 isMember pct15 code=none', quantity: 5, isMember: true, memberDiscountPercent: 15, codeState: 'none', expectGroup: 50, expectMember: 67.5, expectCode: 0, expectTotal: 382.5 },
    { label: 'qty5 isMember pct15 code=general', quantity: 5, isMember: true, memberDiscountPercent: 15, codeState: 'general', expectGroup: 50, expectMember: 67.5, expectCode: 76.5, expectTotal: 306 },
    { label: 'qty5 isMember pct15 code=member', quantity: 5, isMember: true, memberDiscountPercent: 15, codeState: 'member', expectGroup: 50, expectMember: 67.5, expectCode: 76.5, expectTotal: 306 },
  ])('$label', ({ quantity, isMember, memberDiscountPercent, codeState, expectGroup, expectMember, expectCode, expectTotal }) => {
    const result = computeOrderPricing({
      windows: WINDOWS_EARLY_BIRD_ONLY,
      quantity,
      isMember,
      memberDiscountPercent,
      code: codeFor(codeState),
      now: ACTIVE_NOW,
      policy: 'stackAll',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.pricing.groupDiscount).toBe(expectGroup)
    expect(result.pricing.memberDiscount).toBe(expectMember)
    expect(result.pricing.codeDiscount).toBe(expectCode)
    expect(result.pricing.total).toBe(expectTotal)
    expect(result.pricing.appliedWindow).toBe('earlyBird')
    expectConsistentSnapshot(result, 100, quantity)
  })

  it('sanity check against the spec-given example: 10% + 10% on 100 compounds to 81 (100 × 0.9 × 0.9)', () => {
    const result = computeOrderPricing({
      windows: WINDOWS_EARLY_BIRD_ONLY,
      quantity: 3, // triggers the 10% group discount
      isMember: true,
      memberDiscountPercent: 10,
      now: ACTIVE_NOW,
      policy: 'stackAll',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // subtotal = 300 (100 * 3); group 10% -> 30, running 270; member 10% -> 27, running 243.
    // The spec's "100 × 0.9 × 0.9 = 81" example is per-100-units — confirmed structurally here
    // via the compounding ratio: 243 / 300 = 0.9 * 0.9 = 0.81.
    expect(result.pricing.total).toBe(243)
    expect(result.pricing.total / 300).toBeCloseTo(0.81, 10)
  })
})
