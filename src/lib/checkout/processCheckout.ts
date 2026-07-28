import { APIError, type Payload } from 'payload'

import type { PricingSnapshot } from '../pricing'
import { getPaymentProvider } from '../payments'
import { incrementDiscountCodeUsage } from './incrementDiscountCodeUsage'
import { loadPricedSession } from './loadPricedSession'
import { maskEmail } from './maskEmail'
import { validateCheckoutInput } from './validateCheckoutInput'

export type CheckoutFailureDetail =
  | 'inactive'
  | 'expired'
  | 'usageLimitReached'
  | 'notFound'
  | 'duplicate'

export type CheckoutSuccessBody = {
  orderId: number
  status: 'confirmed' | 'requiresAction'
  redirectUrl?: string
  pricing: PricingSnapshot
  session: { id: number; courseTitle: string; startDate: string }
  participants: { name: string; email: string }[]
  /** Buyer's email — the confirmation page's "email on its way to {email}" line. */
  buyerEmail?: string
  /** Currency the order was actually priced/charged in (B1 geo resolution). */
  currency?: string
}

export type CheckoutFailureBody = {
  error: string
  detail?: CheckoutFailureDetail
  /** For code failures with 2 applied codes: WHICH code failed (the human-entered string). */
  codeValue?: string
  soldOut?: boolean
}

export type CheckoutResult =
  | { status: 200; body: CheckoutSuccessBody }
  | { status: 400 | 402 | 404 | 409; body: CheckoutFailureBody }

export type ProcessCheckoutDeps = {
  payload: Payload
  /** Visitor country code from the geo header (B1) — resolved by the route, never client-sent. */
  country?: string | null
  /** Page locale ('en' | 'ro') from the locale cookie — hosted payment pages (Netopia)
   * render in it. Display-only; never affects pricing. */
  locale?: string | null
  /** Injected clock, mirroring the pricing engine's own contract — lets tests pin "now"
   * deterministically instead of racing the system clock against fixture date windows. */
  now?: Date
}

/**
 * Orchestrates a single-edition checkout (CLAUDE.md §3.2, §6, §8) end to end. Kept separate
 * from the thin `POST /api/checkout` route handler specifically so it can be
 * integration-tested by direct invocation (no dev server / no real HTTP round-trip needed —
 * see tests/int/checkout.int.spec.ts).
 *
 * Flow (lettered to match docs/PLAN.md T6 / the build instructions):
 *   a. Validate the raw input (`validateCheckoutInput`) — client-sent totals/pricing/
 *      isMember are never read past this point.
 *   b–c. `loadPricedSession` (shared with `quoteCheckout`, T16): load the session; reject
 *      `past`/`soldOut` up front; look up the discount code (if any); recompute pricing
 *      server-side (`computeOrderPricing`) — the ONLY source of truth for the amount
 *      actually charged and snapshotted.
 *   d. Create the order as `pending` with the full pricing snapshot.
 *   e. Charge via the active `PaymentProvider`; a `'failed'` result marks the order `failed`
 *      and stops here (seats untouched).
 *   f. A `'confirmed'` result flips the order to `paymentStatus: 'confirmed'` — this is what
 *      fires T5's atomic, capacity-guarded seat consumption. If that guard rejects (session
 *      sold out in the race between (b) and now), the order is left `pending` (T5's
 *      transaction rollback already guarantees this) and the caller gets a 409.
 *   g. On a successful confirm with a discount code applied, best-effort atomically
 *      increment the code's `usageCount` (see `incrementDiscountCodeUsage` for the "lost
 *      race" decision).
 */
