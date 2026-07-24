import { roundCurrency } from '../rounding'

import type { PricingStrategy } from './types'

/**
 * `stackAll` (CLAUDE.md §8): every applicable discount compounds MULTIPLICATIVELY, in the
 * fixed order group -> member -> code (e.g. 10% + 10% on 100 => 100 × 0.9 × 0.9 = 81).
 *
 * Each step rounds its own discount amount and the resulting running total to the cent
 * BEFORE the next step reads it — see `rounding.ts` for why this makes
 * `subtotal − Σ(discounts) === total` an exact identity, not an approximation.
 */
export const stackAll: PricingStrategy = ({ subtotal, group, member, code }) => {
  let running = roundCurrency(subtotal)

  const groupDiscount = group.applicable ? roundCurrency(running * (group.percent / 100)) : 0
  running = roundCurrency(running - groupDiscount)

  const memberDiscount = member.applicable ? roundCurrency(running * (member.percent / 100)) : 0
  running = roundCurrency(running - memberDiscount)

  const codeDiscount = code.applicable ? roundCurrency(running * (code.percent / 100)) : 0
  running = roundCurrency(running - codeDiscount)

  return { groupDiscount, memberDiscount, codeDiscount, total: running }
}
