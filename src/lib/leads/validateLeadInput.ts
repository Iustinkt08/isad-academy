/**
 * Server-side validation for `POST /api/leads/submit` (CLAUDE.md §4 `leads`, §6 Contact/Corporate).
 * Mirrors `src/lib/checkout/validateCheckoutInput.ts`: hand-rolled (no schema library in this
 * repo) but exhaustive and allow-listed per lead `type`, with one shared error shape. This is
 * the ONLY gate between an arbitrary client payload and `leads` creation (the route creates
 * with `overrideAccess: true`), so mass-assignment hygiene lives here: any unrecognized field
 * at any level is rejected outright.
 *
 * The honeypot field (`website`) is ACCEPTED but never read here — `createLead` short-circuits
 * on a non-empty honeypot before validation ever runs, so by the time this validator sees a
 * body the field is empty/absent; it is allow-listed only so a legitimate submission carrying
 * the empty honeypot input does not 400.
 */

const MAX_NAME_LENGTH = 200
const MAX_EMAIL_LENGTH = 254
const MAX_TEXT_LENGTH = 300
const MAX_MESSAGE_LENGTH = 5_000
const MAX_RANGE_LENGTH = 50

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Honeypot key — allow-listed on both types, handled (and only ever read) in `createLead`. */
export const HONEYPOT_FIELD = 'website'

export const CONTACT_SUBJECTS = ['course', 'corporate', 'certification', 'other'] as const
export type ContactSubject = (typeof CONTACT_SUBJECTS)[number]

const ALLOWED_CONTACT_KEYS = ['type', 'name', 'email', 'phone', 'subject', 'message', HONEYPOT_FIELD]
const ALLOWED_CORPORATE_KEYS = [
  'type',
  'companyName',
  'contactPerson',
  'email',
  'phone',
  'participantsRange',
  'topicCourse',
  'topicOther',
  'preferredPeriod',
  // Optional free-text goals (§4 lists `message` among the common lead fields; the corporate
  // form gained the box with the 2026-07-13 Figma redesign).
  'message',
  HONEYPOT_FIELD,
]
const ALLOWED_PERIOD_KEYS = ['from', 'to']

export type NormalizedContactLead = {
  type: 'contact'
  name: string
  email: string
  phone?: string
  subject: ContactSubject
  message: string
}

export type NormalizedCorporateLead = {
  type: 'corporate'
  companyName: string
  contactPerson: string
  email: string
  phone?: string
  participantsRange?: string
  /** Course id — EXISTENCE is verified against the CMS in `createLead`, not here. */
  topicCourse?: number
  topicOther?: string
  preferredPeriod?: { from?: string; to?: string }
  message?: string
}

export type NormalizedLeadInput = NormalizedContactLead | NormalizedCorporateLead

