/** One discount candidate as seen by a strategy: whether it applies at all, and — when it
 * does — the percentage to use. Percentages arrive already clamped to `[0, 100]` by
 * `computeOrderPricing` (see `rounding.ts#clampPercent`); strategies trust that and never
 * re-clamp. */
export type DiscountLine = { applicable: boolean; percent: number }

export type StrategyInput = {
  /** `basePrice * quantity`, NOT yet rounded — every strategy rounds it as its first step. */
  subtotal: number
  group: DiscountLine
  member: DiscountLine
  code: DiscountLine
}

export type StrategyOutput = {
  groupDiscount: number
  memberDiscount: number
  codeDiscount: number
  total: number
}

/** The strategy-pattern contract (CLAUDE.md §8): one pure function per `stackingPolicy`,
 * all three implemented regardless of which is the current site default. */
export type PricingStrategy = (input: StrategyInput) => StrategyOutput
