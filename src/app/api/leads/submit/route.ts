import { getPayload } from 'payload'

import config from '../../../../payload.config'
import { parseJsonBody } from '../../../../lib/api/parseJsonBody'
import { createLead } from '../../../../lib/leads/createLead'

/** Guards against parsing an arbitrarily large request body (mirrors /api/checkout). A real
 * lead body (a handful of short fields + a message) is well under a few KB; 20KB is generous
 * headroom even for a long corporate brief. */
const MAX_BODY_BYTES = 20_000

/**
 * `POST /api/leads/submit` — Contact + Corporate form submissions (CLAUDE.md §4 `leads`,
 * §6). Lives at `/submit` (T16): a route at `/api/leads` itself would shadow Payload's own
 * REST endpoint for the `leads` collection (admin dashboard reads, still admin-guarded by
 * the collection's access rules) — Next.js route handlers win over the `(payload)` catch-all
 * for the same path.
 *
 * Deliberately thin: honeypot handling, strict per-type validation, `topicCourse` existence
 * checking and creation all live in `createLead` (src/lib/leads), so they are testable by
 * direct invocation without booting the dev server. The T7 `afterChange` hook on `leads`
 * sends the single-destination notification email — never this route.
 *
 * Contract:
 *   201 { ok: true }            — lead created (or honeypot-tripped no-op, indistinguishable)
 *   400 { ok: false, error }    — invalid body
 *   413 { ok: false, error }    — oversized body
 */
export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, MAX_BODY_BYTES)
  if (!parsed.ok) {
    return Response.json({ ok: false, error: parsed.error }, { status: parsed.status })
  }

  const payload = await getPayload({ config })
  const result = await createLead(parsed.body, { payload })

  return Response.json(result.body, { status: result.status })
}
