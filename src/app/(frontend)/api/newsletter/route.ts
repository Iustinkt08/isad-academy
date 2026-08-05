import { parseJsonBody } from '../../../../lib/api/parseJsonBody'
import { enforceRateLimit, RL_FORM } from '../../../../lib/api/rateLimit'
import { getMailer } from '../../../../lib/email'
import { isLocale } from '../../../../lib/i18n/config'

/** Guards against parsing an arbitrarily large request body — a real newsletter signup body
 * (just an email address) is well under 100 bytes; 2KB is generous headroom. */
const MAX_BODY_BYTES = 2_000
const MAX_EMAIL_LENGTH = 254
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * `POST /api/newsletter` — newsletter double opt-in signup (CLAUDE.md §7 footer, §10-11,
 * §15). Contract: `POST { email } -> { ok: boolean, error?: string }`.
 *
 * Response mapping:
 *   - malformed body / invalid email format -> 400 `{ ok: false, error }`.
 *   - `Mailer.subscribeDoubleOptIn` reports `{ ok: false }` (a REAL, configured Brevo call
 *     that failed) -> 502 `{ ok: false, error }`.
 *   - success, INCLUDING when `getMailer()` resolves to `NoopMailer` (Brevo not configured
 *     yet — CLAUDE.md §11 "dev keeps working with zero config") -> 200 `{ ok: true }`.
 *     `NoopMailer` itself already logs loudly (`console.warn`, see
 *     `src/lib/email/noop.ts`) whenever this happens, so an unconfigured environment is
 *     never silently mistaken for "newsletter signup works" in the logs — it just never
 *     surfaces as a broken signup FORM to a visitor before Brevo is wired up.
 */
export async function POST(request: Request): Promise<Response> {
  const limited = enforceRateLimit(request, { name: 'newsletter', ...RL_FORM })
  if (limited) return limited

  // Oversized bodies are 413 (T16 — aligned with every other public POST route; was 400).
  const parsed = await parseJsonBody(request, MAX_BODY_BYTES)
  if (!parsed.ok) {
    return Response.json({ ok: false, error: parsed.error }, { status: parsed.status })
  }

  const email = (parsed.body as { email?: unknown } | null)?.email

  if (typeof email !== 'string' || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
    return Response.json({ ok: false, error: 'A valid e-mail address is required.' }, { status: 400 })
  }

  // `locale` decides which confirmation page Brevo's email links back to. An unrecognised or
  // missing value falls back to EN rather than 400 — a bad locale must never block an
  // otherwise valid subscription.
  const rawLocale = (parsed.body as { locale?: unknown } | null)?.locale

  const result = await getMailer().subscribeDoubleOptIn({
    email: email.trim(),
    locale: isLocale(rawLocale) ? rawLocale : undefined,
  })

  if (!result.ok) {
    return Response.json(
      { ok: false, error: 'Could not process your subscription. Please try again later.' },
      { status: 502 },
    )
  }

  return Response.json({ ok: true }, { status: 200 })
}
