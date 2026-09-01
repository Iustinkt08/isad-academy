'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import type { CheckoutSuccessBody } from '@/lib/checkout'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { localePath, type Locale } from '@/lib/i18n/config'
import { formatPrice } from '../courses/helpers'
import { Button } from '../ui/Button'
import {
  ConfirmationHeader,
  ConfirmationStepper,
  OrderRecapCard,
  SuccessMark,
  type RecapRow,
} from './Confirmation'
import { AddToCalendar } from './AddToCalendar'
import { CONFIRMATION_STORAGE_KEY, formatDateLocale } from './constants'
import { WhatHappensNext } from './OrderSummaryCard'

/** The stored `POST /api/checkout` 200 response — the server's own `CheckoutSuccessBody`
 * (type-only import, T16 — no ad-hoc mirror that could drift from the API contract). */
type StoredConfirmation = CheckoutSuccessBody

/** Defensive parse — sessionStorage content is client-writable, so never trust its shape. */
const parseStored = (raw: string | null): StoredConfirmation | null => {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as Partial<StoredConfirmation> | null
    if (
      data &&
      typeof data.orderId === 'number' &&
      data.pricing &&
      typeof data.pricing.total === 'number' &&
      data.session &&
      typeof data.session.courseTitle === 'string' &&
      Array.isArray(data.participants)
    ) {
      return data as StoredConfirmation
    }
  } catch {
    // fall through to null
  }
  return null
}

/**
 * Confirmation page content (Figma 4031-156 desktop / 4031-218 mobile — „Enrolment
 * confirmed."): stepper (1–2 checked, 3 active) → success mark with the SPINNING gradient
 * ring → title/subtitle → order recap card → What happens next → CTAs.
 *
 * `orders` has NO public read access (CLAUDE.md §4), so there is nothing to re-fetch here
 * by design: the checkout form stores the full `POST /api/checkout` response in
 * sessionStorage and this page renders THAT payload. A direct visit (or a lost/expired tab
 * session) gets a friendly "no recent order found" state instead.
 *
 * `outcome` (from /api/netopia/return) selects the pending/failed variants for
 * hosted-page payments; the mock flow lands here already confirmed (no outcome param).
 * Bilingual site (RO under /ro): all copy comes from the `checkout` dictionary section.
 */
