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
 * groupMemberStack_codeExclusive (CLAUDE.md §8): if a valid code is applied, the code
 * discount applies EXCLUSIVELY (group and member are zeroed, even when compounding them
 * would have been worth MORE to the buyer — exclusivity is absolute, not "whichever is
 * better"). Otherwise, group and member compound in fixed order (group -> member), exactly
 * like the `stackAll` two-factor case, with codeDiscount always 0.
 */
describe('computeOrderPricing — groupMemberStack_codeExclusive policy (24-row combinatorial matrix)', () => {
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
    { label: 'qty2 notMember pct0 code=general: code exclusive', quantity: 2, isMember: false, memberDiscountPercent: 0, codeState: 'general', expectGroup: 0, expectMember: 0, expectCode: 40, expectTotal: 160 },
    { label: 'qty2 notMember pct0 code=member: code exclusive', quantity: 2, isMember: false, memberDiscountPercent: 0, codeState: 'member', expectGroup: 0, expectMember: 0, expectCode: 40, expectTotal: 160 },
    { label: 'qty2 notMember pct15 code=none', quantity: 2, isMember: false, memberDiscountPercent: 15, codeState: 'none', expectGroup: 0, expectMember: 0, expectCode: 0, expectTotal: 200 },
    { label: 'qty2 notMember pct15 code=general: code exclusive', quantity: 2, isMember: false, memberDiscountPercent: 15, codeState: 'general', expectGroup: 0, expectMember: 0, expectCode: 40, expectTotal: 160 },
    { label: 'qty2 notMember pct15 code=member: code exclusive (member grant irrelevant once a code is present)', quantity: 2, isMember: false, memberDiscountPercent: 15, codeState: 'member', expectGroup: 0, expectMember: 0, expectCode: 40, expectTotal: 160 },
    { label: 'qty2 isMember pct0 code=none', quantity: 2, isMember: true, memberDiscountPercent: 0, codeState: 'none', expectGroup: 0, expectMember: 0, expectCode: 0, expectTotal: 200 },
    { label: 'qty2 isMember pct0 code=general: code exclusive', quantity: 2, isMember: true, memberDiscountPercent: 0, codeState: 'general', expectGroup: 0, expectMember: 0, expectCode: 40, expectTotal: 160 },
    { label: 'qty2 isMember pct0 code=member: code exclusive', quantity: 2, isMember: true, memberDiscountPercent: 0, codeState: 'member', expectGroup: 0, expectMember: 0, expectCode: 40, expectTotal: 160 },
    { label: 'qty2 isMember pct15 code=none: group+member compound (no code)', quantity: 2, isMember: true, memberDiscountPercent: 15, codeState: 'none', expectGroup: 0, expectMember: 30, expectCode: 0, expectTotal: 170 },
    { label: 'qty2 isMember pct15 code=general: code exclusive OVERRIDES the (worse-for-buyer) code deal', quantity: 2, isMember: true, memberDiscountPercent: 15, codeState: 'general', expectGroup: 0, expectMember: 0, expectCode: 40, expectTotal: 160 },
    { label: 'qty2 isMember pct15 code=member: code exclusive', quantity: 2, isMember: true, memberDiscountPercent: 15, codeState: 'member', expectGroup: 0, expectMember: 0, expectCode: 40, expectTotal: 160 },

    // ---- qty=5 (subtotal 500, group applicable => 50 when no code) ----
    { label: 'qty5 notMember pct0 code=none', quantity: 5, isMember: false, memberDiscountPercent: 0, codeState: 'none', expectGroup: 50, expectMember: 0, expectCode: 0, expectTotal: 450 },
    { label: 'qty5 notMember pct0 code=general: code exclusive', quantity: 5, isMember: false, memberDiscountPercent: 0, codeState: 'general', expectGroup: 0, expectMember: 0, expectCode: 100, expectTotal: 400 },
    { label: 'qty5 notMember pct0 code=member: code exclusive', quantity: 5, isMember: false, memberDiscountPercent: 0, codeState: 'member', expectGroup: 0, expectMember: 0, expectCode: 100, expectTotal: 400 },
    { label: 'qty5 notMember pct15 code=none', quantity: 5, isMember: false, memberDiscountPercent: 15, codeState: 'none', expectGroup: 50, expectMember: 0, expectCode: 0, expectTotal: 450 },
    { label: 'qty5 notMember pct15 code=general: code exclusive', quantity: 5, isMember: false, memberDiscountPercent: 15, codeState: 'general', expectGroup: 0, expectMember: 0, expectCode: 100, expectTotal: 400 },
    { label: 'qty5 notMember pct15 code=member: code exclusive (member grant irrelevant)', quantity: 5, isMember: false, memberDiscountPercent: 15, codeState: 'member', expectGroup: 0, expectMember: 0, expectCode: 100, expectTotal: 400 },
    { label: 'qty5 isMember pct0 code=none: group only (member percent is 0)', quantity: 5, isMember: true, memberDiscountPercent: 0, codeState: 'none', expectGroup: 50, expectMember: 0, expectCode: 0, expectTotal: 450 },
    { label: 'qty5 isMember pct0 code=general: code exclusive', quantity: 5, isMember: true, memberDiscountPercent: 0, codeState: 'general', expectGroup: 0, expectMember: 0, expectCode: 100, expectTotal: 400 },
    { label: 'qty5 isMember pct0 code=member: code exclusive', quantity: 5, isMember: true, memberDiscountPercent: 0, codeState: 'member', expectGroup: 0, expectMember: 0, expectCode: 100, expectTotal: 400 },
    { label: 'qty5 isMember pct15 code=none: group+member compound (no code) => the BEST deal here', quantity: 5, isMember: true, memberDiscountPercent: 15, codeState: 'none', expectGroup: 50, expectMember: 67.5, expectCode: 0, expectTotal: 382.5 },
    { label: 'qty5 isMember pct15 code=general: code exclusive is WORSE than group+member would have been (382.5), proving exclusivity is absolute', quantity: 5, isMember: true, memberDiscountPercent: 15, codeState: 'general', expectGroup: 0, expectMember: 0, expectCode: 100, expectTotal: 400 },
    { label: 'qty5 isMember pct15 code=member: code exclusive', quantity: 5, isMember: true, memberDiscountPercent: 15, codeState: 'member', expectGroup: 0, expectMember: 0, expectCode: 100, expectTotal: 400 },
  ])('$label', ({ quantity, isMember, memberDiscountPercent, codeState, expectGroup, expectMember, expectCode, expectTotal }) => {
    const result = computeOrderPricing({
      windows: WINDOWS_EARLY_BIRD_ONLY,
      quantity,
      isMember,
      memberDiscountPercent,
      code: codeFor(codeState),
      now: ACTIVE_NOW,
      policy: 'groupMemberStack_codeExclusive',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.pricing.groupDiscount).toBe(expectGroup)
    expect(result.pricing.memberDiscount).toBe(expectMember)
    expect(result.pricing.codeDiscount).toBe(expectCode)
    expect(result.pricing.total).toBe(expectTotal)
    // Exclusivity: whenever a code applies, group and member must both be exactly 0.
    if (codeState !== 'none') {
      expect(result.pricing.groupDiscount).toBe(0)
      expect(result.pricing.memberDiscount).toBe(0)
    }
    expectConsistentSnapshot(result, 100, quantity)
  })
})