export const processCheckout = async (
  rawInput: unknown,
  deps: ProcessCheckoutDeps,
): Promise<CheckoutResult> => {
  const { payload } = deps
  const now = deps.now ?? new Date()

  // a. Parse + validate ------------------------------------------------------------------
  const validation = validateCheckoutInput(rawInput)
  if (!validation.ok) {
    return { status: 400, body: { error: validation.error } }
  }
  const input = validation.value

  // b–c. Shared with quoteCheckout: session load + gates + code lookup + pricing ----------
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

  const { session, sessionView, codeDocs, pricing } = priced

  // d. Create the pending order -------------------------------------------------------------
  const order = await payload.create({
    collection: 'orders',
    data: {
      session: session.id,
      quantity: input.quantity,
      buyer: {
        name: input.buyer.name,
        email: input.buyer.email,
        phone: input.buyer.phone,
        isCompany: input.buyer.isCompany,
        companyName: input.buyer.companyName,
        cui: input.buyer.cui,
        address: input.buyer.address,
      },
      participants: input.participants,
      pricing: {
        basePrice: pricing.basePrice,
        currency: priced.currency,
        appliedWindow: pricing.appliedWindow,
        groupDiscount: pricing.groupDiscount,
        memberDiscount: pricing.memberDiscount,
        // `code` = first code (legacy field, admin continuity); `codes` = the full list.
        code: codeDocs[0]?.id ?? null,
        codes: codeDocs.map((doc) => doc.id),
        codeDiscount: pricing.codeDiscount,
        total: pricing.total,
      },
      paymentStatus: 'pending',
    },
    overrideAccess: true,
  })

  payload.logger.info(
    `[checkout] order ${order.id} created (pending) — session=${session.id} qty=${input.quantity} buyer=${maskEmail(input.buyer.email)}`,
  )

  // e. Charge via the active provider --------------------------------------------------------
  const provider = getPaymentProvider()
  const paymentResult = await provider.createPayment({
    orderId: order.id,
    amount: pricing.total,
    // The currency the engine actually priced in (B1 geo resolution) — matches the
    // `pricing.currency` snapshot above, NOT the raw siteSettings default.
    currency: priced.currency,
    buyerEmail: input.buyer.email,
    buyerName: input.buyer.name,
    buyerPhone: input.buyer.phone,
    description: sessionView.courseTitle || undefined,
    language: deps.locale === 'ro' ? 'ro' : 'en',
  })

  if (paymentResult.status === 'failed') {
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: { paymentStatus: 'failed', provider: provider.name, providerRef: paymentResult.providerRef },
      overrideAccess: true,
    })
    payload.logger.warn(`[checkout] order ${order.id} payment failed via provider "${provider.name}"`)
    return { status: 402, body: { error: 'Payment failed.' } }
  }

  if (paymentResult.status === 'requiresAction') {
    // Future redirect-based provider (e.g. Netopia hosted page): the order stays `pending`
    // and NO seats are consumed yet — a separate return/webhook endpoint (not built in T6)
    // would later flip it to `confirmed`, running through the exact same T5 seat-consumption
    // path as the branch below.
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: { provider: provider.name, providerRef: paymentResult.providerRef },
      overrideAccess: true,
    })
    return {
      status: 200,
      body: {
        orderId: order.id,
        status: 'requiresAction',
        redirectUrl: paymentResult.redirectUrl,
        pricing,
        session: sessionView,
        participants: input.participants,
        buyerEmail: input.buyer.email,
        currency: priced.currency,
      },
    }
  }

  // f. Confirm — this is what fires T5's atomic, capacity-guarded seat consumption ------------
  try {
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: { paymentStatus: 'confirmed', provider: provider.name, providerRef: paymentResult.providerRef },
      overrideAccess: true,
    })
  } catch (err) {
    if (err instanceof APIError && err.status === 409) {
      // T5's guard rejected the write and rolled back the whole transaction — the order is
      // left `pending` in the DB (verified in tests/int/checkout.int.spec.ts), never
      // `confirmed`. The buyer was "charged" by the provider but the seat could not be
      // honored; a real (non-mock) provider integration would need a compensating refund
      // here — flagged for T7/finance follow-up, not built in T6.
      payload.logger.warn(`[checkout] order ${order.id} lost the seat race at confirm-time (sold out)`)
      return { status: 409, body: { error: 'This edition just sold out.', soldOut: true } }
    }
    throw err
  }

  // g. Discount code usage accounting — best-effort, NEVER undoes an already-confirmed order.
  for (const codeDoc of codeDocs) {
    const applied = await incrementDiscountCodeUsage(payload, codeDoc.id)
    if (!applied) {
      // Race: the code's usageLimit was consumed by a concurrent order between this
      // request's own validation (step c, above) and this increment. Decision (flagged for
      // the T16 audit): the order STANDS, confirmed, at the price already snapshotted —
      // unwinding a paid, seat-consumed order over a discount-code accounting race would be
      // strictly worse than the rare, bounded over-redemption. Logged so Silviu can spot an
      // over-redeemed code in the admin.
      payload.logger.warn(
        `[checkout] discount code "${codeDoc.code}" (id ${codeDoc.id}) usage increment lost a race for order ${order.id} — order stands confirmed`,
      )
    }
  }

  payload.logger.info(`[checkout] order ${order.id} confirmed via provider "${provider.name}"`)

  return {
    status: 200,
    body: {
      orderId: order.id,
      status: 'confirmed',
      pricing,
      session: sessionView,
      participants: input.participants,
      buyerEmail: input.buyer.email,
      currency: priced.currency,
    },
  }
}
