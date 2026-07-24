/**
 * Rounding contract (documented once, applied everywhere in this module):
 *
 *   - Every intermediate amount — each strategy step's discount amount AND the resulting
 *     running total after that step — plus the final `total`, is rounded to 2 decimals
 *     using ROUND-HALF-UP (never banker's/round-half-to-even, never truncation).
 *   - `Number.EPSILON` is added before rounding to counter IEEE-754 binary floating-point
 *     representation error (e.g. `1.005` is actually stored as
 *     `~1.00499999999999989`; without the epsilon nudge, `Math.round(1.005 * 100) / 100`
 *     incorrectly yields `1.00` instead of the mathematically-correct `1.01`).
 *   - Because every strategy rounds each step's running total BEFORE deriving the next
 *     step's discount off it, `roundedSubtotal − Σ(discounts) === total` holds EXACTLY (to
 *     the cent) by construction: it is a telescoping sum of `(runningBefore − runningAfter)`
 *     terms, never merely "correct within a rounding tolerance".
 */
export const roundCurrency = (amount: number): number => Math.round((amount + Number.EPSILON) * 100) / 100

/**
 * Clamps a percentage into `[0, 100]`. Defensive: `discountCodes.percentage` is already
 * DB-constrained to this range, but `memberDiscountPercent` is caller-supplied plain
 * config (§13, TBD) — clamping here guarantees every strategy's algebra (products of
 * `(1 - percent/100)` factors, each in `[0, 1]`) can never drive `total` negative, even
 * under misconfiguration.
 */
export const clampPercent = (percent: number): number => Math.min(100, Math.max(0, percent))
