import { getPayload } from 'payload'

import config from '../../../../payload.config'
import { parseJsonBody } from '../../../../lib/api/parseJsonBody'
import { enforceRateLimit } from '../../../../lib/api/rateLimit'
import { quoteCheckout } from '../../../../lib/checkout/quoteCheckout'
import { getVisitorCountry } from '../../../../lib/currency'

/** A quote body is `{ sessionId, quantity, code? }` — a few dozen bytes; 5KB is generous. */
const MAX_BODY_BYTES = 5_000

/**
 * `POST /api/checkout/quote` — read-only, server-authoritative price preview for the T10
 * checkout UI (live breakdown + discount-code validation BEFORE payment). Thin route, same
 * shape as `POST /api/checkout`: all logic lives in `quoteCheckout`, which reuses
 * processCheckout's session/code lookup + `computeOrderPricing` but creates nothing and
 * increments nothing.
 *
 * Response contract:
 *   200 { pricing, session: { id, courseTitle, startDate } }
 *   400 { error, detail? }  — validation / invalid code (detail: notFound | inactive |
 *                             expired | usageLimitReached)
 *   404 { error }           — session not found
 *   409 { error, soldOut? } — past / sold out (soldOut: true) / no active price window
 */
export async function POST(request: Request): Promise<Response> {
  // Recalcul live de preț la fiecare tastare de cod — limită mai permisivă, dar mărginită.
  const limited = enforceRateLimit(request, { name: 'quote', limit: 40, windowMs: 10 * 60 * 1000 })
  if (limited) return limited

  const parsed = await parseJsonBody(request, MAX_BODY_BYTES)
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: parsed.status })
  }

  const payload = await getPayload({ config })
  const result = await quoteCheckout(parsed.body, { payload, country: getVisitorCountry(request.headers) })

  return Response.json(result.body, { status: result.status })
}