export type LeadValidationResult =
  | { ok: true; value: NormalizedLeadInput }
  | { ok: false; error: string }

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNonEmptyString = (value: unknown, maxLength: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength

const isValidEmail = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= MAX_EMAIL_LENGTH && EMAIL_RE.test(value)

const rejectUnknownKeys = (
  obj: Record<string, unknown>,
  allowed: string[],
  label: string,
): string | null => {
  const unknown = Object.keys(obj).filter((key) => !allowed.includes(key))
  if (unknown.length > 0) {
    return `Unknown field(s) in ${label}: ${unknown.join(', ')}.`
  }
  return null
}

/** Accepts 'YYYY-MM-DD' or full ISO strings; returns epoch millis, or null when unparsable. */
const parseDate = (value: unknown): number | null => {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 40) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

const validateContact = (raw: Record<string, unknown>): LeadValidationResult => {
  const unknownError = rejectUnknownKeys(raw, ALLOWED_CONTACT_KEYS, 'request body')
  if (unknownError) return { ok: false, error: unknownError }

  const { name, email, phone, subject, message } = raw

  if (!isNonEmptyString(name, MAX_NAME_LENGTH)) {
    return { ok: false, error: '"name" is required.' }
  }
  if (!isValidEmail(email)) {
    return { ok: false, error: '"email" must be a valid email address.' }
  }
  if (phone !== undefined && !isNonEmptyString(phone, MAX_TEXT_LENGTH)) {
    return { ok: false, error: '"phone" must be a non-empty string.' }
  }
  if (typeof subject !== 'string' || !(CONTACT_SUBJECTS as readonly string[]).includes(subject)) {
    return { ok: false, error: `"subject" must be one of: ${CONTACT_SUBJECTS.join(', ')}.` }
  }
  if (!isNonEmptyString(message, MAX_MESSAGE_LENGTH)) {
    return { ok: false, error: '"message" is required.' }
  }

  return {
    ok: true,
    value: {
      type: 'contact',
      name: name.trim(),
      email: email.trim(),
      phone: phone !== undefined ? phone.trim() : undefined,
      subject: subject as ContactSubject,
      message: message.trim(),
    },
  }
}

const validateCorporate = (raw: Record<string, unknown>): LeadValidationResult => {
  const unknownError = rejectUnknownKeys(raw, ALLOWED_CORPORATE_KEYS, 'request body')
  if (unknownError) return { ok: false, error: unknownError }

  const {
    companyName,
    contactPerson,
    email,
    phone,
    participantsRange,
    topicCourse,
    topicOther,
    preferredPeriod,
    message,
  } = raw

  if (!isNonEmptyString(companyName, MAX_TEXT_LENGTH)) {
    return { ok: false, error: '"companyName" is required.' }
  }
  if (!isNonEmptyString(contactPerson, MAX_NAME_LENGTH)) {
    return { ok: false, error: '"contactPerson" is required.' }
  }
  if (!isValidEmail(email)) {
    return { ok: false, error: '"email" must be a valid email address.' }
  }
  if (phone !== undefined && !isNonEmptyString(phone, MAX_TEXT_LENGTH)) {
    return { ok: false, error: '"phone" must be a non-empty string.' }
  }
  if (participantsRange !== undefined && !isNonEmptyString(participantsRange, MAX_RANGE_LENGTH)) {
    return { ok: false, error: '"participantsRange" must be a non-empty string.' }
  }
  if (message !== undefined && !isNonEmptyString(message, MAX_MESSAGE_LENGTH)) {
    return { ok: false, error: '"message" must be a non-empty string.' }
  }

  // Topic: exactly ONE of catalog course (id) or free-text "other" (§4, §6 Corporate).
  const hasCourse = topicCourse !== undefined && topicCourse !== null
  const hasOther = topicOther !== undefined && topicOther !== null
  if (hasCourse === hasOther) {
    return { ok: false, error: 'Provide exactly one of "topicCourse" or "topicOther".' }
  }

  let normalizedTopicCourse: number | undefined
  if (hasCourse) {
    const id =
      typeof topicCourse === 'number'
        ? topicCourse
        : typeof topicCourse === 'string' && /^\d+$/.test(topicCourse.trim())
          ? Number(topicCourse.trim())
          : NaN
    if (!Number.isInteger(id) || id < 1) {
      return { ok: false, error: '"topicCourse" must be a course id.' }
    }
    normalizedTopicCourse = id
  }

  let normalizedTopicOther: string | undefined
  if (hasOther) {
    if (!isNonEmptyString(topicOther, MAX_TEXT_LENGTH)) {
      return { ok: false, error: '"topicOther" must be a non-empty string.' }
    }
    normalizedTopicOther = topicOther.trim()
  }

  let normalizedPeriod: { from?: string; to?: string } | undefined
  if (preferredPeriod !== undefined) {
    if (!isPlainObject(preferredPeriod)) {
      return { ok: false, error: '"preferredPeriod" must be an object with "from"/"to" dates.' }
    }
    const periodError = rejectUnknownKeys(preferredPeriod, ALLOWED_PERIOD_KEYS, 'preferredPeriod')
    if (periodError) return { ok: false, error: periodError }

    const { from, to } = preferredPeriod
    let fromTime: number | null = null
    let toTime: number | null = null

    if (from !== undefined) {
      fromTime = parseDate(from)
      if (fromTime === null) {
        return { ok: false, error: '"preferredPeriod.from" must be a valid date.' }
      }
    }
    if (to !== undefined) {
      toTime = parseDate(to)
      if (toTime === null) {
        return { ok: false, error: '"preferredPeriod.to" must be a valid date.' }
      }
    }
    if (fromTime !== null && toTime !== null && fromTime > toTime) {
      return { ok: false, error: '"preferredPeriod.from" must be on or before "preferredPeriod.to".' }
    }

    if (fromTime !== null || toTime !== null) {
      normalizedPeriod = {
        from: fromTime !== null ? new Date(fromTime).toISOString() : undefined,
        to: toTime !== null ? new Date(toTime).toISOString() : undefined,
      }
    }
  }

  return {
    ok: true,
    value: {
      type: 'corporate',
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim(),
      email: email.trim(),
      phone: phone !== undefined ? phone.trim() : undefined,
      participantsRange: participantsRange !== undefined ? participantsRange.trim() : undefined,
      topicCourse: normalizedTopicCourse,
      topicOther: normalizedTopicOther,
      preferredPeriod: normalizedPeriod,
      message: message !== undefined && typeof message === 'string' ? message.trim() : undefined,
    },
  }
}

export const validateLeadInput = (raw: unknown): LeadValidationResult => {
  if (!isPlainObject(raw)) {
    return { ok: false, error: 'Request body must be a JSON object.' }
  }

  const { type } = raw
  if (type === 'contact') return validateContact(raw)
  if (type === 'corporate') return validateCorporate(raw)
  return { ok: false, error: '"type" must be "contact" or "corporate".' }
}
