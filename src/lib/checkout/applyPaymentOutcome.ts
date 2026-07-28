import { APIError, type Payload } from 'payload'

import type { Order } from '../../payload-types'

export type PaymentOutcome = 'confirmed' | 'failed' | 'refunded'

export type ApplyPaymentOutcomeResult =
  | { ok: true; changed: boolean; order: Order }
  | { ok: false; reason: 'notFound' | 'providerMismatch' | 'refMismatch' | 'soldOut' | 'skipped' }

/**
 * Applies an asynchronous payment result (Netopia IPN / return-status poll) to an order,
 * idempotently — both channels can and will report the same payment, in any order, more
 * than once. Transition rules:
 *   - `confirmed`: from any not-confirmed state (pending, or failed — a late IPN outranks
 *     the return poll's earlier verdict). Re-confirming is a no-op. This write is what
 *     fires T5's atomic capacity-guarded seat consumption; its 409 (sold out in the
 *     meantime) is surfaced as `soldOut` so the caller can flag the needed refund.
 *   - `failed`: only from `pending` — never downgrades a confirmed order.
 *   - `refunded`: only from `confirmed` (T5 releases the seats symmetrically).
 *
 * `expectedProviderRef` cross-checks the processor's transaction id against the one we
 * stored at charge time, so a spoofed/mixed-up notification can never flip someone else's
 * order. An empty stored ref (async update raced the checkout write) accepts and heals.
 */
export const applyPaymentOutcome = async (args: {
  payload: Payload
  orderId: number
  outcome: PaymentOutcome
  expectedProvider: string
  expectedProviderRef?: string
}): Promise<ApplyPaymentOutcomeResult> => {
  const { payload, orderId, outcome, expectedProvider, expectedProviderRef } = args

  const order = (await payload
    .findByID({ collection: 'orders', id: orderId, overrideAccess: true, depth: 0 })
    .catch(() => null)) as Order | null

  if (!order) return { ok: false, reason: 'notFound' }
  if (order.provider !== expectedProvider) return { ok: false, reason: 'providerMismatch' }
  if (
    expectedProviderRef &&
    order.providerRef &&
    order.providerRef !== expectedProviderRef
  ) {
    return { ok: false, reason: 'refMismatch' }
  }

  const current = order.paymentStatus

  if (outcome === 'confirmed' && current === 'confirmed') return { ok: true, changed: false, order }
  if (outcome === 'failed' && current !== 'pending') return { ok: false, reason: 'skipped' }
  if (outcome === 'refunded' && current !== 'confirmed') return { ok: false, reason: 'skipped' }

  try {
    const updated = (await payload.update({
      collection: 'orders',
      id: orderId,
      data: {
        paymentStatus: outcome,
        ...(expectedProviderRef && !order.providerRef ? { providerRef: expectedProviderRef } : {}),
      },
      overrideAccess: true,
    })) as Order
    return { ok: true, changed: true, order: updated }
  } catch (err) {
    if (outcome === 'confirmed' && err instanceof APIError && err.status === 409) {
      // The buyer PAID but the capacity guard rejected the seat (sold out during the
      // hosted-page detour). The order stays pending; flag loudly — this needs a manual
      // refund by Silviu until a compensating-refund flow exists.
      payload.logger.error(
        `[payments] order ${orderId} was PAID but the edition sold out before confirmation — REFUND REQUIRED.`,
      )
      return { ok: false, reason: 'soldOut' }
    }
    throw err
  }
}
