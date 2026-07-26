import { roundCurrency } from '../rounding'

import type { DiscountLine, PricingStrategy } from './types'

type Candidate = { key: 'group' | 'member' | 'code'; codeIndex?: number; percent: number }

/**
 * `bestOf` (CLAUDE.md §8): only the SINGLE largest applicable percentage applies, taken
 * directly against the (rounded) subtotal — never compounded with the others. With two
 * codes applied, EACH code is its own candidate — codes never combine under `bestOf`.
 *
 * Tie-break rule (a decision this module had to make — the spec doesn't state one):
 * ties are resolved by the same fixed priority order used everywhere else in this engine,
 * group -> member -> code₁ -> code₂. Implemented via a strict `>` comparison while
 * scanning in that order, so the first candidate to reach the maximum keeps it.
 */
const effectivePercent = (line: DiscountLine): number => (line.applicable ? line.percent : 0)

export const bestOf: PricingStrategy = ({ subtotal, group, member, codes }) => {
  const candidates: Candidate[] = [
    { key: 'group', percent: effectivePercent(group) },
    { key: 'member', percent: effectivePercent(member) },
    ...codes.map((code, index) => ({
      key: 'code' as const,
      codeIndex: index,
      percent: effectivePercent(code),
    })),
  ]

  // Strictly-greater comparison ⇒ first-wins on ties, preserving the documented
  // group -> member -> code₁ -> code₂ tie-break priority (scan order = priority order).
  const winner = candidates.reduce((best, candidate) =>
    candidate.percent > best.percent ? candidate : best,
  )

  const roundedSubtotal = roundCurrency(subtotal)
  const discountAmount = winner.percent > 0 ? roundCurrency(roundedSubtotal * (winner.percent / 100)) : 0
  const total = roundCurrency(roundedSubtotal - discountAmount)

  const codeDiscounts = codes.map((_, index) =>
    winner.key === 'code' && winner.codeIndex === index ? discountAmount : 0,
  )

  return {
    groupDiscount: winner.key === 'group' ? discountAmount : 0,
    memberDiscount: winner.key === 'member' ? discountAmount : 0,
    codeDiscounts,
    codeDiscount: winner.key === 'code' ? discountAmount : 0,
    total,
  }
}
