'use client'

import { useState } from 'react'

import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { FormSuccess } from './FormSuccess'
import { HoneypotField } from './HoneypotField'
import { EMAIL_RE, focusFirstInvalid, submitLead } from './submitLead'
import type { Locale } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/dictionaries'

type Errors = Partial<Record<'name' | 'email' | 'phone' | 'subject' | 'message', string>>

const FIELD_IDS = {
  name: 'contact-name',
  email: 'contact-email',
  phone: 'contact-phone',
  subject: 'contact-subject',
  message: 'contact-message',
} as const

/** Payload `leads.subject` select values — labels come from the dictionary. */
const SUBJECT_VALUES = ['course', 'corporate', 'certification', 'other'] as const

/**
 * Contact form (§6 /contact): name, email, phone (optional), subject dropdown, message.
 * Inline validation with focus-first-invalid; on success the whole form is replaced by a
 * thank-you panel (no response-time promises). Server re-validates everything — this is UX
 * only. Submits to POST /api/leads/submit with `type: 'contact'`.
 */
export function ContactForm({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).contact.form
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState('')

  if (submitted) {
    return <FormSuccess title={t.successTitle} message={t.successMessage} />
  }

  function validate(): Errors {
    const next: Errors = {}
    if (name.trim().length === 0) next.name = t.errors.name
    if (!EMAIL_RE.test(email)) next.email = t.errors.email
    if (subject === '') next.subject = t.errors.subject
    if (message.trim().length === 0) next.message = t.errors.message
    return next
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setServerError('')

    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalid(
        {
          [FIELD_IDS.name]: nextErrors.name,
          [FIELD_IDS.email]: nextErrors.email,
          [FIELD_IDS.subject]: nextErrors.subject,
          [FIELD_IDS.message]: nextErrors.message,
        },
        [FIELD_IDS.name, FIELD_IDS.email, FIELD_IDS.subject, FIELD_IDS.message],
      )
      return
    }

    setSubmitting(true)
    const honeypot = String(new FormData(form).get('website') ?? '')
    const result = await submitLead(
      {
        type: 'contact',
        name: name.trim(),
        email: email.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        subject,
        message: message.trim(),
        website: honeypot,
      },
      t.errors.generic,
    )
    setSubmitting(false)

    if (result.ok) {
      setSubmitted(true)
    } else {
      setServerError(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate data-testid="contact-form" className="flex flex-col gap-5">
      <HoneypotField />
      <Input
        id={FIELD_IDS.name}
        label={t.name}
        autoComplete="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={errors.name}
      />
      <Input
        id={FIELD_IDS.email}
        label={t.email}
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={errors.email}
      />
      <Input
        id={FIELD_IDS.phone}
        label={t.phone}
        type="tel"
        autoComplete="tel"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        error={errors.phone}
      />
      <Select
        id={FIELD_IDS.subject}
        label={t.subject}
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
        error={errors.subject}
      >
        <option value="" disabled>
          {t.subjectPlaceholder}
        </option>
        {SUBJECT_VALUES.map((value) => (
          <option key={value} value={value}>
            {t.subjects[value]}
          </option>
        ))}
      </Select>
      <Textarea
        id={FIELD_IDS.message}
        label={t.message}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        error={errors.message}
      />
      {serverError && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {serverError}
        </p>
      )}
      <div>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? t.submitting : t.submit}
        </Button>
      </div>
    </form>
  )
}
