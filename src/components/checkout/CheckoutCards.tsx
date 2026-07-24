'use client'

/**
 * Checkout / Cards — the four form-column cards from the owner's Figma redesign
 * (node 3790:4408, checkout redesign 3790:4379): Your Edition · Participants ·
 * Billing Details · Discount Code. Presentational only — `CheckoutForm` owns ALL
 * state, quoting and submission; these cards receive controlled values + callbacks.
 *
 * STYLE RULES v3 (owner decision — non-negotiable):
 * — Cards are BORDERLESS, lifted by DROP SHADOW only. NEVER a stroke on cards/chips.
 * — EXCEPTION inputs: thin grey `border-line` stroke, GREY placeholder (`grey-600`),
 *   focus = darker grey border (#bdbdbd), no blue ring.
 * — Blue only on titles/links/prices/accents + gradient FILLS (active toggle, dots).
 *   Discounts are GREEN (#2e8c57).
 * The design labels inputs by placeholder, so every input keeps an sr-only <label> with
 * the long-standing checkout label text (a11y + `getByLabel` e2e contract).
 */

import Link from 'next/link'
import type { KeyboardEvent } from 'react'

import { getDictionary } from '@/lib/i18n/dictionaries'
import type { Locale } from '@/lib/i18n/config'
import { CODE_INPUT_ID, MAX_SEATS } from './constants'

export const inputCls =
  'w-full rounded-[14px] border bg-white px-[16px] py-[12px] text-[14px] text-ink placeholder:text-grey-600 focus:border-[#bdbdbd] focus:outline-none lg:px-[18px] lg:py-[13px] lg:text-[15px]'

/** Borderless card lifted by drop shadow only — no stroke anywhere (style v3).
 *  v2 responsive: padding 24 + gap 16 pe mobil (Figma 3932-118), desktop neschimbat. */
const cardCls =
  'flex w-full flex-col gap-4 rounded-[24px] bg-white px-6 py-6 shadow-[0_10px_40px_rgba(77,77,77,0.06),0_2px_8px_rgba(77,77,77,0.03)] lg:gap-5 lg:px-[46px] lg:py-10'

const textLinkCls =
  'text-[14px] font-medium text-grey-600 underline underline-offset-2 hover:text-ink'

