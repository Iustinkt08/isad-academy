/**
 * Checkout / Order Summary — price breakdown + Pay CTA + trust notes, and the
 * "What happens next" card. Owner Figma redesign, node 3790:4511 (checkout 3790:4379).
 *
 * Every pricing line renders a field of the server-computed `PricingSnapshot`
 * (`computeOrderPricing`, CLAUDE.md §8) — nothing is re-derived client-side except the
 * subtotal display (basePrice × quantity) using the engine's own rounding.
 * STYLE v3: card BORDERLESS + drop shadow (no stroke). Discounts GREEN (#2e8c57).
 * Pay CTA = gradient FILL, no border. Trust notes get a gradient CHECKMARK.
 * Bilingual site (RO under /ro): all copy comes from the `checkout` dictionary section.
 */

import Link from 'next/link'

import {
  GROUP_DISCOUNT_PERCENT,
  GROUP_MIN_QUANTITY,
  roundCurrency,
  type PricingSnapshot,
} from '@/lib/pricing'
import { getDictionary } from '@/lib/i18n/dictionaries'
import type { Locale } from '@/lib/i18n/config'
import { formatPrice } from '../courses/helpers'

const CHECK_GRADIENT_ID = 'checkout-check-gradient'

/** Gradient checkmark for the trust notes (style v3 — checkmarks, not dots). */
function Check() {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className="mt-0.5 shrink-0"
    >
      <path
        d="M2.5 7.3L5.5 10.3L11.5 3"
        stroke={`url(#${CHECK_GRADIENT_ID})`}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SummaryLine({
  label,
  value,
  discount,
  onRemove,
  removeLabel,
}: {
  label: string
  value: string
  discount?: boolean
  onRemove?: () => void
  removeLabel?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      {/* Rândul de cod (are onRemove): pe mobil etichetă 13/20 + „Remove code" inline 12 Medium #595959 */}
      <span
        className={`flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-ink lg:text-[15px] ${
          onRemove ? 'text-[13px] leading-5 lg:leading-[21px]' : 'text-[14px] leading-[21px]'
        }`}
      >
        {label}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[12px] font-medium leading-[18px] text-[#595959] hover:text-ink lg:font-semibold lg:leading-normal lg:text-grey-600 lg:underline lg:underline-offset-2"
          >
            {removeLabel}
          </button>
        )}
      </span>
      {/* shrink-0 ⇒ sumele stau pe aceeași muchie dreaptă, neînghesuite de label */}
      <span
        className={`shrink-0 text-[14px] font-medium lg:text-[15px] ${discount ? 'text-[#2e8c57]' : 'text-ink'}`}
      >
        {value}
      </span>
    </div>
  )
}

