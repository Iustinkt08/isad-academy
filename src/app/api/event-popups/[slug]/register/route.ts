import { getPayload } from 'payload'

import config from '../../../../../payload.config'
import { parseJsonBody } from '../../../../../lib/api/parseJsonBody'
import { enforceRateLimit, RL_FORM } from '../../../../../lib/api/rateLimit'
import { registerForEventPopup } from '../../../../../lib/events/registerForEventPopup'

/** Câteva câmpuri scurte; 20KB e marjă generoasă (la fel ca /api/leads/submit). */
const MAX_BODY_BYTES = 20_000

/**
 * `POST /api/event-popups/:slug/register` — înscriere la evenimentul unui pop-up (spec §4).
 *
 * Deliberat subțire: honeypot, validare, dedupe și scriere trăiesc în `registerForEventPopup`,
 * ca să fie testabile prin invocare directă, fără HTTP. Ruta se ocupă doar de ce ține de
 * transport: rate limiting, mărimea corpului, și extragerea IP-ului și user-agent-ului pentru
 * dovada de consimțământ.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const limited = enforceRateLimit(request, { name: 'event-popup-register', ...RL_FORM })
  if (limited) return limited

  const parsed = await parseJsonBody(request, MAX_BODY_BYTES)
  if (!parsed.ok) {
    return Response.json({ ok: false, error: parsed.error }, { status: parsed.status })
  }

  const { slug } = await params
  const payload = await getPayload({ config })

  // În spatele proxy-ului cPanel/Passenger, `x-forwarded-for` e singurul loc cu IP-ul real.
  // Luăm PRIMA valoare din listă: restul sunt proxy-uri, iar ultima e cea mai ușor de falsificat.
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'unknown'
  const userAgent = request.headers.get('user-agent')?.slice(0, 500) ?? 'unknown'

  const result = await registerForEventPopup(parsed.body, { payload, slug, ip, userAgent })
  return Response.json(result.body, { status: result.status })
}
