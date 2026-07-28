import { getPayload } from 'payload'

import config from '../../../payload.config'
import { parseJsonBody } from '../../../lib/api/parseJsonBody'
import { processCheckout } from '../../../lib/checkout/processCheckout'
import { getVisitorCountry } from '../../../lib/currency'
import { LOCALE_COOKIE } from '../../../lib/i18n/config'

/** The `locale` cookie set by the language switcher — display-only (hosted payment page
 * language); pricing/geo never read it. */
const getVisitorLocale = (headers: Headers): string | null => {
  const match = headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
  return match ? match.slice(LOCALE_COOKIE.length + 1) : null
}

/** Guards against parsing an arbitrarily large request body (CLAUDE.md quality floor —
 * "reject oversized payloads"). A real checkout body (buyer + a realistic number of
 * participants) is a few hundred bytes to a few KB; 20KB is generous headroom. */
const MAX_BODY_BYTES = 20_000

/**
 * `POST /api/checkout` — single-edition checkout (CLAUDE.md §3.2, no cart). Deliberately
 * thin: all business logic (validation, server-side pricing recompute, order creation,
 * payment, T5 seat consumption, discount-code usage accounting) lives in
 * `processCheckout`, so it is unit/integration-testable by direct invocation without
 * booting the Next.js dev server (see tests/int/checkout.int.spec.ts).
 *
 * Response contract for T10 (the confirmation page renders from THIS response — orders have
 * no public read access, CLAUDE.md §4):
 *   200 { orderId, status: 'confirmed' | 'requiresAction', pricing, session, participants }
 *   4xx { error, detail?, soldOut? } — see `processCheckout`'s `CheckoutFailureBody`.
 */
export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, MAX_BODY_BYTES)
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: parsed.status })
  }

  const payload = await getPayload({ config })
  const result = await processCheckout(parsed.body, {
    payload,
    country: getVisitorCountry(request.headers),
    locale: getVisitorLocale(request.headers),
  })

  return Response.json(result.body, { status: result.status })
}
