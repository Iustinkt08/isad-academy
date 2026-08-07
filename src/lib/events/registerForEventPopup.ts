import type { Payload } from 'payload'

import { DEFAULT_LOCALE, isLocale, type Locale } from '../i18n/config'
import { sendNewsletterConfirmation } from '../newsletter/sendConfirmation'
import { HONEYPOT_FIELD } from './honeypot'

// Re-export pentru testele care validează pipeline-ul. Clientul îl ia DIRECT din
// `./honeypot` — vezi nota de acolo, un import de aici ar trage node:crypto în browser.
export { HONEYPOT_FIELD }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_FIELD_LENGTH = 200

export type RegisterForEventPopupResult = {
  status: 200 | 201 | 400 | 404
  body: { ok: true; registered: true } | { ok: false; error: string }
}

/**
 * Înscriere la un eveniment din colecția `eventPopups` (spec §4).
 *
 * Separat de `./createEventRegistration`, care validează împotriva GLOBALULUI `eventPopup` și
 * încă deservește pop-up-ul live. Cele două coexistă deliberat până la pasul 3, când
 * frontend-ul comută pe colecție; abia atunci cel vechi se retrage. Ce era refolosibil —
 * trimiterea emailului de confirmare la newsletter — a fost extras în
 * `lib/newsletter/sendConfirmation`, nu copiat.
 *
 * Ordinea contează: pop-up-ul se încarcă și se validează ÎNAINTE de orice scriere, altfel un
 * slug inventat ar crea rânduri legate de nimic.
 */
export const registerForEventPopup = async (
  rawInput: unknown,
  deps: {
    payload: Payload
    slug: string
    /** Pentru dovada GDPR — extrase din cerere de către rută, nu ghicite aici. */
    ip: string
    userAgent: string
  },
): Promise<RegisterForEventPopupResult> => {
  const { payload, slug } = deps

  if (typeof rawInput !== 'object' || rawInput === null || Array.isArray(rawInput)) {
    return { status: 400, body: { ok: false, error: 'Request body must be a JSON object.' } }
  }
  const input = rawInput as Record<string, unknown>

  // 1. Honeypot — boții care completează orice input umplu și câmpul ascuns. Răspunsul e
  // IDENTIC cu al unei înscrieri reale: botul nu află că a fost prins, nimic nu se salvează.
  const honeypot = input[HONEYPOT_FIELD]
  if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
    return { status: 201, body: { ok: true, registered: true } }
  }

  const readField = (name: string): string =>
    typeof input[name] === 'string' ? (input[name] as string).trim() : ''

  const firstName = readField('firstName')
  const lastName = readField('lastName')
  const email = readField('email')
  const occupation = readField('occupation')
  const newsletterOptIn = input.newsletterOptIn === true
  const rawLocale = input.locale
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE

  // 2. Pop-up-ul, înainte de orice validare de conținut: dacă evenimentul nu primește
  // înscrieri, restul nu contează.
  const found = await payload.find({
    collection: 'eventPopups',
    where: { slug: { equals: slug } },
    limit: 1,
    overrideAccess: true,
    depth: 0,
  })
  const popup = found.docs[0]
  if (!popup) {
    return { status: 404, body: { ok: false, error: 'Event not found.' } }
  }
  // `draft`/`archived` și evenimentele trecute nu sunt „not found" pentru noi, dar pentru un
  // vizitator sunt același lucru: nu poate face nimic cu ele. Un mesaj distinct ar spune unui
  // curios că slug-ul există și e doar nepublicat.
  const isOpen =
    popup.status === 'published' &&
    Boolean(popup.eventDate) &&
    new Date(popup.eventDate).getTime() >= Date.now()
  if (!isOpen) {
    return { status: 400, body: { ok: false, error: 'This event is not open for registration.' } }
  }

  // 3. Validare
  if (!firstName) return { status: 400, body: { ok: false, error: 'First name is required.' } }
  if (!lastName) return { status: 400, body: { ok: false, error: 'Last name is required.' } }
  if (!EMAIL_RE.test(email)) {
    return { status: 400, body: { ok: false, error: 'A valid e-mail address is required.' } }
  }
  for (const [name, value] of Object.entries({ firstName, lastName, email, occupation })) {
    if (value.length > MAX_FIELD_LENGTH) {
      return { status: 400, body: { ok: false, error: `Field "${name}" is too long.` } }
    }
  }

  // 4. Dedupe — aceeași adresă la același eveniment se confirmă fără al doilea rând și fără
  // al doilea email. Indexul compus din colecție e plasa de siguranță pentru cereri simultane;
  // asta e verificarea care dă un răspuns frumos în cazul normal.
  const existing = await payload.find({
    collection: 'eventRegistrations',
    where: { and: [{ popup: { equals: popup.id } }, { email: { equals: email } }] },
    limit: 1,
    overrideAccess: true,
    depth: 0,
  })
  if (existing.totalDocs > 0) {
    return { status: 200, body: { ok: true, registered: true } }
  }

  // 5. Creare. `eventId` rămâne populat cu data evenimentului cât timp câmpul e `required` —
  // se scoate la pasul 7, după migrarea înregistrărilor vechi.
  // Emailurile (confirmare participant + notificare owner) pleacă din hook-ul `afterChange`
  // al colecției, niciodată de aici.
  await payload.create({
    collection: 'eventRegistrations',
    overrideAccess: true,
    data: {
      popup: popup.id,
      eventId: String(popup.eventDate),
      firstName,
      lastName,
      email,
      occupation: occupation || undefined,
      newsletterOptIn,
      // Snapshot, nu referință: textul de consimțământ din pop-up poate fi editat mâine, iar
      // dovada trebuie să rămână ce a citit OMUL ĂSTA, atunci.
      consentSnapshot: newsletterOptIn
        ? {
            consentText: popup.newsletterConsentText ?? '',
            consentedAt: new Date().toISOString(),
            ip: deps.ip,
            userAgent: deps.userAgent,
          }
        : undefined,
    },
  })

  // 6. Newsletter — DOAR cu bifă, și doar prin fluxul existent de double opt-in. Înscrierea
  // la eveniment în sine nu trimite NIMIC către Brevo (spec §8).
  if (newsletterOptIn) {
    const outcome = await sendNewsletterConfirmation({ email, locale })
    if (!outcome.ok) {
      // Înscrierea la eveniment e deja salvată și e lucrul pentru care a venit omul. O
      // problemă la newsletter se loghează și atât — nu anulează înscrierea.
      payload.logger.warn(
        `[event-popup:${slug}] newsletter confirmation not sent for ${email}: ${outcome.reason}`,
      )
    }
  }

  return { status: 201, body: { ok: true, registered: true } }
}
