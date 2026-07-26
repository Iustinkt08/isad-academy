'use client'

/**
 * Contact / Form — cardul „Send us a message". RESPONSIVE.
 * Desktop (≥lg): 1:1 cu Figma 3977-489 — card 700, padding 34, titlu 24,
 *   Full name + Email pe un rând, Subject full, textarea 140, footer pe un
 *   rând (buton + nota de Privacy la dreapta).
 * Mobil (<lg):  1:1 cu Figma 3977-531 — card 350, padding 24, titlu 18/26,
 *   toate câmpurile stivuite (inputuri 44), buton FULL-WIDTH, nota de Privacy
 *   CENTRATĂ sub buton.
 *
 * REGULI DE STIL (owner): stroke-uri DOAR gri (#E6E6E6 pe câmpuri, #F6F6F6
 * 6px pe card), placeholder-e GRI #959595, focus #BDBDBD — FĂRĂ albastru pe
 * contururi. Umbra triplă a cardurilor. TOATE valorile EXPLICITE (px/hex).
 *
 * Integrare: refolosește plumbing-ul existent de lead-uri — POST
 * /api/leads/submit prin `submitLead` (honeypot + validare server în
 * `src/lib/leads/*`; emailul Brevo pleacă din hook-ul afterChange al colecției
 * `leads`, NU de aici). Subject e select (schema `leads.subject` e enum);
 * opțional în UI — fallback `other` la trimitere. Labels/erori/succes din
 * dicționar (site bilingv EN/RO).
 */

import { useState } from 'react'

import { HoneypotField } from '@/components/forms/HoneypotField'
import { EMAIL_RE, focusFirstInvalid, submitLead } from '@/components/forms/submitLead'
import type { Locale } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/dictionaries'

type Errors = Partial<Record<'name' | 'email' | 'message', string>>

const FIELD_IDS = {
  name: 'contact-name',
  email: 'contact-email',
  subject: 'contact-subject',
  message: 'contact-message',
} as const

/** Payload `leads.subject` select values — labels come from the dictionary. */
const SUBJECT_VALUES = ['course', 'corporate', 'certification', 'other'] as const

/** Umbra triplă a cardurilor (din #4D4D4D) — identică pe formular și pe succes. */
const cardShadowCls =
  'shadow-[24px_80px_50px_rgba(77,77,77,0.02),10px_36px_37px_rgba(77,77,77,0.03),3px_9px_20px_rgba(77,77,77,0.03)]'

/** Câmp: radius 14, bordură 1px #E6E6E6, focus #BDBDBD (fără ring albastru). */
const fieldCls =
  'w-full rounded-[14px] border border-[#e6e6e6] bg-white px-4 py-3 text-[14px] leading-5 placeholder:text-[#959595] focus:border-[#bdbdbd] focus:outline-none lg:px-[18px] lg:py-[13px] lg:text-[15px] lg:leading-[22px]'
const inputCls = `${fieldCls} text-[#222222]`
const errorCls = 'text-[12px] leading-[18px] text-red-700'

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className={errorCls}>
      {message}
    </p>
  )
}

