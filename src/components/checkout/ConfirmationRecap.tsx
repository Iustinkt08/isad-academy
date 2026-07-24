'use client'

import { useEffect, useState } from 'react'

import type { CheckoutSuccessBody } from '@/lib/checkout'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { localePath, type Locale } from '@/lib/i18n/config'
import { NewsletterForm } from '../layout/NewsletterForm'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { GlassPanel } from '../ui/GlassPanel'
import { CONFIRMATION_STORAGE_KEY, formatDateLocale } from './constants'
import { PricingBreakdown } from './PricingBreakdown'

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
 * Confirmation recap (§6 Confirmare). `orders` has NO public read access (CLAUDE.md §4),
 * so there is nothing to re-fetch here by design: the checkout form stores the full
 * `POST /api/checkout` response in sessionStorage under `isad-checkout-confirmation`, and
 * this page renders THAT payload. A direct visit (or a lost/expired tab session) gets a
 * friendly "no recent order found" state instead.
 * Bilingual site (RO under /ro): all copy comes from the `checkout` dictionary section.
 */
export function ConfirmationRecap({
  locale,
  currency,
  vatDisplay,
}: {
  locale: Locale
  currency: string
  vatDisplay: 'incl' | 'excl'
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
      <p role="status" className="py-16 text-center text-body text-grey-500">
        {t.loadingOrder}
      </p>
    )
  }

  if (state === 'empty' || !order) {
    return (
      <div className="mx-auto max-w-xl py-8 text-center">
        <h1 className="text-h2 text-ink">{t.noOrderTitle}</h1>
        <p className="mt-3 text-body text-ink/70">{t.noOrderMessage}</p>
        <div className="mt-6">
          <Button href={localePath(locale, '/cursuri')}>{t.browseCourses}</Button>
        </div>
      </div>
    )
  }

  const startDateLabel = formatDateLocale(order.session.startDate, locale) ?? order.session.startDate
  const quantity = Math.max(order.participants.length, 1)

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <Badge variant="accent">{t.orderConfirmedBadge}</Badge>
        <h1 className="mt-4 text-h1 text-ink">{t.enrolledTitle}</h1>
        <p className="mt-3 text-body-lg text-ink/70">
          {t.editionStarting(order.session.courseTitle, startDateLabel)}
        </p>
      </div>

      <GlassPanel className="mt-8 p-6 sm:p-8" data-testid="order-recap">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-h4 text-ink">{t.orderSummary}</h2>
          <p className="text-sm text-grey-500">
            {t.orderReference} <span className="font-semibold text-ink">#{order.orderId}</span>
          </p>
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-grey-500">
            {t.participantHeading(quantity)}
          </h3>
          <ul className="mt-2 divide-y divide-ice/60">
            {order.participants.map((participant, index) => (
              <li key={index} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                <span className="font-medium text-ink">{participant.name}</span>
                <span className="text-grey-500">{participant.email}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 border-t border-ice/60 pt-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-grey-500">
            {t.pricingHeading}
          </h3>
          <PricingBreakdown
            locale={locale}
            pricing={order.pricing}
            quantity={quantity}
            currency={currency}
            vatDisplay={vatDisplay}
          />
        </div>

        <p className="mt-4 rounded-2xl bg-ice/30 px-5 py-4 text-sm text-ink">{t.meetInviteNote}</p>
      </GlassPanel>

      <div className="mt-10 rounded-3xl border border-ice/70 bg-paper p-6 sm:p-8">
        <h2 className="text-h4 text-ink">{t.stayInLoop}</h2>
        <p className="mb-4 mt-1 text-sm text-grey-500">{t.stayInLoopSub}</p>
        <NewsletterForm tone="light" locale={locale} />
      </div>

      <div className="mt-8 text-center">
        <Button href={localePath(locale, '/cursuri')} variant="secondary">
          {t.backToCourses}
        </Button>
      </div>
    </div>
  )
}
