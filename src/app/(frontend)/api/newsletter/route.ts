import { parseJsonBody } from '../../../../lib/api/parseJsonBody'
import { enforceRateLimit, RL_FORM } from '../../../../lib/api/rateLimit'
import { getMailer } from '../../../../lib/email'
import { readNewsletterReplyTo } from '../../../../lib/email/senders'
import { renderNewsletterConfirmEmail } from '../../../../lib/email/templates/newsletterConfirm'
import { DEFAULT_LOCALE, isLocale } from '../../../../lib/i18n/config'
import { createConfirmToken } from '../../../../lib/newsletter/confirmToken'

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

  // `locale` decides which language the confirmation email is written in and which page the
  // link lands on. An unrecognised or missing value falls back to EN rather than 400 — a bad
  // locale must never block an otherwise valid subscription.
  const rawLocale = (parsed.body as { locale?: unknown } | null)?.locale
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE
  const address = email.trim()

  // Double opt-in, pasul 1 — emailul de confirmare îl trimitem NOI, ca email tranzacțional
  // obișnuit. Funcția DOI nativă a Brevo a fost abandonată (owner 2026-08-06): acceptă doar
  // template-uri din registrul ei DOI, care nu se pot crea prin API, și răspundea invariabil
  // „An active DOI template does not exist". Vezi src/lib/newsletter/confirmToken.ts.
  //
  // ADRESA NU E SALVATĂ NICĂIERI acum — nici la noi, nici în Brevo. Există doar semnată în
  // linkul din email. Abia clickul o adaugă în listă (/api/newsletter/confirm).
  const token = createConfirmToken({ email: address, locale })
  if (!token) {
    // Fără secret de semnare am trimite un link pe care nu-l putem verifica la întoarcere.
    console.error(
      '[newsletter] PAYLOAD_SECRET / NEWSLETTER_TOKEN_SECRET missing — cannot sign the confirmation link.',
    )
    return Response.json(
      { ok: false, error: 'Could not process your subscription. Please try again later.' },
      { status: 500 },
    )
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000').replace(
    /\/+$/,
    '',
  )
  const confirmUrl = `${siteUrl}/api/newsletter/confirm?token=${encodeURIComponent(token)}`
  const { subject, html, text } = renderNewsletterConfirmEmail({ confirmUrl, locale })

  const result = await getMailer().sendTransactional({
    to: address,
    subject,
    html,
    text,
    // `transactional` (no-reply@isad.academy), NU `newsletter` — decizie owner 2026-08-07.
    // Confirmarea abonării e declanșată de o acțiune punctuală a unei persoane, nu e o
    // campanie: e tranzacțională prin natură, iar `news@` rămâne pentru ce chiar e marketing
    // (broadcasturi, anunțuri de curs).
    //
    // Compromisul asumat: emailul ajunge inevitabil și la adrese tastate greșit sau introduse
    // de altcineva, iar un „Spam" de acolo atinge acum adresa de pe care pleacă și chitanțele.
    // Ține-l sub control prin rate limiting (deja activ mai sus); dacă rata de plângeri crește,
    // mută-l înapoi pe `newsletter` — e o singură linie.
    sender: 'transactional',
    // Explicit, NU global: fără câmpul ăsta Brevo pune adresa cu care a fost creat contul
    // (una personală, pe alt domeniu). Iar `BREVO_REPLY_TO_EMAIL` — inboxul monitorizat — e
    // pentru emailurile la care oamenii chiar trebuie să poată răspunde, nu pentru ăsta.
    replyTo: readNewsletterReplyTo() || undefined,
  })

  if (!result.ok) {
    return Response.json(
      { ok: false, error: 'Could not process your subscription. Please try again later.' },
      { status: 502 },
    )
  }

  return Response.json({ ok: true }, { status: 200 })
}
