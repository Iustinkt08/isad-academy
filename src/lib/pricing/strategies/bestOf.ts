import { roundCurrency } from '../rounding'

import type { DiscountLine, PricingStrategy } from './types'

type Candidate = { key: 'group' | 'member' | 'code'; percent: number }

/**
 * `bestOf` (CLAUDE.md §8): only the SINGLE largest applicable percentage applies, taken
 * directly against the (rounded) subtotal — never compounded with the others.
 *
 * Tie-break rule (a decision this module had to make — the spec doesn't state one):
 * ties are resolved by the same fixed priority order used everywhere else in this engine,
 * group -> member -> code. Implemented via a strict `>` comparison while scanning in that
 * order, so the first candidate to reach the maximum keeps it.
 */
const effectivePercent = (line: DiscountLine): number => (line.applicable ? line.percent : 0)

export const bestOf: PricingStrategy = ({ subtotal, group, member, code }) => {
  const candidates: Candidate[] = [
    { key: 'group', percent: effectivePercent(group) },
    { key: 'member', percent: effectivePercent(member) },
    { key: 'code', percent: effectivePercent(code) },
  ]

  // Strictly-greater comparison ⇒ first-wins on ties, preserving the documented
  // group -> member -> code tie-break priority (scan order = priority order).
  const winner = candidates.reduce((best, candidate) =>
    candidate.percent > best.percent ? candidate : best,
  )

  const roundedSubtotal = roundCurrency(subtotal)
  const discountAmount = winner.percent > 0 ? roundCurrency(roundedSubtotal * (winner.percent / 100)) : 0
  const total = roundCurrency(roundedSubtotal - discountAmount)

  return {
    groupDiscount: winner.key === 'group' ? discountAmount : 0,
    memberDiscount: winner.key === 'member' ? discountAmount : 0,
    codeDiscount: winner.key === 'code' ? discountAmount : 0,
    total,
  }
}
