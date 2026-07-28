'use client'

import { useState } from 'react'

import { FormSuccess } from '../forms/FormSuccess'
import { HoneypotField } from '../forms/HoneypotField'
import { EMAIL_RE, focusFirstInvalid, submitLead } from '../forms/submitLead'
import { Container } from '../ui/Container'
import { Reveal } from '../ui/Reveal'
import type { Locale } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/dictionaries'

/**
 * Corporate / Lead Form — the proposal form + side column, redesign 1:1 from the owner's
 * Figma extract (node 3790:3694, Page / Corporate 3790:3624). Visuals follow the extract
 * (grey `border-line` strokes with GREY placeholders/focus — owner: no blue stroke, no blue
 * focus ring; emphasis via drop shadow on the line-soft frames); the FUNCTIONAL contract is
 * the proven one:
 *  - fields map to the Payload `leads` collection with type 'corporate' (CLAUDE.md §4) and
 *    submit via POST /api/leads/submit (`submitLead`) — the afterChange hook sends the
 *    single Brevo notification; this component never emails anything itself;
 *  - `topicCourse` is a real course ID from the published catalog (passed in by the page),
 *    with the "Other" option revealing a required free-text topic (server accepts exactly
 *    one of topicCourse/topicOther);
 *  - participants is a free-text range per the redesign (e.g. "10–25") — optional, exactly
 *    like the server treats `participantsRange` (≤ 50 chars);
 *  - honeypot (`website`), client-side validation with focus-first-invalid, and the
 *    thank-you state with NO response-time promise (§6);
 *  - every input keeps an sr-only <label> (the design is placeholder-only) so the form
 *    stays accessible and the e2e getByLabel contract holds.
 */

export type CorporateTopicOption = { id: number; title: string }

type Errors = Partial<
  Record<'companyName' | 'contactPerson' | 'email' | 'topic' | 'topicOther' | 'period', string>
>

const FIELD_IDS = {
  companyName: 'corporate-company-name',
  contactPerson: 'corporate-contact-person',
  email: 'corporate-email',
  phone: 'corporate-phone',
  participantsRange: 'corporate-participants-range',
  topic: 'corporate-topic',
  topicOther: 'corporate-topic-other',
  periodFrom: 'corporate-period-from',
  periodTo: 'corporate-period-to',
  message: 'corporate-message',
} as const

const OTHER_TOPIC = 'other'

/** Server-side cap on `participantsRange` (validateLeadInput MAX_RANGE_LENGTH). */
const MAX_PARTICIPANTS_LENGTH = 50

// Grey hairline + grey placeholders + GREY focus border (owner: no blue stroke and no blue
// focus ring anywhere on the form — focus darkens the hairline to #bdbdbd instead).
const inputCls =
  'w-full rounded-[14px] border border-[#E6E6E6] bg-white px-[18px] py-[13px] text-[15px] text-ink placeholder:text-[#959595] focus:border-[#bdbdbd] focus:outline-none'

