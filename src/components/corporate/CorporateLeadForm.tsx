'use client'

import { useState } from 'react'

import { FormSuccess } from '../forms/FormSuccess'
import { HoneypotField } from '../forms/HoneypotField'
import { EMAIL_RE, focusFirstInvalid, submitLead } from '../forms/submitLead'
import { Container } from '../ui/Container'
import { Reveal } from '../ui/Reveal'
import type { CorporateContent, CorporateFormField } from '@/lib/corporate/formConfig'
import type { Locale } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/dictionaries'

/**
 * Corporate / Lead Form — the proposal form + side column (owner Figma extract, node
 * 3790:3694). Owner 2026-08-12: the form is now DYNAMIC — after the fixed core trio
 * (company name, contact person, e-mail) it renders exactly the fields configured on the
 * `corporatePage` global (resolved server-side, dictionary defaults when unset). The
 * functional contract stays the proven one:
 *  - submits via POST /api/leads/submit (`submitLead`) as `{ type: 'corporate',
 *    companyName, contactPerson, email, answers: [{ id, … }] }`; the server re-validates
 *    against the SAME field config and the afterChange hook sends the single Brevo
 *    notification — this component never emails anything itself;
 *  - `courseTopic` fields offer the published catalog (passed in by the page) plus an
 *    "Other" option revealing a required free-text topic;
 *  - honeypot (`website`), client-side validation with focus-first-invalid, thank-you
 *    state with NO response-time promise (§6);
 *  - every input keeps an sr-only <label> (the design is placeholder-only) so the form
 *    stays accessible and the e2e getByLabel contract holds.
 * Visuals unchanged: grey `border-line` strokes, grey placeholders/focus, no blue stroke.
 */

export type CorporateTopicOption = { id: number; title: string }

const FIELD_IDS = {
  companyName: 'corporate-company-name',
  contactPerson: 'corporate-contact-person',
  email: 'corporate-email',
} as const

const OTHER_TOPIC = 'other'

// Grey hairline + grey placeholders + GREY focus border (owner: no blue stroke and no blue
// focus ring anywhere on the form — focus darkens the hairline to #bdbdbd instead).
const inputCls =
  'w-full rounded-[14px] border border-[#E6E6E6] bg-white px-[18px] py-[13px] text-[15px] text-ink placeholder:text-[#959595] focus:border-[#bdbdbd] focus:outline-none'

// Selects swap the native chevron for a custom one inset from the right edge
// (owner 2026-07-13: the native arrow hugged the margin).
const selectCls = `${inputCls} appearance-none bg-no-repeat pr-11 [background-position:right_18px_center] [background-size:14px]`
const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 8' fill='none'%3E%3Cpath d='M1 1l6 6 6-6' stroke='%234d5b6a' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")"

/** DOM ids of a dynamic field's inputs — stable, derived from the config row id. */
const domId = (fieldId: string, part?: 'from' | 'to' | 'other') =>
  `corporate-field-${fieldId}${part ? `-${part}` : ''}`

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null
  return (
    <p id={`${id}-error`} role="alert" className="mt-1 text-[13px] font-medium text-red-700">
      {error}
    </p>
  )
}

