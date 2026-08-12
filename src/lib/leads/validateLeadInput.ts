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

import {
  defaultCorporateFormFields,
  type CorporateFieldType,
  type CorporateFormField,
} from '../corporate/formConfig'
import { getDictionary } from '../i18n/dictionaries'

const MAX_NAME_LENGTH = 200
const MAX_EMAIL_LENGTH = 254
const MAX_TEXT_LENGTH = 300
const MAX_MESSAGE_LENGTH = 5_000

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Honeypot key — allow-listed on both types, handled (and only ever read) in `createLead`. */
export const HONEYPOT_FIELD = 'website'

export const CONTACT_SUBJECTS = ['course', 'corporate', 'certification', 'other'] as const
export type ContactSubject = (typeof CONTACT_SUBJECTS)[number]

const ALLOWED_CONTACT_KEYS = ['type', 'name', 'email', 'phone', 'subject', 'message', HONEYPOT_FIELD]
// Corporate (owner 2026-08-12, dynamic form): only the fixed core trio plus the
// config-driven `answers` — everything else lives in the admin-configured field list.
const ALLOWED_CORPORATE_KEYS = ['type', 'companyName', 'contactPerson', 'email', 'answers', HONEYPOT_FIELD]
const ALLOWED_ANSWER_KEYS = ['id', 'value', 'from', 'to', 'courseId', 'other']

export type NormalizedContactLead = {
  type: 'contact'
  name: string
  email: string
  phone?: string
  subject: ContactSubject
  message: string
}

/** One validated answer of the dynamic corporate form, still structured per field type —
 * `createLead` flattens it into the lead's `formData` label/value rows. */
export type NormalizedCorporateAnswer = {
  fieldId: string
  label: string
  fieldType: CorporateFieldType
  /** text | email | phone | textarea | select */
  value?: string
  /** period — ISO strings, `from <= to` already enforced */
  from?: string
  to?: string
  /** courseTopic — EXISTENCE of the course id is verified in `createLead`, not here. */
  courseId?: number
  other?: string
}

