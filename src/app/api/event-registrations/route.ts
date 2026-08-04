import { getPayload } from 'payload'

import config from '../../../payload.config'
import { parseJsonBody } from '../../../lib/api/parseJsonBody'
import { enforceRateLimit, RL_FORM } from '../../../lib/api/rateLimit'
import { createEventRegistration } from '../../../lib/events/createEventRegistration'

/** A registration body is a handful of short fields; 20KB is generous headroom
 * (mirrors /api/leads/submit). */
const MAX_BODY_BYTES = 20_000

/**
 * `POST /api/event-registrations` — sign-ups from the event popup (Figma 4034-156).
 * Deliberately thin: honeypot, validation, dedupe and creation live in
 * `createEventRegistration` (src/lib/events), so they are testable by direct invocation.
 * The collection's afterChange hook sends the participant confirmation + owner
 * notification — never this route.
 *
 * Contract:
 *   201 { ok: true }         — registered (honeypot/duplicate no-ops are indistinguishable)
 *   400 { ok: false, error } — invalid body
 *   413 { ok: false, error } — oversized body
 */
export async function POST(request: Request): Promise<Response> {
  const limited = enforceRateLimit(request, { name: 'event-registrations', ...RL_FORM })
  if (limited) return limited

  const parsed = await parseJsonBody(request, MAX_BODY_BYTES)
  if (!parsed.ok) {
    return Response.json({ ok: false, error: parsed.error }, { status: parsed.status })
  }

  const payload = await getPayload({ config })
  const result = await createEventRegistration(parsed.body, { payload })

  return Response.json(result.body, { status: result.status })
}