export default function OrderSummaryCard({
  locale,
  course,
  editionLabel,
  pricing,
  quantity,
  currency,
  vatDisplay,
  updating,
  fallback,
  codes,
  onRemoveCode,
  generalError,
  soldOut,
  courseHref,
  submitting,
}: {
  locale: Locale
  course: string
  editionLabel: string
  /** Server-authoritative snapshot (quote endpoint / SSR `computeOrderPricing`). */
  pricing: PricingSnapshot | null
  quantity: number
  currency: string
  vatDisplay: 'incl' | 'excl'
  updating: boolean
  /** True when the quote endpoint failed and the snapshot is a client-side, code-less estimate. */
  fallback: boolean
  /** One row per applied code (max 2, application order) — label + that code's discount. */
  codes: { label: string; discount: number }[]
  onRemoveCode?: (code: string) => void
  generalError: string | null
  soldOut: boolean
  courseHref: string
  submitting: boolean
}) {
  const t = getDictionary(locale).checkout
  const trustNotes = [t.trustRefund, t.trustInvoice, t.trustInvite]

  return (
    <div
      data-testid="order-summary"
      className="flex w-full flex-col gap-3.5 rounded-[24px] bg-white px-6 py-[26px] shadow-[3px_9px_24px_rgba(77,77,77,0.04)] lg:gap-4 lg:px-[42px] lg:py-10 lg:shadow-[0_10px_44px_rgba(77,77,77,0.07),0_2px_8px_rgba(77,77,77,0.03)]"
    >
      <h2 className="text-[18px] font-medium leading-[26px] tracking-[-0.5px] text-ink lg:text-[20px] lg:leading-normal lg:tracking-[-0.8px]">
        {t.orderSummary}
      </h2>

      <div>
        <p className="text-[15px] font-medium leading-[22px] tracking-[-0.3px] text-ink">
          {course}
        </p>
        <p className="pt-0.5 text-[13px] leading-[19px] text-[#959595] lg:text-grey-600">
          {editionLabel}
        </p>
      </div>

      <hr className="border-[#ececec] lg:border-line" />

      <p aria-live="polite" className="sr-only">
        {updating ? t.updatingPrice : ''}
      </p>

      {pricing ? (
        <div
          data-testid="pricing-breakdown"
          className={`flex flex-col gap-3.5 lg:gap-4 ${updating ? 'opacity-60' : ''}`}
        >
          <SummaryLine
            label={t.seatsLine(quantity, t.windowNames[pricing.appliedWindow])}
            value={formatPrice(roundCurrency(pricing.basePrice * quantity), currency)}
          />
          {pricing.groupDiscount > 0 && (
            <SummaryLine
              discount
              label={t.groupDiscountLine(GROUP_MIN_QUANTITY, GROUP_DISCOUNT_PERCENT)}
              value={`−${formatPrice(pricing.groupDiscount, currency)}`}
            />
          )}
          {pricing.memberDiscount > 0 && (
            <SummaryLine
              discount
              label={t.memberDiscount}
              value={`−${formatPrice(pricing.memberDiscount, currency)}`}
            />
          )}
          {/* One row per applied code — codes stack, max 2 (owner 2026-07-25) */}
          {codes.map((code) =>
            code.discount > 0 ? (
              <SummaryLine
                key={code.label}
                discount
                label={t.codeLine(code.label)}
                value={`−${formatPrice(code.discount, currency)}`}
                onRemove={onRemoveCode ? () => onRemoveCode(code.label) : undefined}
                removeLabel={t.removeCode}
              />
            ) : null,
          )}
        </div>
      ) : (
        !updating && <p className="text-[14px] text-grey-600">{t.pricingUnavailable}</p>
      )}

      {fallback && (
        <p role="status" className="text-[12px] text-grey-600">
          {t.fallbackEstimate}
        </p>
      )}

      <hr className="border-[#ececec] lg:border-line" />

      <div className="flex items-center justify-between gap-3">
        <span className="text-[17px] font-semibold leading-[25px] tracking-[-0.4px] text-ink lg:text-[18px] lg:leading-normal">
          {t.total}
        </span>
        <span className="shrink-0 text-[20px] font-semibold leading-[28px] tracking-[-0.5px] text-ink lg:text-[22px] lg:leading-normal">
          {pricing ? formatPrice(pricing.total, currency) : '—'}
        </span>
      </div>
      <p className="text-[12px] leading-[18px] text-[#959595] lg:leading-normal lg:text-grey-600">
        {vatDisplay === 'excl' ? t.vatNotRegistered : t.vatIncluded}
      </p>

      {generalError && (
        <div
          id="checkout-error-panel"
          role="alert"
          tabIndex={-1}
          className="rounded-[14px] border border-red-300 bg-red-50 px-4 py-3"
        >
          <p className="text-[14px] font-semibold text-red-800">{generalError}</p>
          {soldOut && (
            <p className="mt-1 text-[13px] text-red-800">
              {t.soldOutNotifyPrefix}{' '}
              <Link href={courseHref} className="font-semibold underline underline-offset-2">
                {t.coursePageLinkLabel}
              </Link>
              .
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || soldOut || !pricing}
        className="w-full rounded-full bg-gradient-to-b from-steel to-blue to-[80%] pb-3.5 pt-[13px] text-center text-[16px] font-medium text-white shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
      >
        {submitting ? t.processing : t.paySecurely}
      </button>

      {/* Gradient stroke defs declared ONCE; every checkmark references it by URL. */}
      <svg aria-hidden width="0" height="0" className="absolute">
        <defs>
          <linearGradient
            id={CHECK_GRADIENT_ID}
            x1="2.5"
            y1="3"
            x2="11.5"
            y2="10.3"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#407EA2" />
            <stop offset="1" stopColor="#1C5D99" />
          </linearGradient>
        </defs>
      </svg>
      {/* Bifele gradient aliniate SUS — pe mobil la 14px una de alta (Figma 3977-251) */}
      <ul className="flex flex-col gap-3.5 lg:gap-2 lg:pt-1">
        {trustNotes.map((note) => (
          <li key={note} className="flex items-start gap-2">
            <Check />
            <span className="flex-1 text-[13px] leading-[19px] text-[#595959] lg:text-grey-600">
              {note}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** The "What happens next" card under the summary (Figma: Card / What Happens Next).
 * `steps` overrides the three lines (confirmation page, Figma 4031-156) — without it the
 * checkout copy renders unchanged. */
export function WhatHappensNext({ locale, steps }: { locale: Locale; steps?: string[] }) {
  const t = getDictionary(locale).checkout
  return (
    <div className="flex w-full flex-col gap-2.5 rounded-[24px] bg-line-soft px-6 py-[22px] lg:gap-3 lg:px-9 lg:py-7">
      <h3 className="text-[15px] font-medium leading-[22px] tracking-[-0.4px] text-ink lg:text-[16px] lg:tracking-[-0.64px]">
        {t.whatHappensNext}
      </h3>
      {/* Numerele pe coloana lor + textul cu hanging indent (Figma 3932-118) */}
      {(steps ?? [t.nextStepPay, t.nextStepInvoice, t.nextStepJoin]).map((step, index) => (
        <div key={step} className="flex items-start gap-2.5">
          <span className="w-3 shrink-0 text-[13px] font-medium leading-5 text-[#959595] lg:text-grey-600">
            {index + 1}
          </span>
          <span className="flex-1 text-[13.5px] leading-5 text-[#595959] lg:text-[14px] lg:text-grey-600">
            {step}
          </span>
        </div>
      ))}
    </div>
  )
}
