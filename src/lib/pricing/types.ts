/**
 * Pure structural types for the pricing engine (CLAUDE.md §8).
 *
 * Deliberately NOT the generated Payload types (`src/payload-types.ts`) and NOT a
 * dependency on any collection config — this module is a standalone domain library. A
 * thin adapter (T6, `checkout` API) maps Payload docs (`courseSessions`, `discountCodes`,
 * `siteSettings`) onto these shapes at the boundary.
 */

/** One price window (`earlyBird` or `standard` group on `courseSessions`). All three
 * fields are optional/nullable at the type level because Payload groups can be partially
 * empty — see `isWindowActive` for what "active" actually requires. */
export type PricingWindow = {
  price?: number | null
  startDate?: string | Date | null
  endDate?: string | Date | null
}

export type PricingWindows = {
  earlyBird?: PricingWindow | null
  standard?: PricingWindow | null
}

export type AppliedWindow = 'earlyBird' | 'standard'

export type DiscountCodeType = 'general' | 'member'

/** Structural mirror of the fields the engine needs from the `discountCodes` collection. */
export type PricingCodeInput = {
  /** Opaque identifier (the Payload doc id). Passed straight through into the snapshot's
   * `code` field so T6 can persist `order.pricing.code` as a relationship and increment
   * `usageCount` — the engine itself never inspects or interprets it. */
  id?: string | number
  code: string
  percentage: number
  expiresAt?: string | Date | null
  usageLimit?: number | null
  usageCount: number
  type: DiscountCodeType
  isActive: boolean
}

export type StackingPolicy = 'stackAll' | 'bestOf' | 'groupMemberStack_codeExclusive'

export type InvalidCodeDetail = 'inactive' | 'expired' | 'usageLimitReached'

export type ComputeOrderPricingInput = {
  windows: PricingWindows
  /** Seats being purchased. Must be a positive integer — anything else is `invalidQuantity`. */
  quantity: number
  /** A customer-submitted discount code, if any. `undefined`/`null` = no code entered. */
  code?: PricingCodeInput | null
  /** Whether the buyer independently qualifies for member pricing (allowlist / manual flag
   * — CLAUDE.md §13, no real auth). A valid `type: 'member'` code ALSO grants this even
   * when `isMember` is false (CLAUDE.md §4). */
  isMember?: boolean
  policy: StackingPolicy
  /** §13 — the member discount % is TBD from Silviu; config-driven (`siteSettings`),
   * defaults to `DEFAULT_MEMBER_DISCOUNT_PERCENT` (0) when the caller omits it so an
   * unconfigured site never silently grants a discount. */
  memberDiscountPercent?: number
  /** Injected clock. This module NEVER calls `new Date()` / `Date.now()` internally —
   * every "now" comes from here, which is what makes the whole engine deterministic and
   * testable without faking the system clock. */
  now: Date
}

/** Matches `orders.pricing` (CLAUDE.md §4) field-for-field. `code` holds whatever
 * identifier `PricingCodeInput` carried (see `computeOrderPricing.ts` for the exact
 * fallback rule), or `null` when no code was applied. */
export type PricingSnapshot = {
  basePrice: number
  appliedWindow: AppliedWindow
  groupDiscount: number
  memberDiscount: number
  code: string | number | null
  codeDiscount: number
  total: number
}

export type ComputeOrderPricingResult =
  | { ok: true; pricing: PricingSnapshot }
  | { ok: false; reason: 'noActiveWindow' }
  | { ok: false; reason: 'invalidQuantity' }
  | { ok: false; reason: 'invalidCode'; detail: InvalidCodeDetail }
