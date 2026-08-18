import { APIError, type Payload } from 'payload'

import type { Order } from '../../payload-types'

export type PaymentOutcome = 'confirmed' | 'failed' | 'refunded'

export type ApplyPaymentOutcomeResult =
  | { ok: true; changed: boolean; order: Order }
  | {
      ok: false
      reason: 'notFound' | 'providerMismatch' | 'refMismatch' | 'amountMismatch' | 'soldOut' | 'skipped'
    }

/**
 * Applies an asynchronous payment result (Netopia IPN / return-status poll) to an order,
 * idempotently: both channels can and will report the same payment, in any order, more
 * than once. Transition rules:
 *   - `confirmed`: from `pending` or `failed` (a late IPN outranks the return poll's
 *     earlier verdict), NEVER from `refunded` (money already went back, the seat is
 *     already released; a replayed paid-IPN must not re-consume it). Re-confirming is a
 *     no-op. This write is what fires T5's atomic capacity-guarded seat consumption; its
 *     409 (sold out in the meantime) is surfaced as `soldOut` so the caller can flag the
 *     needed refund.
 *   - `failed`: only from `pending`, never downgrades a confirmed order.
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
  /** Suma/moneda raportate de procesator (IPN). Când sunt date, se compară cu totalul
   * snapshot al comenzii ÎNAINTE de confirmare, deci o captură parțială sau o sumă
   * nepotrivită nu mai confirmă comanda la preț întreg (securitate). Suma poate sosi și
   * ca string numeric (JSON-ul IPN nu garantează tipul). Canalul de return-poll nu le
   * are, deci verificarea e opțională. */
  expectedAmount?: number | string
  expectedCurrency?: string
}): Promise<ApplyPaymentOutcomeResult> => {
  const { payload, orderId, outcome, expectedProvider, expectedProviderRef, expectedCurrency } = args

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

  // Idempotență ÎNAINTEA verificării de sumă (feedback verificare Netopia, 2026-08-18):
  // un IPN retrimis/replicat pentru o comandă deja rezolvată nu schimbă nimic, deci nu
  // are ce "nepotrivire" să semnaleze; răspunsul corect e succes fără efect. Tot aici:
  // o comandă REFUNDED nu se mai re-confirmă niciodată dintr-un IPN de plată întârziat,
  // banii au fost deja returnați și locul eliberat.
  if (outcome === 'confirmed' && current === 'confirmed') return { ok: true, changed: false, order }
  if (outcome === 'confirmed' && current === 'refunded') return { ok: false, reason: 'skipped' }
  if (outcome === 'failed' && current !== 'pending') return { ok: false, reason: 'skipped' }
  if (outcome === 'refunded' && current !== 'confirmed') return { ok: false, reason: 'skipped' }

  // Verificarea sumei: doar la confirmarea efectivă (de aici încolo chiar tranziționăm),
  // doar când procesatorul a raportat o sumă și comanda are un total snapshot. 1 ban
  // toleranță pentru rotunjiri float.
  const reportedAmount =
    typeof args.expectedAmount === 'string' ? Number(args.expectedAmount) : args.expectedAmount
  if (
    outcome === 'confirmed' &&
    typeof reportedAmount === 'number' &&
    Number.isFinite(reportedAmount) &&
    typeof order.pricing?.total === 'number'
  ) {
    const amountOk = Math.abs(reportedAmount - order.pricing.total) <= 0.01
    const currencyOk =
      !expectedCurrency ||
      !order.pricing.currency ||
      expectedCurrency.toUpperCase() === order.pricing.currency.toUpperCase()
    if (!amountOk || !currencyOk) {
      payload.logger.error(
        `[payments] order ${orderId} amount/currency mismatch: paid ${reportedAmount} ${expectedCurrency ?? '?'}, expected ${order.pricing.total} ${order.pricing.currency ?? '?'}; NOT confirming.`,
      )
      return { ok: false, reason: 'amountMismatch' }
    }
  }

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