export default function ContactForm({
  locale,
  privacyHref = '/privacy',
}: {
  locale: Locale
  privacyHref?: string
}) {
  const t = getDictionary(locale).contact.form
  const [subject, setSubject] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState('')

  if (submitted) {
    // Stare de succes simplă — mesajul înlocuiește formularul, în același shell de card.
    return (
      <div
        data-testid="form-success"
        className={`flex w-full flex-col rounded-[24px] border-[6px] border-[#f6f6f6] bg-white p-6 ${cardShadowCls} lg:p-[34px]`}
      >
        <div role="status">
          <h2 className="text-[18px] font-medium leading-[26px] tracking-[-0.5px] text-[#222222] lg:text-[24px] lg:leading-normal lg:tracking-[-0.8px]">
            {t.successTitle}
          </h2>
          <p className="mt-2 text-[14px] leading-[21px] text-[#595959] lg:text-[15px] lg:leading-[22px]">
            {t.successMessage}
          </p>
        </div>
      </div>
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setServerError('')

    const data = new FormData(form)
    const name = String(data.get('name') ?? '').trim()
    const email = String(data.get('email') ?? '').trim()
    const message = String(data.get('message') ?? '').trim()
    const honeypot = String(data.get('website') ?? '')

    // Validare client: name/email/message obligatorii (Subject e opțional — fallback `other`).
    const nextErrors: Errors = {}
    if (name.length === 0) nextErrors.name = t.errors.name
    if (!EMAIL_RE.test(email)) nextErrors.email = t.errors.email
    if (message.length === 0) nextErrors.message = t.errors.message
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalid(
        {
          [FIELD_IDS.name]: nextErrors.name,
          [FIELD_IDS.email]: nextErrors.email,
          [FIELD_IDS.message]: nextErrors.message,
        },
        [FIELD_IDS.name, FIELD_IDS.email, FIELD_IDS.message],
      )
      return
    }

    setSubmitting(true)
    const result = await submitLead(
      {
        type: 'contact',
        name,
        email,
        subject: subject === '' ? 'other' : subject,
        message,
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
    <form
      noValidate
      data-testid="contact-form"
      className={`flex w-full flex-col gap-3 rounded-[24px] border-[6px] border-[#f6f6f6] bg-white p-6 ${cardShadowCls} lg:w-[700px] lg:gap-4 lg:p-[34px]`}
      onSubmit={handleSubmit}
    >
      <h2 className="text-[18px] font-medium leading-[26px] tracking-[-0.5px] text-[#222222] lg:text-[24px] lg:leading-normal lg:tracking-[-0.8px]">
        {t.title}
      </h2>

      <HoneypotField />

      {/* Mobil: stivuite; desktop: Full name + Email pe un rând */}
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <input
            id={FIELD_IDS.name}
            name="name"
            autoComplete="name"
            aria-label={t.name}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? `${FIELD_IDS.name}-error` : undefined}
            placeholder={t.name}
            className={inputCls}
          />
          <FieldError id={`${FIELD_IDS.name}-error`} message={errors.name} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <input
            id={FIELD_IDS.email}
            name="email"
            type="email"
            autoComplete="email"
            aria-label={t.email}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? `${FIELD_IDS.email}-error` : undefined}
            placeholder={t.email}
            className={inputCls}
          />
          <FieldError id={`${FIELD_IDS.email}-error`} message={errors.email} />
        </div>
      </div>

      {/* Subject: select (enum-ul `leads.subject`) stilizat identic cu inputurile;
          chevron gri discret — singura completare față de Figma (affordance). */}
      <div className="relative">
        <select
          id={FIELD_IDS.subject}
          name="subject"
          aria-label={t.subject}
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className={`${fieldCls} appearance-none pr-10 ${subject === '' ? 'text-[#959595]' : 'text-[#222222]'}`}
        >
          <option value="" disabled>
            {t.subject}
          </option>
          {SUBJECT_VALUES.map((value) => (
            <option key={value} value={value} className="text-[#222222]">
              {t.subjects[value]}
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"
        >
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="#959595"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="flex flex-col gap-1">
        <textarea
          id={FIELD_IDS.message}
          name="message"
          aria-label={t.message}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? `${FIELD_IDS.message}-error` : undefined}
          placeholder={t.message}
          className={`${inputCls} h-[120px] resize-none pt-[13px] lg:h-[140px] lg:pt-[14px]`}
        />
        <FieldError id={`${FIELD_IDS.message}-error`} message={errors.message} />
      </div>

      {serverError && (
        <p role="alert" className="text-[13px] font-medium leading-[18px] text-red-700">
          {serverError}
        </p>
      )}

      {/* Footer: mobil = buton full-width + nota centrată; desktop = pe un rând */}
      <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-[999px] bg-gradient-to-b from-[#407ea2] to-[#1c5d99] to-[80%] pb-[13px] pt-3 text-center text-[16px] font-medium leading-normal text-white shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-transform hover:scale-[1.02] disabled:opacity-60 lg:px-[22px] lg:pb-3 lg:pt-[11px]"
        >
          {submitting ? t.submitting : `${t.submit} →`}
        </button>
        <p className="text-center text-[12px] leading-[18px] text-[#959595] lg:text-left">
          {t.privacyPrefix}
          <a href={privacyHref} className="underline-offset-2 hover:underline">
            {t.privacyLinkLabel}
          </a>
          {t.privacySuffix}
        </p>
      </div>
    </form>
  )
}
