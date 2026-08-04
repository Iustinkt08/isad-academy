import type { Payload } from 'payload'

export const HONEYPOT_FIELD = 'website'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_FIELD_LENGTH = 200

export type CreateEventRegistrationResult = {
  status: 201 | 400
  body: { ok: true } | { ok: false; error: string }
}

/**
 * Event popup sign-up pipeline (mirrors `createLead`, so it is testable by direct
 * invocation — the `POST /api/event-registrations` route stays a thin shell):
 *   1. Honeypot: bots that auto-fill every input populate the visually-hidden `website`
 *      field. A non-empty honeypot returns the SAME 201 `{ ok: true }` as a real
 *      submission — indistinguishable to the bot, nothing persisted, no emails.
 *   2. Validation: firstName/lastName/email required; occupation free-text optional
 *      (the popup's datalist covers "choose OR type"); everything length-capped.
 *   3. Dedupe: the same email registering twice for the same event is acknowledged
 *      idempotently (201) without a second row or a second confirmation email.
 *   4. Create — the collection's afterChange hook sends both emails (never this module).
 */
export const createEventRegistration = async (
  rawInput: unknown,
  deps: { payload: Payload },
): Promise<CreateEventRegistrationResult> => {
  const { payload } = deps

  if (typeof rawInput !== 'object' || rawInput === null || Array.isArray(rawInput)) {
    return { status: 400, body: { ok: false, error: 'Request body must be a JSON object.' } }
  }
  const input = rawInput as Record<string, unknown>

  // 1. Honeypot — silent success, nothing persisted.
  const honeypot = input[HONEYPOT_FIELD]
  if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
    return { status: 201, body: { ok: true } }
  }

  // 2. Validation ------------------------------------------------------------------------
  const readField = (name: string): string =>
    typeof input[name] === 'string' ? (input[name] as string).trim() : ''

  const eventId = readField('eventId')
  const firstName = readField('firstName')
  const lastName = readField('lastName')
  const email = readField('email')
  const occupation = readField('occupation')

  if (!eventId) return { status: 400, body: { ok: false, error: 'Missing event id.' } }

  // eventId trebuie să corespundă evenimentului ACTIV, VIITOR din CMS. Fără asta, `eventId`
  // era text liber: un atacator incrementa `evt-1`, `evt-2`… și ocolea complet dedupe-ul de
  // mai jos → rânduri + emailuri nelimitate pe același email (securitate: A04, abuz).
  const popup = await payload
    .findGlobal({ slug: 'eventPopup', overrideAccess: true })
    .catch(() => null)
  const activeEventId =
    popup?.active && popup.eventDate && new Date(popup.eventDate).getTime() >= Date.now()
      ? String(popup.eventDate)
      : null
  if (!activeEventId || eventId !== activeEventId) {
    return { status: 400, body: { ok: false, error: 'This event is not open for registration.' } }
  }

  if (!firstName) return { status: 400, body: { ok: false, error: 'First name is required.' } }
  if (!lastName) return { status: 400, body: { ok: false, error: 'Last name is required.' } }
  if (!EMAIL_RE.test(email)) {
    return { status: 400, body: { ok: false, error: 'A valid e-mail address is required.' } }
  }
  for (const [name, value] of Object.entries({ eventId, firstName, lastName, email, occupation })) {
    if (value.length > MAX_FIELD_LENGTH) {
      return { status: 400, body: { ok: false, error: `Field "${name}" is too long.` } }
    }
  }

  // 3. Dedupe — same email + same event acknowledges without a second row/email.
  const existing = await payload.find({
    collection: 'eventRegistrations',
    where: { and: [{ eventId: { equals: eventId } }, { email: { equals: email } }] },
    limit: 1,
    overrideAccess: true,
    depth: 0,
  })
  if (existing.totalDocs > 0) {
    return { status: 201, body: { ok: true } }
  }

  // 4. Create — afterChange sends the confirmation + owner notification.
  await payload.create({
    collection: 'eventRegistrations',
    data: { eventId, firstName, lastName, email, ...(occupation ? { occupation } : {}) },
    overrideAccess: true,
  })

  return { status: 201, body: { ok: true } }
}
