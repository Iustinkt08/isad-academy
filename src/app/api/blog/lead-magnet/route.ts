import { getPayload } from 'payload'

import config from '../../../../payload.config'
import { parseJsonBody } from '../../../../lib/api/parseJsonBody'
import { enforceRateLimit, RL_FORM } from '../../../../lib/api/rateLimit'
import { deliverLeadMagnet } from '../../../../lib/blog/deliverLeadMagnet'

/** Guards against parsing an arbitrarily large request body (mirrors /api/leads/submit). A real
 * body is `{ slug, email }` — well under 1KB; 5KB is generous headroom. */
const MAX_BODY_BYTES = 5_000

/**
 * `POST /api/blog/lead-magnet` — gated-article download delivery (CLAUDE.md §4
 * `blogPosts.leadMagnet`, §6 Blog). Deliberately thin: honeypot handling, allow-listed
 * validation, published-post + enabled-magnet checks and the email send all live in
 * `deliverLeadMagnet` (src/lib/blog), so they are testable by direct invocation.
 *
 * Contract:
 *   200 { ok: true }            — link emailed (or honeypot-tripped no-op, indistinguishable)
 *   400 { ok: false, error }    — invalid body
 *   404 { ok: false, error }    — no such published article / no enabled lead magnet
 *   413 { ok: false, error }    — oversized body
 *   502 { ok: false, error }    — mailer reported a failure
 */
export async function POST(request: Request): Promise<Response> {
  const limited = enforceRateLimit(request, { name: 'lead-magnet', ...RL_FORM })
  if (limited) return limited

  const parsed = await parseJsonBody(request, MAX_BODY_BYTES)
  if (!parsed.ok) {
    return Response.json({ ok: false, error: parsed.error }, { status: parsed.status })
  }

  const payload = await getPayload({ config })
  const result = await deliverLeadMagnet(parsed.body, { payload })

  return Response.json(result.body, { status: result.status })
}
