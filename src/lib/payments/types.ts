/**
 * Vendor-agnostic payment provider contract (CLAUDE.md §2 `PAYMENT_PROVIDER`, §3 principle
 * 6 — "provider-e swappable", never lean business logic on a specific vendor).
 *
 * Deliberately redirect-capable even though the only real implementation today
 * (`MockProvider`) never needs it: a hosted-page processor like Netopia (or EuPlătesc)
 * confirms a payment asynchronously — `createPayment` returns `status: 'requiresAction'`
 * plus a `redirectUrl`, the caller (checkout API / a future return-URL or webhook endpoint)
 * sends the buyer there, and a LATER request confirms the order once the processor calls
 * back. Stripe Checkout/PaymentIntents fits the same shape (`requiresAction` while a
 * redirect/3DS step is pending).
 */

export type PaymentStatusResult = 'confirmed' | 'requiresAction' | 'failed'

export type CreatePaymentInput = {
  /** The `orders` doc id this payment is for — already created as `pending` by the caller
   * before `createPayment` is invoked (checkout never charges before it has an order to
   * attach the charge to). */
  orderId: number | string
  /** The server-computed total (CLAUDE.md §8) — NEVER a client-supplied amount. */
  amount: number
  currency: string
  buyerEmail: string
}

export type CreatePaymentResult = {
  /** Opaque provider-side transaction/session identifier, persisted to `orders.providerRef`. */
  providerRef: string
  status: PaymentStatusResult
  /** Present only when `status === 'requiresAction'` — where to send the buyer next
   * (a hosted payment page). Absent for providers that resolve synchronously. */
  redirectUrl?: string
}

/**
 * A `PaymentProvider` never decides on its own what an order's final state should be beyond
 * reporting `status` — seat consumption, order status transitions and discount-code
 * accounting all stay the caller's (checkout service's) responsibility, so every provider
 * behaves identically from that point on regardless of vendor.
 */
export interface PaymentProvider {
  name: string
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>
}

/**
 * Thrown by every not-yet-implemented provider stub (Stripe/Netopia/EuPlătesc — CLAUDE.md
 * §13, "TBD, stub until signed"). Deliberately loud: a checkout must never silently
 * "succeed" against a processor nobody actually wired up.
 */
export class NotImplementedError extends Error {
  constructor(providerName: string) {
    super(
      `The "${providerName}" payment provider is not implemented yet. Set PAYMENT_PROVIDER=mock ` +
        `until a real processor is signed and wired up (CLAUDE.md §13).`,
    )
    this.name = 'NotImplementedError'
  }
}