/** Placeholder-styled input with an sr-only label + inline error (a11y/e2e contract). */
function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  type = 'text',
  autoComplete,
  className,
  onKeyDown,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  error?: string
  type?: 'text' | 'email' | 'tel'
  autoComplete?: string
  className?: string
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
}) {
  return (
    <div className={`flex min-w-0 flex-1 flex-col ${className ?? ''}`}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${inputCls} ${error ? 'border-red-400' : 'border-line'}`}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[13px] font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

/* ---------- Card / Your Edition (simplified — Figma 3790:4408) ---------- */
export function EditionSummaryCard({
  locale,
  course,
  track,
  startDateLabel,
  seatsLeft,
  seatsThreshold,
  courseHref,
}: {
  locale: Locale
  course: string
  track: string
  /** Locale-formatted start date (e.g. "28 Jul 2026") — null hides the chip. */
  startDateLabel: string | null
  seatsLeft: number | null
  seatsThreshold: number
  courseHref: string
}) {
  const t = getDictionary(locale).checkout
  return (
    <section className={cardCls}>
      <div className="flex flex-col gap-1">
        <p className="text-[12px] font-medium tracking-[0.2px] text-grey-600 lg:text-[14px] lg:font-normal lg:tracking-normal">
          {t.yourEdition}
        </p>
        <h2 className="text-[20px] font-medium leading-[28px] tracking-[-0.5px] text-ink lg:text-[24px] lg:leading-normal lg:tracking-[-0.8px]">
          {course}
        </h2>
        <p className="text-[14px] leading-[21px] text-ink lg:text-[16px] lg:leading-normal">
          {track}
        </p>
      </div>

      {/* Start-date chip — white pill lifted by drop shadow, no stroke (style v3) */}
      {startDateLabel && (
        <span className="flex w-fit items-center gap-2 rounded-full bg-white px-4 py-1.5 shadow-[0_2px_10px_rgba(77,77,77,0.10)]">
          <span aria-hidden className="size-2.5 rounded-full bg-gradient-to-b from-blue to-steel" />
          <span className="text-[14px] font-medium tracking-[-0.56px] text-ink">
            {t.startDateChip(startDateLabel)}
          </span>
        </span>
      )}

      <hr className="border-line" />

      <div className="flex flex-wrap items-center justify-between gap-2">
        {seatsLeft != null && seatsLeft < seatsThreshold && (
          <p className="text-[13px] font-medium tracking-[-0.4px] text-blue lg:text-[14px] lg:tracking-[-0.56px]">
            {t.seatsLeft(seatsLeft)}
          </p>
        )}
        <Link
          href={courseHref}
          className="ml-auto text-[13.5px] font-medium text-grey-600 hover:text-blue lg:text-[14px]"
        >
          {t.changeEdition}
        </Link>
      </div>
    </section>
  )
}

/* ---------- Card / Participants ---------- */
export function ParticipantsCard({
  locale,
  quantity,
  onQuantityChange,
  participants,
  participantCount,
  onParticipantChange,
  enrolSomeoneElse,
  onEnrolSomeoneElseChange,
  fieldErrors,
}: {
  locale: Locale
  quantity: number
  onQuantityChange: (next: number) => void
  participants: { name: string; email: string }[]
  /** Field-pairs on screen — 0 means the buyer is the sole participant (CLAUDE.md §6). */
  participantCount: number
  onParticipantChange: (index: number, field: 'name' | 'email', value: string) => void
  enrolSomeoneElse: boolean
  onEnrolSomeoneElseChange: (value: boolean) => void
  fieldErrors: Record<string, string>
}) {
  const t = getDictionary(locale).checkout
  return (
    <section className={cardCls}>
      <div className="flex items-start justify-between gap-3 lg:items-center lg:gap-4">
        <div className="min-w-0">
          <h2 className="text-[18px] font-medium leading-[26px] tracking-[-0.5px] text-ink lg:text-[20px] lg:leading-normal lg:tracking-[-0.8px]">
            {t.participantsTitle}
          </h2>
          {/* Green accent on the discount amount (style v3) — DESKTOP node */}
          <p className="hidden pt-1 text-[14px] text-grey-600 lg:block">
            <span className="font-medium text-[#2e8c57]">{t.groupDiscountNoteAccent}</span>{' '}
            {t.groupDiscountNoteRest}
          </p>
        </div>
        <div className="flex shrink-0 items-center rounded-full bg-line-soft p-1.5">
          <button
            type="button"
            onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
            aria-label={t.decreaseSeats}
            disabled={quantity <= 1}
            className="flex size-9 items-center justify-center rounded-full text-[16px] font-medium text-grey-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            −
          </button>
          <span
            aria-live="polite"
            data-testid="seats-count"
            className="flex size-9 items-center justify-center rounded-full bg-white text-[16px] font-semibold text-ink shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
          >
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => onQuantityChange(Math.min(MAX_SEATS, quantity + 1))}
            aria-label={t.increaseSeats}
            disabled={quantity >= MAX_SEATS}
            className="flex size-9 items-center justify-center rounded-full text-[16px] font-medium text-grey-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      {/* Textul de discount — pe MOBIL sub titlu, full-width (nod separat, Figma 3932-118) */}
      <p className="-mt-1 text-[13px] leading-[19px] text-[#595959] lg:hidden">
        <span className="font-medium text-[#2e8c57]">{t.groupDiscountNoteAccent}</span>{' '}
        {t.groupDiscountNoteRest}
      </p>

      {quantity === 1 && !enrolSomeoneElse && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-line-soft px-[18px] py-[13px]">
          <p className="text-[15px] text-ink">{t.buyerIsParticipant}</p>
          <button type="button" onClick={() => onEnrolSomeoneElseChange(true)} className={textLinkCls}>
            {t.enrolSomeoneElse}
          </button>
        </div>
      )}

      {Array.from({ length: participantCount }, (_, index) => {
        const participant = participants[index] ?? { name: '', email: '' }
        return (
          <div
            key={index}
            data-testid="participant-fields"
            className="flex items-start gap-2.5 lg:gap-3"
          >
            {/* Bulina numerotată — pe mobil lângă COLOANA de input-uri (albastră, 26px) */}
            <span
              aria-hidden
              className="mt-2 flex size-[26px] shrink-0 items-center justify-center rounded-full bg-line-soft text-[12px] font-semibold text-[#1c5d99] lg:mt-[9px] lg:size-8 lg:text-[13px] lg:text-ink"
            >
              {index + 1}
            </span>
            {/* Mobil: input-urile stivuite; desktop: alături */}
            <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:gap-3">
              <TextField
                id={`checkout-participant-${index}-name`}
                label={t.nameLabel}
                value={participant.name}
                onChange={(value) => onParticipantChange(index, 'name', value)}
                placeholder={t.fullNamePlaceholder}
                autoComplete="off"
                error={fieldErrors[`checkout-participant-${index}-name`]}
              />
              <TextField
                id={`checkout-participant-${index}-email`}
                label={t.emailLabel}
                type="email"
                value={participant.email}
                onChange={(value) => onParticipantChange(index, 'email', value)}
                placeholder={t.participantEmailPlaceholder}
                autoComplete="off"
                error={fieldErrors[`checkout-participant-${index}-email`]}
              />
            </div>
          </div>
        )
      })}

      {quantity === 1 && enrolSomeoneElse && (
        <button
          type="button"
          onClick={() => onEnrolSomeoneElseChange(false)}
          className={`self-start ${textLinkCls}`}
        >
          {t.buyerIsParticipantAction}
        </button>
      )}
    </section>
  )
}

/* ---------- Card / Billing Details ---------- */
export function BillingCard({
  locale,
  isCompany,
  onTypeChange,
  buyerName,
  onBuyerNameChange,
  buyerEmail,
  onBuyerEmailChange,
  buyerPhone,
  onBuyerPhoneChange,
  companyName,
  onCompanyNameChange,
  cui,
  onCuiChange,
  address,
  onAddressChange,
  fieldErrors,
}: {
  locale: Locale
  isCompany: boolean
  onTypeChange: (company: boolean) => void
  buyerName: string
  onBuyerNameChange: (value: string) => void
  buyerEmail: string
  onBuyerEmailChange: (value: string) => void
  buyerPhone: string
  onBuyerPhoneChange: (value: string) => void
  companyName: string
  onCompanyNameChange: (value: string) => void
  cui: string
  onCuiChange: (value: string) => void
  address: string
  onAddressChange: (value: string) => void
  fieldErrors: Record<string, string>
}) {
  const t = getDictionary(locale).checkout
  return (
    <section className={cardCls}>
      {/* Mobil: toggle-ul coboară SUB titlu (flex-col); desktop: pe un rând */}
      <div className="flex flex-col items-start gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div>
          <h2 className="text-[18px] font-medium leading-[26px] tracking-[-0.5px] text-ink lg:text-[20px] lg:leading-normal lg:tracking-[-0.8px]">
            {t.billingTitle}
          </h2>
          <p className="pt-1 text-[13px] leading-[19px] text-grey-600 lg:text-[14px] lg:leading-normal">
            {t.billingNote}
          </p>
        </div>
        {/* Segmented toggle — the active option has a gradient FILL, never a stroke */}
        <div className="flex rounded-full bg-line-soft p-1 lg:p-1.5">
          {[
            { label: t.individual, company: false },
            { label: t.company, company: true },
          ].map(({ label, company }) => {
            const active = company === isCompany
            return (
              <button
                key={label}
                type="button"
                aria-pressed={active}
                onClick={() => onTypeChange(company)}
                className={`rounded-full px-4 py-1.5 text-[13px] font-medium lg:py-[7px] lg:text-[14px] ${
                  active
                    ? 'bg-gradient-to-b from-steel to-blue to-[80%] text-white'
                    : 'text-grey-600'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Mobil: input-urile stivuite; desktop: alături */}
      <div className="flex flex-col gap-2.5 lg:flex-row lg:gap-3">
        <TextField
          id="checkout-buyer-name"
          label={t.fullNameLabel}
          value={buyerName}
          onChange={onBuyerNameChange}
          placeholder={t.contactNamePlaceholder}
          autoComplete="name"
          error={fieldErrors['checkout-buyer-name']}
        />
        <TextField
          id="checkout-buyer-email"
          label={t.emailLabel}
          type="email"
          value={buyerEmail}
          onChange={onBuyerEmailChange}
          placeholder={t.buyerEmailPlaceholder}
          autoComplete="email"
          error={fieldErrors['checkout-buyer-email']}
        />
      </div>

      {isCompany ? (
        <>
          <div className="flex flex-col gap-2.5 lg:flex-row lg:gap-3">
            <TextField
              id="checkout-buyer-phone"
              label={t.phoneLabel}
              type="tel"
              value={buyerPhone}
              onChange={onBuyerPhoneChange}
              placeholder={t.phonePlaceholder}
              autoComplete="tel"
            />
            <TextField
              id="checkout-company-name"
              label={t.companyNameLabel}
              value={companyName}
              onChange={onCompanyNameChange}
              placeholder={t.companyNamePlaceholder}
              autoComplete="organization"
              error={fieldErrors['checkout-company-name']}
            />
            <TextField
              id="checkout-company-cui"
              label={t.cuiLabel}
              value={cui}
              onChange={onCuiChange}
              placeholder={t.cuiPlaceholder}
              error={fieldErrors['checkout-company-cui']}
            />
          </div>
          <TextField
            id="checkout-company-address"
            label={t.companyAddressLabel}
            value={address}
            onChange={onAddressChange}
            placeholder={t.companyAddressPlaceholder}
            autoComplete="street-address"
            error={fieldErrors['checkout-company-address']}
          />
        </>
      ) : (
        <div className="flex gap-3">
          <TextField
            id="checkout-buyer-phone"
            label={t.phoneLabel}
            type="tel"
            value={buyerPhone}
            onChange={onBuyerPhoneChange}
            placeholder={t.phonePlaceholder}
            autoComplete="tel"
          />
        </div>
      )}
    </section>
  )
}

