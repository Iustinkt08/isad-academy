import { getPayload } from 'payload'

import config from '../../../../payload.config'
import { applyPaymentOutcome } from '../../../../lib/checkout'
import { getNetopiaConfig, mapNetopiaStatus, parseNetopiaOrderId } from '../../../../lib/payments/netopia'
import { verifyNetopiaIpn } from '../../../../lib/payments/netopiaIpn'

/** An IPN body is a small JSON document; anything bigger is not Netopia. */
const MAX_BODY_BYTES = 100_000

/** Netopia's expected acknowledgement shape (mirrors the official SDKs' IPN result). */
const ack = (status: number, errorMessage = '') =>
  Response.json({ errorType: errorMessage ? 2 : 0, errorCode: errorMessage ? 1 : 0, errorMessage }, { status })

/**
 * `POST /api/netopia/ipn` — Netopia's server-to-server payment notification (the
 * authoritative confirmation channel). The request is authenticated by the signed
 * `Verification-token` JWT (see `verifyNetopiaIpn`), never by its body alone. A verified
 * PAID/CONFIRMED status is what flips the order to `confirmed` and consumes seats
 * (atomically, via the Orders afterChange hook); non-final statuses are acknowledged and
 * ignored.
 *
 * Response contract (Netopia's activation checklist, 2026-08-15): the notify URL must
 * answer HTTP 200 with JSON `{"errorCode": 0}` — their reviewer flags ANY non-200 as
 * `INVALID_RESPONSE_STATUS`. So every handled outcome (including rejected/unverifiable
 * notifications, which are logged and NOT processed) returns 200 with a non-zero
 * `errorCode`; non-2xx is reserved for states where a Netopia retry can actually help:
 * missing configuration (503) and genuine server faults (uncaught → 500).
 */
export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text()
  if (rawBody.length > MAX_BODY_BYTES) {
    return ack(413, 'Payload too large.')
  }

  const publicKeyPem = process.env.NETOPIA_PUBLIC_KEY?.trim()
  if (!publicKeyPem) {
    // Fail loudly: without the certificate we cannot authenticate ANY notification, and
    // silently trusting one would let anyone confirm orders with a curl call.
    return ack(503, 'NETOPIA_PUBLIC_KEY is not configured — IPN cannot be verified.')
  }

  let posSignature: string
  try {
    posSignature = getNetopiaConfig().posSignature
  } catch (err) {
    return ack(503, err instanceof Error ? err.message : 'Netopia is not configured.')
  }

  // În perioada de verificare Netopia, tokenul de test poate fi emis pe semnătura LIVE
  // în timp ce plățile rulează încă pe sandbox — `_ALT` acceptă ambele audiențe.
  const altSignatures = (process.env.NETOPIA_POS_SIGNATURE_ALT ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const verification = verifyNetopiaIpn(rawBody, request.headers.get('verification-token'), {
    publicKeyPem,
    posSignature: [posSignature, ...altSignatures],
  })

  const payload = await getPayload({ config })

  if (!verification.ok) {
    payload.logger.warn(`[netopia:ipn] rejected notification — ${verification.reason}`)
    return ack(200, verification.reason)
  }

  const { order: ipnOrder, payment } = verification.payload
  const orderId = parseNetopiaOrderId(ipnOrder?.orderID)
  const status = payment?.status

  // Sub Passenger, stdout-ul (pino) se pierde in /dev/null; stderr ajunge in stderr.log.
  // Sumarul fiecarui IPN verificat ramane astfel vizibil in productie (fara PII).
  console.error(
    `[netopia:ipn] verified notification: orderID=${ipnOrder?.orderID ?? '?'} status=${status ?? '?'} ` +
      `payment=${payment?.amount ?? '?'} ${payment?.currency ?? '?'} order=${ipnOrder?.amount ?? '?'} ${ipnOrder?.currency ?? '?'} ntpID=${payment?.ntpID ?? '?'}`,
  )

  if (orderId === null || typeof status !== 'number') {
    payload.logger.warn(
      `[netopia:ipn] verified but unusable payload (orderID=${ipnOrder?.orderID}, status=${status})`,
    )
    return ack(200, 'Missing orderID or payment status.')
  }

  const outcome = mapNetopiaStatus(status)
  if (!outcome) {
    payload.logger.info(`[netopia:ipn] order ${orderId} status ${status} — informational, no action`)
    return ack(200)
  }

  const result = await applyPaymentOutcome({
    payload,
    orderId,
    outcome,
    expectedProvider: 'netopia',
    expectedProviderRef: payment?.ntpID,
    // Ultima verificare independentă: sumele raportate vs. totalul comenzii. Ambele
    // perechi din IPN (payment = decontarea, order = comanda originală), oricare valida.
    reportedPayments: [
      { amount: payment?.amount, currency: payment?.currency },
      { amount: ipnOrder?.amount, currency: ipnOrder?.currency },
    ],
  })

  if (result.ok) {
    payload.logger.info(
      `[netopia:ipn] order ${orderId} → ${outcome} (netopia status ${status}${result.changed ? '' : ', already applied'})`,
    )
    return ack(200)
  }

  if (result.reason === 'soldOut') {
    // Paid but unseatable — applyPaymentOutcome already logged the refund-required alert.
    // Acknowledge so Netopia stops retrying; the money side is a manual follow-up.
    return ack(200)
  }
  if (result.reason === 'skipped') {
    // e.g. a late "failed" for an order the return-poll already confirmed — nothing to do.
    return ack(200)
  }
  if (result.reason === 'amountMismatch') {
    // Sumă/monedă nepotrivite, applyPaymentOutcome a logat deja. NU confirmăm; cerem
    // Netopiei să nu retrimită (e o discrepanță care se rezolvă manual, nu prin retry).
    return ack(200, 'Amount mismatch, order left unconfirmed for manual review.')
  }

  payload.logger.warn(`[netopia:ipn] order ${orderId} → ${outcome} rejected (${result.reason})`)
  // Retrying cannot fix an unknown/invalid order, so acknowledge with a non-zero errorCode.
  return ack(200, `Order lookup failed: ${result.reason}.`)
}
