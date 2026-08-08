import type { Payload } from 'payload'

import type { CourseSession, DiscountCode, SiteSetting } from '../../payload-types'
import { resolveCurrency, windowForCurrency, type Currency } from '../currency'
import { computeOrderPricing, type PricingSnapshot } from '../pricing'
import type { CheckoutFailureBody } from './processCheckout'

/**
 * Shared checkout/quote pipeline (T16 dedupe): session lookup → up-front status gates →
 * discount-code lookup → siteSettings → server-side `computeOrderPricing`. This is the
 * single source of truth for steps b–c of BOTH `processCheckout` (which goes on to create
 * the order and charge) and `quoteCheckout` (read-only preview) — including the exact
 * failure statuses/bodies, so the two endpoints can never drift apart on the shared error
 * contract (400 invalid code with `detail`, 404 session, 409 past / sold-out with
 * `soldOut` / no active window).
 */

export type LoadPricedSessionArgs = {
  payload: Payload
  sessionId: number | string
  quantity: number
  /** Normalized (trimmed) discount codes IN APPLICATION ORDER — empty array = no code.
   * Codes stack, max 2 (owner 2026-07-25); the engine enforces the cap + duplicates. */
  codes: string[]
  /** Visitor country code (geo header), resolved by the API route — never client-sent. */
  country: string | null
  now: Date
}

export type PricedSession = {
  ok: true
  session: CourseSession
  /** Display slice both endpoints return verbatim in their 200 bodies. */
  sessionView: { id: number; courseTitle: string; startDate: string }
  /** The looked-up code docs, in application order (order snapshot + usage accounting). */
  codeDocs: DiscountCode[]
  siteSettings: SiteSetting
  pricing: PricingSnapshot
  /** Currency the pricing above is denominated in (B1 — RON for RO visitors, else EUR). */
  currency: Currency
}

export type PricedSessionFailure = {
  ok: false
  status: 400 | 404 | 409
  body: CheckoutFailureBody
}

export type LoadPricedSessionResult = PricedSession | PricedSessionFailure

/** `session.course` may come back as a raw id or (at `depth >= 1`) a populated doc,
 * depending on how the session was read — this normalizes either shape down to a title. */
const courseTitleOf = (course: unknown): string => {
  if (course && typeof course === 'object' && 'title' in course) {
    const title = (course as { title?: unknown }).title
    return typeof title === 'string' ? title : ''
  }
  return ''
}

export const loadPricedSession = async ({
  payload,
  sessionId,
  quantity,
  codes,
  country,
  now,
}: LoadPricedSessionArgs): Promise<LoadPricedSessionResult> => {
  // b. Load the session; reject `past`/`soldOut` up front ---------------------------------
  const session = await payload
    .findByID({
      collection: 'courseSessions',
      id: sessionId,
      overrideAccess: true,
      depth: 1,
    })
    .catch(() => null)

  if (!session) {
    return { ok: false, status: 404, body: { error: 'Course session not found.' } }
  }

  if (session.status === 'past') {
    return { ok: false, status: 409, body: { error: 'This edition has already taken place.' } }
  }
  if (session.status === 'soldOut') {
    return { ok: false, status: 409, body: { error: 'This edition is sold out.', soldOut: true } }
  }

  const codeDocs: DiscountCode[] = []
  if (codes.length > 0) {
    const found = await payload.find({
      collection: 'discountCodes',
      where: { code: { in: codes } },
      overrideAccess: true,
      limit: codes.length,
    })
    // Preserve APPLICATION order (the order the buyer applied the codes in) and report
    // the FIRST code that doesn't exist — `codeValue` lets the UI attribute the error.
    for (const value of codes) {
      const match = found.docs.find((doc) => doc.code === value)
      if (!match) {
        return {
          ok: false,
          status: 400,
          body: { error: 'Invalid or expired discount code.', detail: 'notFound', codeValue: value },
        }
      }
      codeDocs.push(match)
    }
  }

  // c. Recompute pricing server-side — the ONLY source of truth for the amount charged ----
  const siteSettings = await payload.findGlobal({ slug: 'siteSettings', overrideAccess: true })

  // B1 — visitor currency from geo, config fallback; windows resolved BEFORE the engine so
  // a missing RON price can never bill the EUR amount (it renders the window inactive).
  const currency = resolveCurrency(country, (siteSettings.currency as Currency) ?? 'EUR')

  const pricingResult = computeOrderPricing({
    windows: {
      earlyBird: windowForCurrency(session.earlyBird, currency),
      standard: windowForCurrency(session.standard, currency),
    },
    quantity,
    codes: codeDocs.map((doc) => ({
      id: doc.id,
      code: doc.code,
      percentage: doc.percentage,
      expiresAt: doc.expiresAt,
      usageLimit: doc.usageLimit,
      usageCount: doc.usageCount ?? 0,
      type: doc.type,
      isActive: doc.isActive ?? true,
    })),
    // Never trust a client-asserted membership claim (CLAUDE.md §13) — the only path to
    // member pricing is a valid `type: 'member'` discount code, handled inside the engine.
    isMember: false,
    policy: siteSettings.stackingPolicy ?? 'stackAll',
    // Member pricing retired (owner 2026-08-08) — the field is gone from siteSettings;
    // member-type codes now behave like any other code.
    memberDiscountPercent: 0,
    now,
  })

  if (!pricingResult.ok) {
    if (pricingResult.reason === 'noActiveWindow') {
      return { ok: false, status: 409, body: { error: 'Enrolment is not open for this edition.' } }
    }
    if (pricingResult.reason === 'invalidCode') {
      return {
        ok: false,
        status: 400,
        body: {
          error: 'Invalid or expired discount code.',
          detail: pricingResult.detail,
          codeValue: pricingResult.codeValue,
        },
      }
    }
    if (pricingResult.reason === 'tooManyCodes') {
      return {
        ok: false,
        status: 400,
        body: { error: 'At most 2 discount codes can be applied per order.' },
      }
    }
    // 'invalidQuantity' — already guarded by both callers' input validation; kept
    // defensively so an engine-level rule change can never surface as an unhandled crash.
    return { ok: false, status: 400, body: { error: 'Invalid quantity.' } }
  }

  return {
    ok: true,
    session,
    sessionView: {
      id: session.id,
      courseTitle: courseTitleOf(session.course),
      startDate: String(session.startDate),
    },
    codeDocs,
    siteSettings,
    pricing: pricingResult.pricing,
    currency,
  }
}