export default function CorporateLeadForm({
  locale,
  courses,
  contactEmail = 'contact@isad.academy',
  content,
}: {
  locale: Locale
  courses: CorporateTopicOption[]
  contactEmail?: string
  content: Pick<CorporateContent, 'form' | 'aside'>
}) {
  const t = getDictionary(locale).corporate
  const fields = content.form.fields

  const [companyName, setCompanyName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [email, setEmail] = useState('')
  // One flat map for every dynamic input: `<id>` for simple values, `<id>:from/:to`
  // for periods, `<id>:topic` (course id string | 'other') + `<id>:other` for topics.
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState('')

  const value = (key: string) => answers[key] ?? ''
  const setValue = (key: string, next: string) =>
    setAnswers((current) => ({ ...current, [key]: next }))

  /** Keyed by DOM id so focus-first-invalid works over the dynamic list too. */
  function validate(): Record<string, string> {
    const next: Record<string, string> = {}
    if (companyName.trim().length === 0) next[FIELD_IDS.companyName] = t.form.errors.companyName
    if (contactPerson.trim().length === 0)
      next[FIELD_IDS.contactPerson] = t.form.errors.contactPerson
    if (!EMAIL_RE.test(email)) next[FIELD_IDS.email] = t.form.errors.email

    for (const field of fields) {
      switch (field.fieldType) {
        case 'period': {
          const from = value(`${field.id}:from`).trim()
          const to = value(`${field.id}:to`).trim()
          if (field.required && !from && !to) {
            next[domId(field.id, 'from')] = t.form.errors.required(field.label)
            break
          }
          // Free-text period — the server only accepts parseable dates, so unparsable
          // text is caught here instead of failing the submit.
          const fromTime = from ? Date.parse(from) : null
          const toTime = to ? Date.parse(to) : null
          if (
            (fromTime !== null && Number.isNaN(fromTime)) ||
            (toTime !== null && Number.isNaN(toTime))
          ) {
            next[domId(field.id, 'from')] = t.form.errors.periodParse
          } else if (fromTime !== null && toTime !== null && fromTime > toTime) {
            next[domId(field.id, 'from')] = t.form.errors.periodOrder
          }
          break
        }
        case 'courseTopic': {
          const topic = value(`${field.id}:topic`)
          if (field.required && topic === '') {
            next[domId(field.id)] = t.form.errors.topic
          } else if (topic === OTHER_TOPIC && value(`${field.id}:other`).trim().length === 0) {
            next[domId(field.id, 'other')] = t.form.errors.topicOther
          }
          break
        }
        case 'email': {
          const filled = value(field.id).trim()
          if (field.required && filled.length === 0) {
            next[domId(field.id)] = t.form.errors.required(field.label)
          } else if (filled.length > 0 && !EMAIL_RE.test(filled)) {
            next[domId(field.id)] = t.form.errors.email
          }
          break
        }
        default: {
          if (field.required && value(field.id).trim().length === 0) {
            next[domId(field.id)] = t.form.errors.required(field.label)
          }
        }
      }
    }
    return next
  }

  /** Ordered DOM ids — core trio first, then each dynamic field's first input. */
  const focusOrder = [
    FIELD_IDS.companyName,
    FIELD_IDS.contactPerson,
    FIELD_IDS.email,
    ...fields.flatMap((field) =>
      field.fieldType === 'period'
        ? [domId(field.id, 'from')]
        : field.fieldType === 'courseTopic'
          ? [domId(field.id), domId(field.id, 'other')]
          : [domId(field.id)],
    ),
  ]

  function buildAnswers(): Array<Record<string, unknown>> {
    return fields.flatMap((field) => {
      switch (field.fieldType) {
        case 'period': {
          const from = value(`${field.id}:from`).trim()
          const to = value(`${field.id}:to`).trim()
          if (!from && !to) return []
          return [{ id: field.id, ...(from ? { from } : {}), ...(to ? { to } : {}) }]
        }
        case 'courseTopic': {
          const topic = value(`${field.id}:topic`)
          if (topic === '') return []
          if (topic === OTHER_TOPIC) {
            return [{ id: field.id, other: value(`${field.id}:other`).trim() }]
          }
          return [{ id: field.id, courseId: Number(topic) }]
        }
        default: {
          const filled = value(field.id).trim()
          return filled ? [{ id: field.id, value: filled }] : []
        }
      }
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setServerError('')

    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalid(nextErrors, focusOrder)
      return
    }

    setSubmitting(true)
    const honeypot = String(new FormData(form).get('website') ?? '')
    const result = await submitLead(
      {
        type: 'corporate',
        companyName: companyName.trim(),
        contactPerson: contactPerson.trim(),
        email: email.trim(),
        answers: buildAnswers(),
        website: honeypot,
      },
      t.form.errors.generic,
    )
    setSubmitting(false)

    if (result.ok) {
      setSubmitted(true)
    } else {
      setServerError(result.error)
    }
  }

  /** One dynamic field → its input(s); short fields flow into the 2-col grid, long ones
   * span the full row. */
  function renderField(field: CorporateFormField) {
    const id = domId(field.id)
    const error = errors[id]

    if (field.fieldType === 'textarea') {
      return (
        <div key={field.id} className="sm:col-span-2">
          <label htmlFor={id} className="sr-only">
            {field.label}
          </label>
          <textarea
            id={id}
            value={value(field.id)}
            onChange={(event) => setValue(field.id, event.target.value)}
            placeholder={field.label}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={`${inputCls} min-h-[106px] resize-none`}
          />
          <FieldError id={id} error={error} />
        </div>
      )
    }

    if (field.fieldType === 'period') {
      const fromId = domId(field.id, 'from')
      const toId = domId(field.id, 'to')
      const periodError = errors[fromId]
      return (
        <fieldset key={field.id} className="sm:col-span-2">
          <legend className="sr-only">{field.label}</legend>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="w-full">
              <label htmlFor={fromId} className="sr-only">
                {t.form.periodFromLabel}
              </label>
              {/* Plain text — no native date picker (owner 2026-07-13); parseability is
                  validated on submit instead. */}
              <input
                id={fromId}
                type="text"
                value={value(`${field.id}:from`)}
                onChange={(event) => setValue(`${field.id}:from`, event.target.value)}
                placeholder={t.form.periodFromPlaceholder}
                aria-invalid={periodError ? true : undefined}
                aria-describedby={periodError ? `${fromId}-error` : undefined}
                className={inputCls}
              />
              <FieldError id={fromId} error={periodError} />
            </div>
            <div className="w-full">
              <label htmlFor={toId} className="sr-only">
                {t.form.periodToLabel}
              </label>
              <input
                id={toId}
                type="text"
                value={value(`${field.id}:to`)}
                onChange={(event) => setValue(`${field.id}:to`, event.target.value)}
                placeholder={t.form.periodToPlaceholder}
                className={inputCls}
              />
            </div>
          </div>
        </fieldset>
      )
    }

    if (field.fieldType === 'courseTopic') {
      const topic = value(`${field.id}:topic`)
      const otherId = domId(field.id, 'other')
      const otherError = errors[otherId]
      return (
        <div key={field.id} className="contents">
          <div>
            <label htmlFor={id} className="sr-only">
              {field.label}
            </label>
            <select
              id={id}
              value={topic}
              onChange={(event) => setValue(`${field.id}:topic`, event.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              className={`${selectCls} ${topic === '' ? 'text-grey-600' : ''}`}
              style={{ backgroundImage: CHEVRON }}
            >
              <option value="" disabled>
                {field.label}
              </option>
              {courses.map((course) => (
                <option key={course.id} value={String(course.id)}>
                  {course.title}
                </option>
              ))}
              <option value={OTHER_TOPIC}>{t.form.topicOtherOption}</option>
            </select>
            <FieldError id={id} error={error} />
          </div>
          {topic === OTHER_TOPIC && (
            <div className="sm:col-span-2">
              <label htmlFor={otherId} className="sr-only">
                {t.form.topicOtherLabel}
              </label>
              <input
                id={otherId}
                value={value(`${field.id}:other`)}
                onChange={(event) => setValue(`${field.id}:other`, event.target.value)}
                placeholder={t.form.topicOtherLabel}
                aria-invalid={otherError ? true : undefined}
                aria-describedby={otherError ? `${otherId}-error` : undefined}
                className={inputCls}
              />
              <FieldError id={otherId} error={otherError} />
            </div>
          )}
        </div>
      )
    }

    if (field.fieldType === 'select') {
      const selected = value(field.id)
      return (
        <div key={field.id}>
          <label htmlFor={id} className="sr-only">
            {field.label}
          </label>
          <select
            id={id}
            value={selected}
            onChange={(event) => setValue(field.id, event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={`${selectCls} ${selected === '' ? 'text-grey-600' : ''}`}
            style={{ backgroundImage: CHEVRON }}
          >
            <option value="" disabled>
              {field.label}
            </option>
            {field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <FieldError id={id} error={error} />
        </div>
      )
    }

    // text | email | phone
    return (
      <div key={field.id}>
        <label htmlFor={id} className="sr-only">
          {field.label}
        </label>
        <input
          id={id}
          type={field.fieldType === 'email' ? 'email' : field.fieldType === 'phone' ? 'tel' : 'text'}
          value={value(field.id)}
          onChange={(event) => setValue(field.id, event.target.value)}
          placeholder={field.label}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={inputCls}
        />
        <FieldError id={id} error={error} />
      </div>
    )
  }

  return (
    <section id="corporate-form" aria-label={t.form.ariaLabel} className="bg-surface-subtle">
      {/* Content aligned to the shared Container (navbar-logo line — owner 2026-07-13);
          the Figma 625px + 380px columns go fluid with a 380px aside; the columns stack
          below lg (quality floor, CLAUDE.md §15). */}
      <Container className="pb-[110px] pt-[60px]">
        {/* Reveal = scroll-triggered fade + blur (owner 2026-07-13) */}
        <Reveal className="grid items-start gap-11 lg:grid-cols-[1fr_380px]">
          {/* Form card — grey line-soft frame + drop shadow (never a blue stroke) */}
          {submitted ? (
            <div className="w-full">
              <FormSuccess title={t.form.successTitle} message={t.form.successMessage} />
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              data-testid="corporate-form"
              className="flex w-full flex-col gap-3.5 rounded-[24px] border-[6px] border-[#F6F6F6] bg-white px-6 py-[34px] shadow-[3px_9px_20px_rgba(77,77,77,0.03)] sm:px-10"
            >
              <h2 className="text-[24px] font-medium tracking-[-0.8px] text-ink">
                {content.form.title}
              </h2>
              <p className="text-[14px] text-grey-600">{content.form.subtitle}</p>

              <HoneypotField />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Fixed core trio — leads + the notification e-mail depend on these. */}
                <div>
                  <label htmlFor={FIELD_IDS.companyName} className="sr-only">
                    {t.form.companyName}
                  </label>
                  <input
                    id={FIELD_IDS.companyName}
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    autoComplete="organization"
                    placeholder={t.form.companyName}
                    aria-invalid={errors[FIELD_IDS.companyName] ? true : undefined}
                    aria-describedby={
                      errors[FIELD_IDS.companyName] ? `${FIELD_IDS.companyName}-error` : undefined
                    }
                    className={inputCls}
                  />
                  <FieldError id={FIELD_IDS.companyName} error={errors[FIELD_IDS.companyName]} />
                </div>
                <div>
                  <label htmlFor={FIELD_IDS.contactPerson} className="sr-only">
                    {t.form.contactPerson}
                  </label>
                  <input
                    id={FIELD_IDS.contactPerson}
                    value={contactPerson}
                    onChange={(event) => setContactPerson(event.target.value)}
                    autoComplete="name"
                    placeholder={t.form.contactPerson}
                    aria-invalid={errors[FIELD_IDS.contactPerson] ? true : undefined}
                    aria-describedby={
                      errors[FIELD_IDS.contactPerson]
                        ? `${FIELD_IDS.contactPerson}-error`
                        : undefined
                    }
                    className={inputCls}
                  />
                  <FieldError
                    id={FIELD_IDS.contactPerson}
                    error={errors[FIELD_IDS.contactPerson]}
                  />
                </div>
                <div>
                  <label htmlFor={FIELD_IDS.email} className="sr-only">
                    {t.form.workEmail}
                  </label>
                  <input
                    id={FIELD_IDS.email}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder={t.form.workEmail}
                    aria-invalid={errors[FIELD_IDS.email] ? true : undefined}
                    aria-describedby={
                      errors[FIELD_IDS.email] ? `${FIELD_IDS.email}-error` : undefined
                    }
                    className={inputCls}
                  />
                  <FieldError id={FIELD_IDS.email} error={errors[FIELD_IDS.email]} />
                </div>

                {/* Admin-configured fields (corporatePage global), in configured order. */}
                {fields.map(renderField)}
              </div>

              {serverError && (
                <p role="alert" className="text-sm font-medium text-red-700">
                  {serverError}
                </p>
              )}

              {/* Gradient fill + drop shadow, no stroke. */}
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full border border-[#1C5D99] bg-gradient-to-b from-steel to-blue to-[80%] pb-3.5 pt-[13px] text-center text-[16px] font-medium text-white shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-transform hover:scale-[1.01] disabled:opacity-70"
              >
                {submitting ? t.form.submitting : t.form.submit}
              </button>
            </form>
          )}

          {/* Side column — 380px on desktop, stacked below lg */}
          <aside className="flex w-full flex-col gap-6">
            <div className="flex flex-col gap-3.5 rounded-[24px] border-[6px] border-[#F6F6F6] bg-white px-9 py-[30px]">
              <h3 className="text-[20px] font-medium tracking-[-0.8px] text-ink">
                {content.aside.nextTitle}
              </h3>
              {content.aside.steps.map((step, index) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-line-soft text-[13px] font-semibold text-blue">
                    {index + 1}
                  </span>
                  <span className="text-[14px] text-grey-600">{step}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2.5 rounded-[24px] bg-[#F6F6F6] px-9 py-[30px]">
              <h3 className="text-[16px] font-medium tracking-[-0.64px] text-ink">
                {content.aside.talkTitle}
              </h3>
              <a href={`mailto:${contactEmail}`} className="text-[15px] font-medium text-blue">
                {contactEmail}
              </a>
              {/* No response-time promise (§6) */}
              <p className="text-[13px] text-grey-600">{content.aside.talkNote}</p>
            </div>
          </aside>
        </Reveal>
      </Container>
    </section>
  )
}
