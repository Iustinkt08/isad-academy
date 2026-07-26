import type { Payload } from 'payload'

import type { PricingSnapshot } from '../pricing'
import { loadPricedSession } from './loadPricedSession'
import type { CheckoutFailureBody } from './processCheckout'

/**
 * `quoteCheckout` — the read-only sibling of `processCheckout` (T10).
 *
 * Purpose: give the checkout UI a live, SERVER-AUTHORITATIVE price preview — including
 * discount-code validation — before any payment is attempted. It runs the exact same
 * session lookup, discount-code lookup and `computeOrderPricing` call as `processCheckout`
 * steps b–c (ONE shared implementation since T16 — `loadPricedSession`), and it
 * deliberately creates NOTHING and increments NOTHING: no order, no seat consumption, no
 * `usageCount` bump. The client-side breakdown rendered from this response is display-only;
 * the amount actually charged is always recomputed inside `processCheckout` at submit time.
 *
 * Error contract: identical statuses/bodies to `POST /api/checkout` for the shared failure
 * modes (400 invalid code with `detail`, 404 session, 409 past / sold-out with `soldOut` /
 * no active window) — single-sourced in `loadPricedSession`, so the UI maps both endpoints
 * through one error table.
 */

export type QuoteSuccessBody = {
  pricing: PricingSnapshot
  session: { id: number; courseTitle: string; startDate: string }
  /** Currency the quote is denominated in (B1 — geo-resolved server-side). */
  currency: 'EUR' | 'RON'
}

export type QuoteResult =
  | { status: 200; body: QuoteSuccessBody }
  | { status: 400 | 404 | 409; body: CheckoutFailureBody }

export type QuoteCheckoutDeps = {
  payload: Payload
  /** Visitor country code from the geo header (B1) — resolved by the route, never client-sent. */
  country?: string | null
  /** Injected clock (same contract as `processCheckout`) — tests pin "now" deterministically. */
  now?: Date
}

/** Mirrors `validateCheckoutInput`'s caps for the fields a quote actually needs. */
const MAX_QUANTITY = 500
const MAX_CODE_LENGTH = 64
/** Codes stack, max 2 per order (owner 2026-07-25) — mirrors the engine's cap. */
const MAX_CODES = 2

const ALLOWED_KEYS = ['sessionId', 'quantity', 'code', 'codes']

type NormalizedQuoteInput = {
  sessionId: number | string
  quantity: number
  /** Trimmed codes in application order (max 2); [] = none. Legacy `code` folded in. */
  codes: string[]
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const validateQuoteInput = (
  raw: unknown,
): { ok: true; value: NormalizedQuoteInput } | { ok: false; error: string } => {
  if (!isPlainObject(raw)) {
    return { ok: false, error: 'Request body must be a JSON object.' }
  }

  const unknown = Object.keys(raw).filter((key) => !ALLOWED_KEYS.includes(key))
  if (unknown.length > 0) {
    return { ok: false, error: `Unknown field(s) in request body: ${unknown.join(', ')}.` }
  }

  const { sessionId, quantity, code, codes } = raw

  const sessionIdOk =
    (typeof sessionId === 'number' && Number.isFinite(sessionId)) ||
    (typeof sessionId === 'string' && sessionId.trim().length > 0 && sessionId.length <= 100)
  if (!sessionIdOk) {
    return { ok: false, error: '"sessionId" is required.' }
  }

  if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || (quantity as number) < 1) {
    return { ok: false, error: '"quantity" must be a positive integer.' }
  }
  if ((quantity as number) > MAX_QUANTITY) {
    return { ok: false, error: `"quantity" may not exceed ${MAX_QUANTITY}.` }
  }

  // `codes` (new, ordered, max 2) takes precedence; the legacy single `code` still works.
  const normalizedCodes: string[] = []
  if (codes !== undefined && codes !== null) {
    if (!Array.isArray(codes)) {
      return { ok: false, error: '"codes" must be an array of strings.' }
    }
    if (codes.length > MAX_CODES) {
      return { ok: false, error: `At most ${MAX_CODES} discount codes can be applied per order.` }
    }
    for (const entry of codes) {
      if (typeof entry !== 'string' || entry.trim().length === 0 || entry.length > MAX_CODE_LENGTH) {
        return { ok: false, error: 'Every entry in "codes" must be a non-empty string.' }
      }
      normalizedCodes.push(entry.trim())
    }
  } else if (code !== undefined && code !== null) {
    if (typeof code !== 'string' || code.trim().length === 0 || code.length > MAX_CODE_LENGTH) {
      return { ok: false, error: '"code" must be a non-empty string.' }
    }
    normalizedCodes.push(code.trim())
  }

  return {
    ok: true,
    value: {
      sessionId: sessionId as number | string,
      quantity: quantity as number,
      codes: normalizedCodes,
    },
  }
}

export const quoteCheckout = async (
  rawInput: unknown,
  deps: QuoteCheckoutDeps,
): Promise<QuoteResult> => {
  const { payload } = deps
  const now = deps.now ?? new Date()

  // a. Parse + validate — quote needs only the three pricing-relevant fields.
  const validation = validateQuoteInput(rawInput)
  if (!validation.ok) {
    return { status: 400, body: { error: validation.error } }
  }
  const input = validation.value

  // b–c. Shared with processCheckout: session load + gates + code lookup + pricing --------
  const priced = await loadPricedSession({
    payload,
    sessionId: input.sessionId,
    quantity: input.quantity,
    codes: input.codes,
    country: deps.country ?? null,
    now,
  })
  if (!priced.ok) {
    return { status: priced.status, body: priced.body }
  }

  return {
    status: 200,
    body: {
      pricing: priced.pricing,
      session: priced.sessionView,
      currency: priced.currency,
    },
  }
}
