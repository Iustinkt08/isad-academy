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
export const computeOrderPricing = (input: ComputeOrderPricingInput): ComputeOrderPricingResult => {
  const { windows, quantity, code, isMember = false, policy, now } = input
  const memberDiscountPercent = input.memberDiscountPercent ?? DEFAULT_MEMBER_DISCOUNT_PERCENT

  if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, reason: 'invalidQuantity' }
  }

  const selected = selectActiveWindow(windows, now)
  if (!selected) {
    return { ok: false, reason: 'noActiveWindow' }
  }

  const validCode = code ?? null
  if (validCode) {
    const invalidDetail = validateCode(validCode, now)
    if (invalidDetail) {
      return { ok: false, reason: 'invalidCode', detail: invalidDetail }
    }
  }

  // A valid `type: 'member'` code grants member pricing even when the buyer didn't
  // otherwise qualify (CLAUDE.md §4: "codul de tip member acordă și prețul de membru").
  const effectiveMember = isMember || validCode?.type === 'member'

  const subtotal = selected.price * quantity

  const strategy = strategies[policy]
  const breakdown = strategy({
    subtotal,
    group: { applicable: quantity >= GROUP_MIN_QUANTITY, percent: clampPercent(GROUP_DISCOUNT_PERCENT) },
    member: { applicable: effectiveMember, percent: clampPercent(memberDiscountPercent) },
    code: { applicable: Boolean(validCode), percent: clampPercent(validCode?.percentage ?? 0) },
  })

  return {
    ok: true,
    pricing: {
      basePrice: roundCurrency(selected.price),
      appliedWindow: selected.appliedWindow,
      groupDiscount: breakdown.groupDiscount,
      memberDiscount: breakdown.memberDiscount,
      // Prefer the Payload doc id (T6 persists this as the `discountCodes` relationship
      // and increments `usageCount` off it); fall back to the human-readable code string
      // so an ad-hoc/test input without an `id` never silently drops the applied code.
      code: validCode ? (validCode.id ?? validCode.code) : null,
      codeDiscount: breakdown.codeDiscount,
      total: breakdown.total,
    },
  }
}
