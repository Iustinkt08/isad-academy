import { createHmac, timingSafeEqual } from 'node:crypto'

import { isLocale, type Locale } from '../i18n/config'

/**
 * Token de confirmare pentru abonarea la newsletter — double opt-in implementat de noi
 * (owner 2026-08-06, după ce funcția DOI nativă din Brevo s-a dovedit inutilizabilă:
 * endpoint-ul `/contacts/doubleOptinConfirmation` acceptă doar template-uri din registrul
 * DOI, iar acelea nu se pot crea prin API — v. docs/EMAIL.md).
 *
 * Tokenul e STATELESS și semnat HMAC-SHA256. Nu ținem abonări în așteptare în baza de date:
 * intenția de abonare trăiește exclusiv în linkul trimis pe email. Consecințe voite:
 *
 *   - nimic de curățat — o abonare neconfirmată dispare singură la expirare;
 *   - nu putem fi folosiți ca depozit de adrese: o adresă neconfirmată nu e scrisă nicăieri;
 *   - clickul pe link E dovada consimțământului (GDPR), iar semnătura dovedește că linkul a
 *     plecat de la noi, către exact acea adresă.
 *
 * Formatul: `base64url(JSON{e,l,x}).base64url(hmac)`. `x` e timestamp UNIX în secunde.
 */

/** 48 de ore: destul cât să prindă un weekend, destul de scurt cât un link scurs să nu conteze. */
const TTL_SECONDS = 48 * 60 * 60

export type ConfirmPayload = { email: string; locale: Locale }

type VerifyOutcome =
  | { ok: true; payload: ConfirmPayload }
  /** `reason` e pentru loguri, NU pentru afișat — vizitatorului îi arătăm o pagină neutră. */
  | { ok: false; reason: 'malformed' | 'badSignature' | 'expired' }

const b64url = (input: Buffer | string): string => Buffer.from(input).toString('base64url')

/**
 * Secretul de semnare. Refolosim `PAYLOAD_SECRET` (deja prezent în orice mediu care pornește
 * aplicația) ca abonarea să nu depindă de încă o variabilă pe care cineva ar uita s-o pună —
 * exact felul de lipsă care a ținut newsletterul căzut în producție. `NEWSLETTER_TOKEN_SECRET`
 * permite rotirea independentă, dacă vreodată e nevoie.
 */
const readSecret = (): string =>
  process.env.NEWSLETTER_TOKEN_SECRET?.trim() || process.env.PAYLOAD_SECRET?.trim() || ''

const sign = (data: string, secret: string): string =>
  createHmac('sha256', secret).update(data).digest('base64url')

/** `now` e injectabil ca testele să nu depindă de ceasul mașinii. */
export const createConfirmToken = (payload: ConfirmPayload, now: Date = new Date()): string | null => {
  const secret = readSecret()
  if (!secret) return null // fără secret nu emitem un token nesemnat — mai bine eșuăm zgomotos

  const body = b64url(
    JSON.stringify({
      e: payload.email,
      l: payload.locale,
      x: Math.floor(now.getTime() / 1000) + TTL_SECONDS,
    }),
  )
  return `${body}.${sign(body, secret)}`
}

export const verifyConfirmToken = (token: string, now: Date = new Date()): VerifyOutcome => {
  const secret = readSecret()
  if (!secret) return { ok: false, reason: 'badSignature' }

  const [body, signature] = token.split('.')
  if (!body || !signature) return { ok: false, reason: 'malformed' }

  // Comparație în timp constant: un `===` pe semnături scurge, prin durată, câți octeți s-au
  // potrivit, ceea ce face semnătura ghicibilă octet cu octet.
  const expected = Buffer.from(sign(body, secret))
  const received = Buffer.from(signature)
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return { ok: false, reason: 'badSignature' }
  }

  let decoded: unknown
  try {
    decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return { ok: false, reason: 'malformed' }
  }

  const { e, l, x } = (decoded ?? {}) as { e?: unknown; l?: unknown; x?: unknown }
  if (typeof e !== 'string' || !e || typeof x !== 'number') {
    return { ok: false, reason: 'malformed' }
  }
  if (Math.floor(now.getTime() / 1000) > x) return { ok: false, reason: 'expired' }

  // Semnătura e deja validă aici, deci un `l` necunoscut nu e un atac — e un token vechi de
  // dinaintea unei schimbări de limbi. Cade pe EN, ca peste tot (CLAUDE.md §7).
  return { ok: true, payload: { email: e, locale: isLocale(l) ? l : 'en' } }
}