/* ---------- Card / Discount Code ---------- */
export function DiscountCodeCard({
  locale,
  codeInput,
  onCodeInputChange,
  onApply,
  applying,
  appliedCode,
  codeError,
  onRemoveCode,
  showStackNote,
}: {
  locale: Locale
  codeInput: string
  onCodeInputChange: (value: string) => void
  onApply: () => void
  applying: boolean
  appliedCode: string | null
  codeError: string | null
  onRemoveCode: () => void
  /** True only under `stackingPolicy: stackAll` (§13, config-driven copy). */
  showStackNote: boolean
}) {
  const t = getDictionary(locale).checkout
  return (
    <section className={cardCls}>
      {appliedCode ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px] text-ink">
            {t.codeAppliedPrefix} <span className="font-semibold">{appliedCode}</span>{' '}
            {t.codeAppliedSuffix}
          </p>
          <button type="button" onClick={onRemoveCode} className={textLinkCls}>
            {t.removeCode}
          </button>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <TextField
            id={CODE_INPUT_ID}
            label={t.discountCodeLabel}
            value={codeInput}
            onChange={onCodeInputChange}
            placeholder={t.codePlaceholder}
            autoComplete="off"
            error={codeError ?? undefined}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onApply()
              }
            }}
          />
          <button
            type="button"
            onClick={onApply}
            disabled={applying}
            className="shrink-0 rounded-[20px] bg-black px-5 py-[13px] text-[14px] font-semibold text-white transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            {applying ? t.checking : t.apply}
          </button>
        </div>
      )}
      {appliedCode && codeError && (
        <p role="alert" className="text-[13px] font-medium text-red-700">
          {codeError}
        </p>
      )}
      {showStackNote && <p className="text-[14px] text-grey-600">{t.stackNote}</p>}
    </section>
  )
}
