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
  /** Perechile sumă+monedă raportate de procesator în IPN (blocul `payment` și blocul
   * `order`, în această ordine). Când există, se compară cu totalul snapshot al comenzii
   * ÎNAINTE de confirmare, deci o captură parțială nu mai confirmă comanda la preț întreg
   * (securitate). Reguli (feedback verificare Netopia 2026-08-18, testat pe sandbox):
   *   - oricare pereche care se potrivește (sumă în ±0.01, monedă egală sau lipsă) trece;
   *   - o pereche decontată în ALTĂ monedă decât a comenzii nu se poate compara fără
   *     cursul procesatorului (sandbox-ul convertește EUR în RON), deci nu blochează;
   *   - doar o nepotrivire de sumă în ACEEAȘI monedă, fără nicio pereche validă, refuză.
   * Sumele pot sosi și ca string numeric. Canalul de return-poll nu le are (opțional). */
  reportedPayments?: Array<{ amount?: number | string | null; currency?: string | null }>
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
  // doar când procesatorul a raportat sume și comanda are un total snapshot. 1 ban
  // toleranță pentru rotunjiri float.
  if (outcome === 'confirmed' && typeof order.pricing?.total === 'number') {
    const total = order.pricing.total
    const orderCurrency = order.pricing.currency ?? null
    const candidates = (args.reportedPayments ?? [])
      .map((pair) => ({
        amount: typeof pair.amount === 'string' ? Number(pair.amount) : pair.amount,
        currency: typeof pair.currency === 'string' && pair.currency.trim() ? pair.currency.trim() : null,
      }))
      .filter((pair) => typeof pair.amount === 'number' && Number.isFinite(pair.amount))

    if (candidates.length > 0) {
      const sameCurrency = (currency: string | null) =>
        !currency || !orderCurrency || currency.toUpperCase() === orderCurrency.toUpperCase()
      const matches = candidates.some(
        (pair) => sameCurrency(pair.currency) && Math.abs((pair.amount as number) - total) <= 0.01,
      )
      const describe = candidates
        .map((pair) => `${pair.amount} ${pair.currency ?? '?'}`)
        .join(' / ')

      if (!matches) {
        // Toate perechile sunt în altă monedă => procesatorul a decontat prin conversie
        // (ex. sandbox: EUR platit ca RON). Nu avem cursul lui, deci nu comparăm; poarta
        // de autenticitate rămâne semnătura JWT a notificării.
        const allForeignCurrency = candidates.every((pair) => !sameCurrency(pair.currency))
        if (allForeignCurrency) {
          payload.logger.info(
            `[payments] order ${orderId} settled in a different currency (${describe}; order total ${total} ${orderCurrency ?? '?'}); amount check skipped.`,
          )
        } else {
          payload.logger.error(
            `[payments] order ${orderId} amount mismatch: paid ${describe}, expected ${total} ${orderCurrency ?? '?'}; NOT confirming.`,
          )
          return { ok: false, reason: 'amountMismatch' }
        }
      }
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
