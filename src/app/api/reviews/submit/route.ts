import { getPayload } from 'payload'

import config from '../../../../payload.config'
import { parseJsonBody } from '../../../../lib/api/parseJsonBody'
import { enforceRateLimit, RL_FORM } from '../../../../lib/api/rateLimit'
import { submitReview } from '../../../../lib/reviews/submitReview'

/** A review submission body (token + a short text + optional name/role) is at most a few KB
 * even at the max text length (2000 chars) — 10KB is generous headroom. */
const MAX_BODY_BYTES = 10_000

/**
 * `POST /api/reviews/submit` — public review submission (CLAUDE.md §10, T13). Deliberately
 * thin: all validation, token verification and the duplicate-submission guard live in
 * `submitReview`, so it is integration-testable by direct invocation (no dev server — see
 * tests/int/reviews-pipeline.int.spec.ts), mirroring `POST /api/checkout`.
 *
 * Response contract:
 *   200 { ok: true }
 *   400 { ok: false, error }               — malformed body / invalid text length
 *   401 { ok: false, error }               — missing/invalid/tampered/expired token
 *   404 { ok: false, error }               — the token's session no longer exists
 *   409 { ok: false, error }               — already submitted for this (session, email)
 */
export async function POST(request: Request): Promise<Response> {
  const limited = enforceRateLimit(request, { name: 'reviews', ...RL_FORM })
  if (limited) return limited

  const parsed = await parseJsonBody(request, MAX_BODY_BYTES)
  if (!parsed.ok) {
    return Response.json({ ok: false, error: parsed.error }, { status: parsed.status })
  }

  const payload = await getPayload({ config })
  const result = await submitReview(parsed.body, { payload })

  return Response.json(result.body, { status: result.status })
}
