import { roundCurrency } from '../rounding'

import type { PricingStrategy } from './types'

/**
 * `groupMemberStack_codeExclusive` (CLAUDE.md §8): if a valid code is applied, the code
 * discount applies EXCLUSIVELY — group and member are zeroed, even in the (deliberately
 * tested) case where compounding group+member would have been worth MORE to the buyer.
 * Exclusivity is absolute by design, not "whichever is better for the customer".
 *
 * Otherwise (no code), group and member compound in the same fixed order as `stackAll`
 * (group -> member), with `codeDiscount` always 0.
 */
export const groupMemberStackCodeExclusive: PricingStrategy = ({ subtotal, group, member, code }) => {
  const roundedSubtotal = roundCurrency(subtotal)

  if (code.applicable) {
    const codeDiscount = roundCurrency(roundedSubtotal * (code.percent / 100))
    const total = roundCurrency(roundedSubtotal - codeDiscount)
    return { groupDiscount: 0, memberDiscount: 0, codeDiscount, total }
  }

  let running = roundedSubtotal

  const groupDiscount = group.applicable ? roundCurrency(running * (group.percent / 100)) : 0
  running = roundCurrency(running - groupDiscount)

  const memberDiscount = member.applicable ? roundCurrency(running * (member.percent / 100)) : 0
  running = roundCurrency(running - memberDiscount)

  return { groupDiscount, memberDiscount, codeDiscount: 0, total: running }
}