export function ConfirmationRecap({
  locale,
  currency,
  outcome,
}: {
  locale: Locale
  /** Fallback display currency (siteSettings) — the order's own `currency` wins. */
  currency: string
  /** Hosted-payment return hint from /api/netopia/return (`?outcome=`). Undefined for the
   * synchronous (mock) flow, which lands here already confirmed. */
  outcome?: 'paid' | 'pending' | 'failed'
}) {
  const t = getDictionary(locale).checkout
  const [state, setState] = useState<'loading' | 'empty' | 'ready'>('loading')
  const [order, setOrder] = useState<StoredConfirmation | null>(null)

  useEffect(() => {
    let stored: StoredConfirmation | null = null
    try {
      stored = parseStored(sessionStorage.getItem(CONFIRMATION_STORAGE_KEY))
    } catch {
      stored = null // storage unavailable (private mode etc.)
    }
    if (stored) {
      setOrder(stored)
      setState('ready')
    } else {
      setState('empty')
    }
  }, [])

  if (state === 'loading') {
    return (
      <p role="status" className="py-24 text-center text-body text-grey-500">
        {t.loadingOrder}
      </p>
    )
  }

  if (state === 'empty' || !order) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-h2 text-ink">{t.noOrderTitle}</h1>
        <p className="mt-3 text-body text-ink/70">{t.noOrderMessage}</p>
        <div className="mt-6">
          <Button href={localePath(locale, '/courses')}>{t.browseCourses}</Button>
        </div>
      </div>
    )
  }

  // A cancelled/declined hosted payment: no seats were taken, nothing to recap — offer
  // the way back instead of an "enrolled" screen that would be a lie.
  if (outcome === 'failed') {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-h2 text-ink">{t.paymentFailedTitle}</h1>
        <p className="mt-3 text-body text-ink/70">{t.paymentFailedMessage}</p>
        <div className="mt-6">
          <Button href={localePath(locale, '/courses')}>{t.browseCourses}</Button>
        </div>
      </div>
    )
  }

  // "Processing": back from the payment page before the confirmation (IPN/status poll)
  // landed — or navigated here directly mid-redirect.
  const isPending = outcome === 'pending' || (outcome === undefined && order.status === 'requiresAction')

  const startDateLabel = formatDateLocale(order.session.startDate, locale) ?? order.session.startDate
  const quantity = Math.max(order.participants.length, 1)
  // The currency the order was actually charged in (B1) — the settings prop is only the
  // fallback for payloads stored before `currency` existed on the response.
  const orderCurrency = order.currency ?? currency
  const buyerEmail = order.buyerEmail ?? order.participants[0]?.email ?? t.inboxFallback

  const recapRows: RecapRow[] = [
    { label: t.editionRowLabel, value: t.editionStartValue(startDateLabel) },
    { label: t.seatsRowLabel, value: `${quantity} × ${t.windowNames[order.pricing.appliedWindow]}` },
    { label: t.paymentRowLabel, value: isPending ? t.paymentProcessingValue : t.paymentPaidValue },
  ]

  const nextSteps = [
    isPending ? t.nextPendingEmail : t.nextConfirmEmail,
    t.nextConfirmInvoice,
    t.nextConfirmMeet,
  ]

  return (
    <div className="flex flex-col items-center gap-6 px-5 pb-16 pt-12 lg:gap-7 lg:px-4 lg:pb-[120px] lg:pt-[130px]">
      <ConfirmationStepper steps={[t.stepDetails, t.stepPayment, t.stepConfirmation]} />

      {!isPending && <SuccessMark ariaLabel={t.successMarkAria} />}

      <ConfirmationHeader
        title={isPending ? t.paymentPendingTitle : t.confirmedTitle}
        titleAccent={isPending ? undefined : t.confirmedTitleAccent}
        subtitle={isPending ? t.paymentPendingNote : t.confirmedSubtitle(buyerEmail)}
      />

      <OrderRecapCard
        orderRef={t.orderRefLabel(order.orderId)}
        course={order.session.courseTitle}
        provider={t.academyName}
        rows={recapRows}
        totalLabel={t.totalPaid}
        total={formatPrice(order.pricing.total, orderCurrency, locale)}
      />

      <div className="w-full max-w-[min(350px,calc(100vw_-_40px))] lg:max-w-[560px]">
        <WhatHappensNext locale={locale} steps={nextSteps} />
      </div>

      {/* Add-to-calendar (owner 2026-09-01) — only once the payment is confirmed, and
          only for LIVE editions; self-study courses keep the plain confirmation. */}
      {!isPending && order.session.selfStudy !== true && (
        <AddToCalendar
          locale={locale}
          orderId={order.orderId}
          courseTitle={order.session.courseTitle}
          startDate={order.session.startDate}
          schedule={order.session.schedule}
        />
      )}

      {/* Mobil: buton full-width + link dedesubt; desktop: pe un rând */}
      <div className="flex w-full max-w-[min(350px,calc(100vw_-_40px))] flex-col items-center gap-6 lg:w-auto lg:max-w-none lg:flex-row lg:gap-4">
        <Link
          href={localePath(locale, '/')}
          className="w-full rounded-[999px] bg-gradient-to-b from-[#407ea2] to-[#1c5d99] to-[80%] pb-[13px] pt-3 text-center text-[16px] font-medium text-white shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-transform hover:scale-[1.02] lg:w-auto lg:px-[22px] lg:pb-3 lg:pt-[11px]"
        >
          {t.backToHomepage}
        </Link>
        <Link
          href={localePath(locale, '/contact')}
          className="text-[13.5px] font-medium text-[#1c5d99] transition-colors hover:text-[#407ea2] lg:text-[15px]"
        >
          {t.contactUs}
        </Link>
      </div>
    </div>
  )
}
