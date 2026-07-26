import { roundCurrency } from '../rounding'

import type { PricingStrategy } from './types'

/**
 * `groupMemberStack_codeExclusive` (CLAUDE.md §8): if a valid code is applied, the code
 * discount applies EXCLUSIVELY — group and member are zeroed, even in the (deliberately
 * tested) case where compounding group+member would have been worth MORE to the buyer.
 * Exclusivity is absolute by design, not "whichever is better for the customer". With two
 * codes, exclusivity is against group/member only — the codes still compound BETWEEN
 * THEMSELVES, in application order (same sequential-rounding rule as `stackAll`).
 *
 * Otherwise (no code), group and member compound in the same fixed order as `stackAll`
 * (group -> member), with `codeDiscount` always 0.
 */
export const groupMemberStackCodeExclusive: PricingStrategy = ({ subtotal, group, member, codes }) => {
  const roundedSubtotal = roundCurrency(subtotal)

  if (codes.some((code) => code.applicable)) {
    let running = roundedSubtotal
    const codeDiscounts = codes.map((code) => {
      const discount = code.applicable ? roundCurrency(running * (code.percent / 100)) : 0
      running = roundCurrency(running - discount)
      return discount
    })
    const codeDiscount = roundCurrency(codeDiscounts.reduce((sum, d) => sum + d, 0))
    return { groupDiscount: 0, memberDiscount: 0, codeDiscounts, codeDiscount, total: running }
  }

  let running = roundedSubtotal

  const groupDiscount = group.applicable ? roundCurrency(running * (group.percent / 100)) : 0
  running = roundCurrency(running - groupDiscount)

  const memberDiscount = member.applicable ? roundCurrency(running * (member.percent / 100)) : 0
  running = roundCurrency(running - memberDiscount)

  return {
    groupDiscount,
    memberDiscount,
    codeDiscounts: codes.map(() => 0),
    codeDiscount: 0,
    total: running,
  }
}