// Selects swap the native chevron for a custom one inset from the right edge
// (owner 2026-07-13: the native arrow hugged the margin).
const selectCls = `${inputCls} appearance-none bg-no-repeat pr-11 [background-position:right_18px_center] [background-size:14px]`
const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 8' fill='none'%3E%3Cpath d='M1 1l6 6 6-6' stroke='%234d5b6a' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")"

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
}: {
  locale: Locale
  courses: CorporateTopicOption[]
  contactEmail?: string
}) {
  const t = getDictionary(locale).corporate
  const [companyName, setCompanyName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [participantsRange, setParticipantsRange] = useState('')
  const [topic, setTopic] = useState('')
  const [topicOther, setTopicOther] = useState('')
  const [periodFrom, setPeriodFrom] = useState('')
  const [periodTo, setPeriodTo] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState('')

  function validate(): Errors {
    const next: Errors = {}
    if (companyName.trim().length === 0) next.companyName = t.form.errors.companyName
    if (contactPerson.trim().length === 0) next.contactPerson = t.form.errors.contactPerson
    if (!EMAIL_RE.test(email)) next.email = t.form.errors.email
    if (topic === '') next.topic = t.form.errors.topic
    if (topic === OTHER_TOPIC && topicOther.trim().length === 0) {
      next.topicOther = t.form.errors.topicOther
    }
    // Free-text period (the native date picker was removed) — the server only accepts
    // parseable dates, so unparsable text is caught here instead of failing the submit.
    const fromTime = periodFrom.trim() ? Date.parse(periodFrom) : null
    const toTime = periodTo.trim() ? Date.parse(periodTo) : null
    if ((fromTime !== null && Number.isNaN(fromTime)) || (toTime !== null && Number.isNaN(toTime))) {
      next.period = t.form.errors.periodParse
    } else if (fromTime !== null && toTime !== null && fromTime > toTime) {
      next.period = t.form.errors.periodOrder
    }
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
          [FIELD_IDS.companyName]: nextErrors.companyName,
          [FIELD_IDS.contactPerson]: nextErrors.contactPerson,
          [FIELD_IDS.email]: nextErrors.email,
          [FIELD_IDS.topic]: nextErrors.topic,
          [FIELD_IDS.topicOther]: nextErrors.topicOther,
          [FIELD_IDS.periodFrom]: nextErrors.period,
        },
        [
          FIELD_IDS.companyName,
          FIELD_IDS.contactPerson,
          FIELD_IDS.email,
          FIELD_IDS.topic,
          FIELD_IDS.topicOther,
          FIELD_IDS.periodFrom,
        ],
      )
      return
    }

    setSubmitting(true)
    const honeypot = String(new FormData(form).get('website') ?? '')
    const result = await submitLead({
      type: 'corporate',
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim(),
      email: email.trim(),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(participantsRange.trim() ? { participantsRange: participantsRange.trim() } : {}),
      ...(topic === OTHER_TOPIC ? { topicOther: topicOther.trim() } : { topicCourse: Number(topic) }),
      ...(periodFrom.trim() || periodTo.trim()
        ? {
            preferredPeriod: {
              ...(periodFrom.trim() ? { from: periodFrom.trim() } : {}),
              ...(periodTo.trim() ? { to: periodTo.trim() } : {}),
            },
          }
        : {}),
      ...(message.trim() ? { message: message.trim() } : {}),
      website: honeypot,
    }, t.form.errors.generic)
    setSubmitting(false)

    if (result.ok) {
      setSubmitted(true)
    } else {
      setServerError(result.error)
    }
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
                {t.form.title}
              </h2>
              <p className="text-[14px] text-grey-600">{t.form.subtitle}</p>

              <HoneypotField />

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="w-full">
                  <label htmlFor={FIELD_IDS.companyName} className="sr-only">
                    {t.form.companyName}
                  </label>
                  <input
                    id={FIELD_IDS.companyName}
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    autoComplete="organization"
                    placeholder={t.form.companyName}
                    aria-invalid={errors.companyName ? true : undefined}
                    aria-describedby={
                      errors.companyName ? `${FIELD_IDS.companyName}-error` : undefined
                    }
                    className={inputCls}
                  />
                  <FieldError id={FIELD_IDS.companyName} error={errors.companyName} />
                </div>
                <div className="w-full">
                  <label htmlFor={FIELD_IDS.contactPerson} className="sr-only">
                    {t.form.contactPerson}
                  </label>
                  <input
                    id={FIELD_IDS.contactPerson}
                    value={contactPerson}
                    onChange={(event) => setContactPerson(event.target.value)}
                    autoComplete="name"
                    placeholder={t.form.contactPerson}
                    aria-invalid={errors.contactPerson ? true : undefined}
                    aria-describedby={
                      errors.contactPerson ? `${FIELD_IDS.contactPerson}-error` : undefined
                    }
                    className={inputCls}
                  />
                  <FieldError id={FIELD_IDS.contactPerson} error={errors.contactPerson} />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="w-full">
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
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={errors.email ? `${FIELD_IDS.email}-error` : undefined}
                    className={inputCls}
                  />
                  <FieldError id={FIELD_IDS.email} error={errors.email} />
                </div>
                <div className="w-full">
                  <label htmlFor={FIELD_IDS.phone} className="sr-only">
                    {t.form.phoneLabel}
                  </label>
                  <input
                    id={FIELD_IDS.phone}
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    autoComplete="tel"
                    placeholder={t.form.phonePlaceholder}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="w-full">
                  <label htmlFor={FIELD_IDS.participantsRange} className="sr-only">
                    {t.form.participantsLabel}
                  </label>
                  {/* Free-text range per the redesign (e.g. "10–25") — optional, mirrors the
                      server's `participantsRange` contract (plain string ≤ 50 chars). */}
                  <input
                    id={FIELD_IDS.participantsRange}
                    value={participantsRange}
                    onChange={(event) => setParticipantsRange(event.target.value)}
                    maxLength={MAX_PARTICIPANTS_LENGTH}
                    placeholder={t.form.participantsPlaceholder}
                    className={inputCls}
                  />
                </div>
                <div className="w-full">
                  <label htmlFor={FIELD_IDS.topic} className="sr-only">
                    {t.form.topicLabel}
                  </label>
                  <select
                    id={FIELD_IDS.topic}
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    aria-invalid={errors.topic ? true : undefined}
                    aria-describedby={errors.topic ? `${FIELD_IDS.topic}-error` : undefined}
                    className={`${selectCls} ${topic === '' ? 'text-grey-600' : ''}`}
                    style={{ backgroundImage: CHEVRON }}
                  >
                    <option value="" disabled>
                      {t.form.topicPlaceholder}
                    </option>
                    {courses.map((course) => (
                      <option key={course.id} value={String(course.id)}>
                        {course.title}
                      </option>
                    ))}
                    <option value={OTHER_TOPIC}>{t.form.topicOtherOption}</option>
                  </select>
                  <FieldError id={FIELD_IDS.topic} error={errors.topic} />
                </div>
              </div>

              {topic === OTHER_TOPIC && (
                <div>
                  <label htmlFor={FIELD_IDS.topicOther} className="sr-only">
                    {t.form.topicOtherLabel}
                  </label>
                  <input
                    id={FIELD_IDS.topicOther}
                    value={topicOther}
                    onChange={(event) => setTopicOther(event.target.value)}
                    placeholder={t.form.topicOtherLabel}
                    aria-invalid={errors.topicOther ? true : undefined}
                    aria-describedby={
                      errors.topicOther ? `${FIELD_IDS.topicOther}-error` : undefined
                    }
                    className={inputCls}
                  />
                  <FieldError id={FIELD_IDS.topicOther} error={errors.topicOther} />
                </div>
              )}

              <fieldset>
                <legend className="sr-only">{t.form.periodLegend}</legend>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="w-full">
                    <label htmlFor={FIELD_IDS.periodFrom} className="sr-only">
                      {t.form.periodFromLabel}
                    </label>
                    {/* Plain text — the native date picker (and its calendar icon) was removed
                        (owner 2026-07-13); parseability is validated on submit instead. */}
                    <input
                      id={FIELD_IDS.periodFrom}
                      type="text"
                      value={periodFrom}
                      onChange={(event) => setPeriodFrom(event.target.value)}
                      placeholder={t.form.periodFromPlaceholder}
                      aria-invalid={errors.period ? true : undefined}
                      aria-describedby={errors.period ? `${FIELD_IDS.periodFrom}-error` : undefined}
                      className={inputCls}
                    />
                    <FieldError id={FIELD_IDS.periodFrom} error={errors.period} />
                  </div>
                  <div className="w-full">
                    <label htmlFor={FIELD_IDS.periodTo} className="sr-only">
                      {t.form.periodToLabel}
                    </label>
                    <input
                      id={FIELD_IDS.periodTo}
                      type="text"
                      value={periodTo}
                      onChange={(event) => setPeriodTo(event.target.value)}
                      placeholder={t.form.periodToPlaceholder}
                      className={inputCls}
                    />
                  </div>
                </div>
              </fieldset>

              <div>
                <label htmlFor={FIELD_IDS.message} className="sr-only">
                  {t.form.messageLabel}
                </label>
                <textarea
                  id={FIELD_IDS.message}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={t.form.messageLabel}
                  className={`${inputCls} min-h-[106px] resize-none`}
                />
              </div>

              {serverError && (
                <p role="alert" className="text-sm font-medium text-red-700">
                  {serverError}
                </p>
              )}

              {/* Gradient fill + drop shadow, no stroke; the arrow is decorative (aria-hidden)
                  so the accessible name stays exactly `form.submit`. */}
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full border border-[#1C5D99] bg-gradient-to-b from-steel to-blue to-[80%] pb-3.5 pt-[13px] text-center text-[16px] font-medium text-white shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-transform hover:scale-[1.01] disabled:opacity-70"
              >
                {submitting ? (
                  t.form.submitting
                ) : (
                  <>
                    {t.form.submit}
                  </>
                )}
              </button>
            </form>
          )}

          {/* Side column — 380px on desktop, stacked below lg */}
          <aside className="flex w-full flex-col gap-6">
            <div className="flex flex-col gap-3.5 rounded-[24px] border-[6px] border-[#F6F6F6] bg-white px-9 py-[30px]">
              <h3 className="text-[20px] font-medium tracking-[-0.8px] text-ink">
                {t.aside.nextTitle}
              </h3>
              {t.aside.steps.map((step: string, index: number) => (
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
                {t.aside.talkTitle}
              </h3>
              <a href={`mailto:${contactEmail}`} className="text-[15px] font-medium text-blue">
                {contactEmail}
              </a>
              {/* No response-time promise (§6) */}
              <p className="text-[13px] text-grey-600">{t.aside.talkNote}</p>
            </div>
          </aside>
        </Reveal>
      </Container>
    </section>
  )
}
