import { NotImplementedError } from './types'
import type { CreatePaymentResult, PaymentProvider } from './types'

/**
 * Inert stub — Stripe is not signed (CLAUDE.md §13: "Payment processor TBD, stub until
 * signed"). Wire real Stripe Payment Intents / Checkout Sessions here once
 * `STRIPE_SECRET_KEY` (and friends) land in env; until then `createPayment` always throws so
 * `PAYMENT_PROVIDER=stripe` can never silently pretend to take a payment. Takes no input —
 * there is nothing to charge against yet.
 */
export const StripeProvider: PaymentProvider = {
  name: 'stripe',
  async createPayment(): Promise<CreatePaymentResult> {
    throw new NotImplementedError('stripe')
  },
}
