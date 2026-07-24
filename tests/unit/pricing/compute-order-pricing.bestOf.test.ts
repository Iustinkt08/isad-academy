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
 * bestOf (CLAUDE.md §8): only the SINGLE largest applicable percentage applies, taken
 * directly against the (rounded) subtotal — no compounding. Ties are broken by the fixed
 * group -> member -> code priority order (first candidate reaching the max wins; a later
 * candidate must be STRICTLY greater to take over).
 *
 * Same quantity-bucket rationale as the stackAll suite: qty=2 (group off) / qty=5 (group on).
 */
describe('computeOrderPricing — bestOf policy (24-row combinatorial matrix)', () => {
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
    // ---- qty=2 (subtotal 200, group% = 0 => never wins) ----
    { label: 'qty2 notMember pct0 code=none: nothing applicable', quantity: 2, isMember: false, memberDiscountPercent: 0, codeState: 'none', expectGroup: 0, expectMember: 0, expectCode: 0, expectTotal: 200 },
    { label: 'qty2 notMember pct0 code=general: code(20) wins', quantity: 2, isMember: false, memberDiscountPercent: 0, codeState: 'general', expectGroup: 0, expectMember: 0, expectCode: 40, expectTotal: 160 },
    { label: 'qty2 notMember pct0 code=member: code(20) wins', quantity: 2, isMember: false, memberDiscountPercent: 0, codeState: 'member', expectGroup: 0, expectMember: 0, expectCode: 40, expectTotal: 160 },
    { label: 'qty2 notMember pct15 code=none: nothing applicable (member not granted)', quantity: 2, isMember: false, memberDiscountPercent: 15, codeState: 'none', expectGroup: 0, expectMember: 0, expectCode: 0, expectTotal: 200 },
    { label: 'qty2 notMember pct15 code=general: code(20) wins over inapplicable member', quantity: 2, isMember: false, memberDiscountPercent: 15, codeState: 'general', expectGroup: 0, expectMember: 0, expectCode: 40, expectTotal: 160 },
    { label: 'qty2 notMember pct15 code=member: member GRANTED(15) but code(20) still wins', quantity: 2, isMember: false, memberDiscountPercent: 15, codeState: 'member', expectGroup: 0, expectMember: 0, expectCode: 40, expectTotal: 160 },
    { label: 'qty2 isMember pct0 code=none: nothing applicable (member percent is 0)', quantity: 2, isMember: true, memberDiscountPercent: 0, codeState: 'none', expectGroup: 0, expectMember: 0, expectCode: 0, expectTotal: 200 },
    { label: 'qty2 isMember pct0 code=general: code(20) wins', quantity: 2, isMember: true, memberDiscountPercent: 0, codeState: 'general', expectGroup: 0, expectMember: 0, expectCode: 40, expectTotal: 160 },
    { label: 'qty2 isMember pct0 code=member: code(20) wins', quantity: 2, isMember: true, memberDiscountPercent: 0, codeState: 'member', expectGroup: 0, expectMember: 0, expectCode: 40, expectTotal: 160 },
    { label: 'qty2 isMember pct15 code=none: member(15) wins (only candidate)', quantity: 2, isMember: true, memberDiscountPercent: 15, codeState: 'none', expectGroup: 0, expectMember: 30, expectCode: 0, expectTotal: 170 },
    { label: 'qty2 isMember pct15 code=general: code(20) beats member(15)', quantity: 2, isMember: true, memberDiscountPercent: 15, codeState: 'general', expectGroup: 0, expectMember: 0, expectCode: 40, expectTotal: 160 },
    { label: 'qty2 isMember pct15 code=member: code(20) beats member(15)', quantity: 2, isMember: true, memberDiscountPercent: 15, codeState: 'member', expectGroup: 0, expectMember: 0, expectCode: 40, expectTotal: 160 },

    // ---- qty=5 (subtotal 500, group% = 10, applicable) ----
    { label: 'qty5 notMember pct0 code=none: group(10) wins (only candidate)', quantity: 5, isMember: false, memberDiscountPercent: 0, codeState: 'none', expectGroup: 50, expectMember: 0, expectCode: 0, expectTotal: 450 },
    { label: 'qty5 notMember pct0 code=general: code(20) beats group(10)', quantity: 5, isMember: false, memberDiscountPercent: 0, codeState: 'general', expectGroup: 0, expectMember: 0, expectCode: 100, expectTotal: 400 },
    { label: 'qty5 notMember pct0 code=member: code(20) beats group(10)', quantity: 5, isMember: false, memberDiscountPercent: 0, codeState: 'member', expectGroup: 0, expectMember: 0, expectCode: 100, expectTotal: 400 },
    { label: 'qty5 notMember pct15 code=none: group(10) wins (member not granted)', quantity: 5, isMember: false, memberDiscountPercent: 15, codeState: 'none', expectGroup: 50, expectMember: 0, expectCode: 0, expectTotal: 450 },
    { label: 'qty5 notMember pct15 code=general: code(20) beats group(10)', quantity: 5, isMember: false, memberDiscountPercent: 15, codeState: 'general', expectGroup: 0, expectMember: 0, expectCode: 100, expectTotal: 400 },
    { label: 'qty5 notMember pct15 code=member: member GRANTED(15) but code(20) still wins over both', quantity: 5, isMember: false, memberDiscountPercent: 15, codeState: 'member', expectGroup: 0, expectMember: 0, expectCode: 100, expectTotal: 400 },
    { label: 'qty5 isMember pct0 code=none: group(10) wins (member percent is 0)', quantity: 5, isMember: true, memberDiscountPercent: 0, codeState: 'none', expectGroup: 50, expectMember: 0, expectCode: 0, expectTotal: 450 },
    { label: 'qty5 isMember pct0 code=general: code(20) beats group(10)', quantity: 5, isMember: true, memberDiscountPercent: 0, codeState: 'general', expectGroup: 0, expectMember: 0, expectCode: 100, expectTotal: 400 },
    { label: 'qty5 isMember pct0 code=member: code(20) beats group(10)', quantity: 5, isMember: true, memberDiscountPercent: 0, codeState: 'member', expectGroup: 0, expectMember: 0, expectCode: 100, expectTotal: 400 },
    { label: 'qty5 isMember pct15 code=none: member(15) beats group(10)', quantity: 5, isMember: true, memberDiscountPercent: 15, codeState: 'none', expectGroup: 0, expectMember: 75, expectCode: 0, expectTotal: 425 },
    { label: 'qty5 isMember pct15 code=general: code(20) beats member(15) beats group(10)', quantity: 5, isMember: true, memberDiscountPercent: 15, codeState: 'general', expectGroup: 0, expectMember: 0, expectCode: 100, expectTotal: 400 },
    { label: 'qty5 isMember pct15 code=member: code(20) beats member(15) beats group(10)', quantity: 5, isMember: true, memberDiscountPercent: 15, codeState: 'member', expectGroup: 0, expectMember: 0, expectCode: 100, expectTotal: 400 },
  ])('$label', ({ quantity, isMember, memberDiscountPercent, codeState, expectGroup, expectMember, expectCode, expectTotal }) => {
    const result = computeOrderPricing({
      windows: WINDOWS_EARLY_BIRD_ONLY,
      quantity,
      isMember,
      memberDiscountPercent,
      code: codeFor(codeState),
      now: ACTIVE_NOW,
      policy: 'bestOf',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.pricing.groupDiscount).toBe(expectGroup)
    expect(result.pricing.memberDiscount).toBe(expectMember)
    expect(result.pricing.codeDiscount).toBe(expectCode)
    expect(result.pricing.total).toBe(expectTotal)
    // bestOf never applies more than one discount simultaneously.
    const nonZeroCount = [expectGroup, expectMember, expectCode].filter((v) => v > 0).length
    expect(nonZeroCount).toBeLessThanOrEqual(1)
    expectConsistentSnapshot(result, 100, quantity)
  })

  it('tie-break: equal percentages favour the fixed group -> member -> code priority order', () => {
    // qty=5 => group 10%; memberDiscountPercent set to 10 too => tie. group must win (first in order).
    const result = computeOrderPricing({
      windows: WINDOWS_EARLY_BIRD_ONLY,
      quantity: 5,
      isMember: true,
      memberDiscountPercent: 10,
      now: ACTIVE_NOW,
      policy: 'bestOf',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.pricing.groupDiscount).toBe(50)
    expect(result.pricing.memberDiscount).toBe(0)
    expect(result.pricing.total).toBe(450)
  })
})
