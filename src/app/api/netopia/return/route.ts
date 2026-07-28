import { getPayload } from 'payload'

import config from '../../../../payload.config'
import { applyPaymentOutcome } from '../../../../lib/checkout'
import { localePath, type Locale } from '../../../../lib/i18n/config'
import { getNetopiaPaymentStatus, mapNetopiaStatus, parseNetopiaOrderId } from '../../../../lib/payments/netopia'
import type { Order } from '../../../../payload-types'

export type ReturnOutcome = 'paid' | 'pending' | 'failed'

/**
 * `/api/netopia/return` — where Netopia's hosted page sends the buyer's BROWSER back
 * after the payment attempt. Query params (`order`, `ref`, `locale`) were baked into the
 * redirect URL by our own `createPayment`, but they arrive client-side and are therefore
 * untrusted: they only select which order to look at — every status decision comes from
 * Netopia's `/operation/status` API (or an IPN that already landed), never from the URL.
 *
 * The status poll doubles as the IPN fallback for local sandbox testing, where Netopia
 * cannot reach a localhost notify URL: without it, a sandbox payment would confirm on
 * Netopia's side but the order would stay `pending` forever. In production both channels
 * run; whichever lands first wins and the other becomes a no-op (`applyPaymentOutcome`
 * is idempotent).
 *
 * The buyer always ends up on `/checkout/confirmare?outcome=paid|pending|failed`, which
 * renders the recap stored in sessionStorage by the checkout form before the redirect.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const orderId = Number(url.searchParams.get('order'))
  const ref = url.searchParams.get('ref') ?? ''
  const locale: Locale = url.searchParams.get('locale') === 'ro' ? 'ro' : 'en'

  // Behind the cPanel/Passenger proxy `request.url` carries the INTERNAL origin — the
  // canonical public URL is the safe base for a browser-facing redirect.
  const publicOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '') || url.origin
  const confirmationUrl = (outcome: ReturnOutcome) =>
    new URL(`${localePath(locale, '/checkout/confirmare')}?outcome=${outcome}`, publicOrigin)

  if (!Number.isInteger(orderId) || orderId <= 0 || parseNetopiaOrderId(ref) !== orderId) {
    return Response.redirect(confirmationUrl('pending'), 303)
  }

  const payload = await getPayload({ config })
  const order = (await payload
    .findByID({ collection: 'orders', id: orderId, overrideAccess: true, depth: 0 })
    .catch(() => null)) as Order | null

  if (!order || order.provider !== 'netopia') {
    return Response.redirect(confirmationUrl('pending'), 303)
  }

  // Still pending → the IPN hasn't landed (or can't reach us) — ask Netopia directly.
  if (order.paymentStatus === 'pending' && order.providerRef) {
    try {
      const status = await getNetopiaPaymentStatus(order.providerRef, ref)
      const outcome = status === null ? null : mapNetopiaStatus(status)
      if (outcome) {
        await applyPaymentOutcome({
          payload,
          orderId,
          outcome,
          expectedProvider: 'netopia',
          expectedProviderRef: order.providerRef,
        })
        payload.logger.info(
          `[netopia:return] order ${orderId} → ${outcome} via status poll (netopia status ${status})`,
        )
      }
    } catch (err) {
      // Poll failures are non-fatal by design: the IPN remains the authoritative channel,
      // and the buyer just sees the "payment processing" state meanwhile.
      payload.logger.warn(
        `[netopia:return] status poll failed for order ${orderId}: ${err instanceof Error ? err.message : err}`,
      )
    }
  }

  const finalOrder = (await payload
    .findByID({ collection: 'orders', id: orderId, overrideAccess: true, depth: 0 })
    .catch(() => null)) as Order | null

  const outcome: ReturnOutcome =
    finalOrder?.paymentStatus === 'confirmed'
      ? 'paid'
      : finalOrder?.paymentStatus === 'failed' || finalOrder?.paymentStatus === 'refunded'
        ? 'failed'
        : 'pending'

  return Response.redirect(confirmationUrl(outcome), 303)
}

/** Some processor flows return the buyer via POST — treat it exactly like the GET. */
export const POST = GET