export type NormalizedCorporateLead = {
  type: 'corporate'
  companyName: string
  contactPerson: string
  email: string
  answers: NormalizedCorporateAnswer[]
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
    return { ok: false, error: '"email" must be a valid e-mail address.' }
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

/** One answer of the dynamic form, validated against ITS configured field. */
const validateAnswer = (
  raw: Record<string, unknown>,
  field: CorporateFormField,
): { ok: true; value: NormalizedCorporateAnswer } | { ok: false; error: string } => {
  const base: NormalizedCorporateAnswer = {
    fieldId: field.id,
    label: field.label,
    fieldType: field.fieldType,
  }
  const { value, from, to, courseId, other } = raw
  const fail = (error: string): { ok: false; error: string } => ({ ok: false, error })

  switch (field.fieldType) {
    case 'textarea': {
      if (!isNonEmptyString(value, MAX_MESSAGE_LENGTH)) {
        return fail(`"${field.label}" must be a non-empty string.`)
      }
      return { ok: true, value: { ...base, value: value.trim() } }
    }
    case 'email': {
      if (!isValidEmail(value)) {
        return fail(`"${field.label}" must be a valid e-mail address.`)
      }
      return { ok: true, value: { ...base, value: value.trim() } }
    }
    case 'select': {
      if (!isNonEmptyString(value, MAX_TEXT_LENGTH) || !field.options.includes(value.trim())) {
        return fail(`"${field.label}" must be one of its listed options.`)
      }
      return { ok: true, value: { ...base, value: value.trim() } }
    }
    case 'period': {
      let fromTime: number | null = null
      let toTime: number | null = null
      if (from !== undefined) {
        fromTime = parseDate(from)
        if (fromTime === null) return fail(`"${field.label}": "from" must be a valid date.`)
      }
      if (to !== undefined) {
        toTime = parseDate(to)
        if (toTime === null) return fail(`"${field.label}": "to" must be a valid date.`)
      }
      if (fromTime === null && toTime === null) {
        return fail(`"${field.label}" needs at least one of "from"/"to".`)
      }
      if (fromTime !== null && toTime !== null && fromTime > toTime) {
        return fail(`"${field.label}": "from" must be on or before "to".`)
      }
      return {
        ok: true,
        value: {
          ...base,
          from: fromTime !== null ? new Date(fromTime).toISOString() : undefined,
          to: toTime !== null ? new Date(toTime).toISOString() : undefined,
        },
      }
    }
    case 'courseTopic': {
      // Exactly ONE of catalog course (id) or free-text "other" (§4, §6 Corporate).
      const hasCourse = courseId !== undefined && courseId !== null
      const hasOther = other !== undefined && other !== null
      if (hasCourse === hasOther) {
        return fail(`"${field.label}": provide exactly one of "courseId" or "other".`)
      }
      if (hasCourse) {
        const id =
          typeof courseId === 'number'
            ? courseId
            : typeof courseId === 'string' && /^\d+$/.test(courseId.trim())
              ? Number(courseId.trim())
              : NaN
        if (!Number.isInteger(id) || id < 1) {
          return fail(`"${field.label}": "courseId" must be a course id.`)
        }
        return { ok: true, value: { ...base, courseId: id } }
      }
      if (!isNonEmptyString(other, MAX_TEXT_LENGTH)) {
        return fail(`"${field.label}": "other" must be a non-empty string.`)
      }
      return { ok: true, value: { ...base, other: other.trim() } }
    }
    // text | phone
    default: {
      if (!isNonEmptyString(value, MAX_TEXT_LENGTH)) {
        return fail(`"${field.label}" must be a non-empty string.`)
      }
      return { ok: true, value: { ...base, value: value.trim() } }
    }
  }
}

const validateCorporate = (
  raw: Record<string, unknown>,
  fields: CorporateFormField[],
): LeadValidationResult => {
  const unknownError = rejectUnknownKeys(raw, ALLOWED_CORPORATE_KEYS, 'request body')
  if (unknownError) return { ok: false, error: unknownError }

  const { companyName, contactPerson, email, answers } = raw

  if (!isNonEmptyString(companyName, MAX_TEXT_LENGTH)) {
    return { ok: false, error: '"companyName" is required.' }
  }
  if (!isNonEmptyString(contactPerson, MAX_NAME_LENGTH)) {
    return { ok: false, error: '"contactPerson" is required.' }
  }
  if (!isValidEmail(email)) {
    return { ok: false, error: '"email" must be a valid e-mail address.' }
  }

  if (answers !== undefined && !Array.isArray(answers)) {
    return { ok: false, error: '"answers" must be an array.' }
  }
  const rawAnswers = (answers ?? []) as unknown[]

  // Allow-list by configured field id (mass-assignment hygiene: an answer the current
  // form config does not contain is rejected outright), no duplicates.
  const byId = new Map(fields.map((field) => [field.id, field]))
  const seen = new Set<string>()
  const normalizedAnswers: NormalizedCorporateAnswer[] = []

  for (const [index, entry] of rawAnswers.entries()) {
    if (!isPlainObject(entry)) {
      return { ok: false, error: `"answers[${index}]" must be an object.` }
    }
    const unknownAnswerError = rejectUnknownKeys(entry, ALLOWED_ANSWER_KEYS, `answers[${index}]`)
    if (unknownAnswerError) return { ok: false, error: unknownAnswerError }

    const id = entry.id
    if (typeof id !== 'string' || !byId.has(id)) {
      return { ok: false, error: `"answers[${index}].id" does not match a form field.` }
    }
    if (seen.has(id)) {
      return { ok: false, error: `Duplicate answer for form field "${id}".` }
    }
    seen.add(id)

    const validated = validateAnswer(entry, byId.get(id)!)
    if (!validated.ok) return validated
    normalizedAnswers.push(validated.value)
  }

  for (const field of fields) {
    if (field.required && !seen.has(field.id)) {
      return { ok: false, error: `"${field.label}" is required.` }
    }
  }

  // Keep the answers in the CONFIGURED field order regardless of submission order —
  // formData rows and the notification e-mail then always mirror the admin's form.
  const order = new Map(fields.map((field, index) => [field.id, index]))
  normalizedAnswers.sort((a, b) => (order.get(a.fieldId) ?? 0) - (order.get(b.fieldId) ?? 0))

  return {
    ok: true,
    value: {
      type: 'corporate',
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim(),
      email: email.trim(),
      answers: normalizedAnswers,
    },
  }
}

/**
 * `corporateFields` = the CURRENT form configuration (resolved from the `corporatePage`
 * global by the caller — see `createLead`); it defaults to the built-in field set so a
 * missing/unreadable global can never take the form down.
 */
export const validateLeadInput = (
  raw: unknown,
  corporateFields: CorporateFormField[] = defaultCorporateFormFields(getDictionary('en')),
): LeadValidationResult => {
  if (!isPlainObject(raw)) {
    return { ok: false, error: 'Request body must be a JSON object.' }
  }

  const { type } = raw
  if (type === 'contact') return validateContact(raw)
  if (type === 'corporate') return validateCorporate(raw, corporateFields)
  return { ok: false, error: '"type" must be "contact" or "corporate".' }
}
