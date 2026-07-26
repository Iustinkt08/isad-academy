import { clampPercent, roundCurrency } from './rounding'
import { strategies } from './strategies'
import type {
  ComputeOrderPricingInput,
  ComputeOrderPricingResult,
  InvalidCodeDetail,
  PricingCodeInput,
} from './types'
import { selectActiveWindow } from './windows'

/** Group discount is automatic at `quantity >= GROUP_MIN_QUANTITY`, worth
 * `GROUP_DISCOUNT_PERCENT`% — CLAUDE.md §8 step 2. */
export const GROUP_DISCOUNT_PERCENT = 10
export const GROUP_MIN_QUANTITY = 3

/** §13 — the member discount % is TBD from Silviu. This module never hardcodes a
 * business default silently: `computeOrderPricing` falls back to this constant ONLY when
 * the caller genuinely omits `memberDiscountPercent`; the real value is meant to come from
 * `siteSettings` at the T6 call site. */
export const DEFAULT_MEMBER_DISCOUNT_PERCENT = 0

const toValidDate = (value: string | Date | null | undefined): Date | null => {
  if (value == null) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Validates a submitted discount code. Checks run in a FIXED order — isActive, then
 * expiry, then usage limit — and report the first failing check (a code can fail more
 * than one simultaneously; the caller only needs one reason to surface to the user).
 * `expiresAt` is INCLUSIVE: a code remains valid through the end of its `expiresAt`
 * instant (`now <= expiresAt`), consistent with the price-window bounds used elsewhere.
 */
const validateCode = (code: PricingCodeInput, now: Date): InvalidCodeDetail | null => {
  if (!code.isActive) return 'inactive'

  const expiresAt = toValidDate(code.expiresAt)
  if (expiresAt && now > expiresAt) return 'expired'

  if (code.usageLimit != null && code.usageCount >= code.usageLimit) return 'usageLimitReached'

  return null
}

/**
 * Pure pricing engine (CLAUDE.md §8 — the spec-flagged HIGHEST BUG RISK area).
 *
 * Never reads the system clock (`now` is always injected) and never throws for expected
 * business states — "no active price window" and "invalid code" are `{ ok: false }`
 * results the caller (checkout API / UI, T6) must handle explicitly; checkout must never
 * silently ignore a bad code (CLAUDE.md instruction).
 */
/** Owner decision (2026-07-25): codes stack, capped at TWO per order. */
export const MAX_DISCOUNT_CODES = 2

export const computeOrderPricing = (input: ComputeOrderPricingInput): ComputeOrderPricingResult => {
  const { windows, quantity, code, codes, isMember = false, policy, now } = input
  const memberDiscountPercent = input.memberDiscountPercent ?? DEFAULT_MEMBER_DISCOUNT_PERCENT

  if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, reason: 'invalidQuantity' }
  }

  const selected = selectActiveWindow(windows, now)
  if (!selected) {
    return { ok: false, reason: 'noActiveWindow' }
  }

  // `codes` (new, ordered list) takes precedence; the legacy single `code` keeps working.
  const validCodes = codes ?? (code ? [code] : [])

  if (validCodes.length > MAX_DISCOUNT_CODES) {
    return { ok: false, reason: 'tooManyCodes' }
  }

  const seenCodes = new Set<string>()
  for (const candidate of validCodes) {
    const normalized = candidate.code.trim().toUpperCase()
    if (seenCodes.has(normalized)) {
      return { ok: false, reason: 'invalidCode', detail: 'duplicate', codeValue: candidate.code }
    }
    seenCodes.add(normalized)

    const invalidDetail = validateCode(candidate, now)
    if (invalidDetail) {
      return { ok: false, reason: 'invalidCode', detail: invalidDetail, codeValue: candidate.code }
    }
  }

  // A valid `type: 'member'` code grants member pricing even when the buyer didn't
  // otherwise qualify (CLAUDE.md §4: "codul de tip member acordă și prețul de membru").
  const effectiveMember = isMember || validCodes.some((c) => c.type === 'member')

  const subtotal = selected.price * quantity

  const strategy = strategies[policy]
  const breakdown = strategy({
    subtotal,
    group: { applicable: quantity >= GROUP_MIN_QUANTITY, percent: clampPercent(GROUP_DISCOUNT_PERCENT) },
    member: { applicable: effectiveMember, percent: clampPercent(memberDiscountPercent) },
    codes: validCodes.map((c) => ({ applicable: true, percent: clampPercent(c.percentage) })),
  })

  // Prefer the Payload doc id (T6 persists this as the `discountCodes` relationship
  // and increments `usageCount` off it); fall back to the human-readable code string
  // so an ad-hoc/test input without an `id` never silently drops the applied code.
  const codeLines = validCodes.map((c, index) => ({
    code: c.id ?? c.code,
    discount: breakdown.codeDiscounts[index] ?? 0,
  }))

  return {
    ok: true,
    pricing: {
      basePrice: roundCurrency(selected.price),
      appliedWindow: selected.appliedWindow,
      groupDiscount: breakdown.groupDiscount,
      memberDiscount: breakdown.memberDiscount,
      code: codeLines[0]?.code ?? null,
      codes: codeLines,
      codeDiscount: breakdown.codeDiscount,
      total: breakdown.total,
    },
  }
}
