'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { computeOrderPricing, type PricingSnapshot } from '@/lib/pricing'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { localePath, type Locale } from '@/lib/i18n/config'
import { Reveal } from '../ui/Reveal'
import {
  BillingCard,
  DiscountCodeCard,
  EditionSummaryCard,
  ParticipantsCard,
} from './CheckoutCards'
import { CODE_INPUT_ID, CONFIRMATION_STORAGE_KEY, formatDateLocale, MAX_SEATS } from './constants'
import { checkoutSubmitError, codeDetailMessage, type ApiFailureBody } from './messages'
import OrderSummaryCard, { WhatHappensNext } from './OrderSummaryCard'
import type { CheckoutSessionView, CheckoutSettingsView } from './types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Participant = { name: string; email: string }

type QuoteOutcome =
  | { type: 'ok'; pricing: PricingSnapshot }
  | { type: 'codeError'; message: string }
  | { type: 'blocked'; message: string; soldOut: boolean }
  | { type: 'unavailable' }

type GeneralError = { message: string; soldOut?: boolean } | null

const emptyParticipants = (count: number): Participant[] =>
  Array.from({ length: count }, () => ({ name: '', email: '' }))

/**
 * Checkout form (T10, CLAUDE.md §6; visuals — owner Figma redesign, node 3790:4379):
 * single edition per order, dynamic buyer + participant fields, live server-authoritative
 * pricing via `POST /api/checkout/quote`, submit to T6's `POST /api/checkout`
 * (validate → `processCheckout` → MockProvider → atomic seat decrement on confirmed).
 * On success, the full checkout response is handed to `/checkout/confirmare` via
 * sessionStorage (orders have no public read — that response IS the recap).
 */
export function CheckoutForm({
  locale,
  session,
  settings,
  initialQuantity,
  initialPricing,
}: {
  locale: Locale
  session: CheckoutSessionView
  settings: CheckoutSettingsView
  initialQuantity: number
  /** SSR breakdown from `computeOrderPricing` (no code) — shown until the first quote lands. */
  initialPricing: PricingSnapshot | null
}) {
  const router = useRouter()
  const t = getDictionary(locale).checkout

  // ——— Order state ————————————————————————————————————————————————————————————————
  const [quantity, setQuantity] = useState(initialQuantity)
  const [participants, setParticipants] = useState<Participant[]>(() =>
    emptyParticipants(Math.max(initialQuantity, 1)),
  )
  /** Only meaningful at quantity 1: buyer is the participant unless they enrol someone else. */
  const [enrolSomeoneElse, setEnrolSomeoneElse] = useState(false)

  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [isCompany, setIsCompany] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [cui, setCui] = useState('')
  const [address, setAddress] = useState('')

  // ——— Discount code ————————————————————————————————————————————————————————————————
  const [codeInput, setCodeInput] = useState('')
  const [appliedCode, setAppliedCode] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [applyingCode, setApplyingCode] = useState(false)

  // ——— Quote (live breakdown) ————————————————————————————————————————————————————————
  const [pricing, setPricing] = useState<PricingSnapshot | null>(initialPricing)
  const [quoteUpdating, setQuoteUpdating] = useState(false)
  const [quoteFallback, setQuoteFallback] = useState(false)

  // ——— Submit ————————————————————————————————————————————————————————————————————————
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<GeneralError>(null)

  /** Monotonic sequence so a slow, stale quote response never overwrites a newer one. */
  const quoteSeq = useRef(0)

  /** Client-side estimate (WITHOUT code) — only used when the quote endpoint fails. */
  const clientFallbackPricing = useCallback(
    (qty: number): PricingSnapshot | null => {
      const result = computeOrderPricing({
        windows: { earlyBird: session.earlyBird, standard: session.standard },
        quantity: qty,
        code: null,
        isMember: false,
        policy: settings.stackingPolicy,
        memberDiscountPercent: 0,
        now: new Date(),
      })
      return result.ok ? result.pricing : null
    },
    [session.earlyBird, session.standard, settings.stackingPolicy],
  )

  const fetchQuote = useCallback(
    async (qty: number, code: string | null): Promise<QuoteOutcome> => {
      try {
        const response = await fetch('/api/checkout/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.id, quantity: qty, ...(code ? { code } : {}) }),
        })
        const data = (await response.json().catch(() => null)) as
          | ({ pricing?: PricingSnapshot } & ApiFailureBody)
          | null

        if (response.ok && data?.pricing) {
          return { type: 'ok', pricing: data.pricing }
        }
        if (response.status === 400 && data?.detail) {
          return { type: 'codeError', message: codeDetailMessage(data.detail, locale) }
        }
        if (response.status === 404 || response.status === 409) {
          return {
            type: 'blocked',
            message: data?.error ?? t.editionUnavailable,
            soldOut: Boolean(data?.soldOut),
          }
        }
        return { type: 'unavailable' }
      } catch {
        return { type: 'unavailable' }
      }
    },
    [session.id, locale, t.editionUnavailable],
  )

  /**
   * Live re-quote: on load, on quantity change and whenever the applied code changes —
   * debounced so stepper mashing coalesces into one request.
   */
  useEffect(() => {
    const seq = ++quoteSeq.current
    setQuoteUpdating(true)

    const timer = setTimeout(async () => {
      const outcome = await fetchQuote(quantity, appliedCode)
      if (seq !== quoteSeq.current) return // a newer request superseded this one

      setQuoteUpdating(false)
      if (outcome.type === 'ok') {
        setPricing(outcome.pricing)
        setQuoteFallback(false)
      } else if (outcome.type === 'codeError') {
        // The previously-applied code became invalid (e.g. usage limit reached since).
        setCodeError(outcome.message)
        setAppliedCode(null) // effect re-runs and re-quotes without the code
      } else if (outcome.type === 'blocked') {
        setGeneralError({ message: outcome.message, soldOut: outcome.soldOut })
        setPricing(null)
        setQuoteFallback(false)
      } else {
        setPricing(clientFallbackPricing(quantity))
        setQuoteFallback(true)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [quantity, appliedCode, fetchQuote, clientFallbackPricing])

  const handleQuantityChange = (next: number) => {
    const clamped = Math.min(MAX_SEATS, Math.max(1, next))
    setQuantity(clamped)
    setParticipants((prev) =>
      prev.length >= clamped ? prev : [...prev, ...emptyParticipants(clamped - prev.length)],
    )
  }

  const handleApplyCode = async () => {
    const candidate = codeInput.trim()
    if (!candidate) {
      setCodeError(t.enterCodeFirst)
      return
    }
    setApplyingCode(true)
    setCodeError(null)
    const seq = ++quoteSeq.current
    const outcome = await fetchQuote(quantity, candidate)
    if (seq !== quoteSeq.current) return
    setApplyingCode(false)
    setQuoteUpdating(false)

    if (outcome.type === 'ok') {
      setAppliedCode(candidate)
      setCodeInput('')
      setPricing(outcome.pricing)
      setQuoteFallback(false)
    } else if (outcome.type === 'codeError') {
      setCodeError(outcome.message)
    } else if (outcome.type === 'blocked') {
      setGeneralError({ message: outcome.message, soldOut: outcome.soldOut })
    } else {
      setCodeError(t.codeCheckFailed)
    }
  }

  const handleRemoveCode = () => {
    setAppliedCode(null) // the quote effect re-prices without the code
    setCodeInput('')
    setCodeError(null)
  }

  /** How many participant field-pairs are on screen (0 = buyer is the sole participant). */
  const participantCount = quantity === 1 ? (enrolSomeoneElse ? 1 : 0) : quantity

  const validate = (): { errors: Record<string, string>; firstId: string | null } => {
    const errors: Record<string, string> = {}
    const order: string[] = []
    const add = (id: string, message: string) => {
      errors[id] = message
      order.push(id)
    }

    if (!buyerName.trim()) add('checkout-buyer-name', t.errorEnterName)
    if (!EMAIL_RE.test(buyerEmail.trim())) add('checkout-buyer-email', t.errorEnterValidEmail)
    if (isCompany) {
      if (!companyName.trim()) add('checkout-company-name', t.errorEnterCompanyName)
      if (!cui.trim()) add('checkout-company-cui', t.errorEnterCui)
      if (!address.trim()) add('checkout-company-address', t.errorEnterCompanyAddress)
    }
    for (let i = 0; i < participantCount; i += 1) {
      const participant = participants[i] ?? { name: '', email: '' }
      if (!participant.name.trim())
        add(`checkout-participant-${i}-name`, t.errorEnterParticipantName)
      if (!EMAIL_RE.test(participant.email.trim()))
        add(`checkout-participant-${i}-email`, t.errorEnterValidEmail)
    }

    return { errors, firstId: order[0] ?? null }
  }

  const focusElement = (id: string) => {
    requestAnimationFrame(() => document.getElementById(id)?.focus())
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    setGeneralError(null)
    const { errors, firstId } = validate()
    setFieldErrors(errors)
    if (firstId) {
      focusElement(firstId)
      return
    }

    setSubmitting(true)
    try {
      const body = {
        sessionId: session.id,
        quantity,
        buyer: {
          name: buyerName.trim(),
          email: buyerEmail.trim(),
          ...(buyerPhone.trim() ? { phone: buyerPhone.trim() } : {}),
          isCompany,
          ...(isCompany
            ? { companyName: companyName.trim(), cui: cui.trim(), address: address.trim() }
            : {}),
        },
        // At quantity 1 with "buyer is the participant", omit participants entirely — the
        // server auto-fills the sole participant from the buyer (validateCheckoutInput).
        ...(participantCount > 0
          ? {
              participants: participants
                .slice(0, participantCount)
                .map((participant) => ({
                  name: participant.name.trim(),
                  email: participant.email.trim(),
                })),
            }
          : {}),
        ...(appliedCode ? { code: appliedCode } : {}),
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = (await response.json().catch(() => null)) as
        | (Record<string, unknown> & ApiFailureBody)
        | null

      if (response.ok && data && typeof data.orderId === 'number') {
        try {
          sessionStorage.setItem(CONFIRMATION_STORAGE_KEY, JSON.stringify(data))
        } catch {
          // Storage unavailable (rare) — still navigate; the confirmation page degrades
          // to its "no recent order found" state rather than blocking the enrolment.
        }
        router.push(localePath(locale, '/checkout/confirmare'))
        return // keep `submitting` true while navigating
      }

      const failure = checkoutSubmitError(response.status, data, locale)
      if (failure.kind === 'code') {
        setCodeError(failure.message)
        setAppliedCode(null) // re-quote without the rejected code
        focusElement(CODE_INPUT_ID)
      } else if (failure.kind === 'soldOut') {
        setGeneralError({ message: failure.message, soldOut: true })
        focusElement('checkout-error-panel')
      } else {
        setGeneralError({ message: failure.message })
        focusElement('checkout-error-panel')
      }
      setSubmitting(false)
    } catch {
      setGeneralError({ message: t.errorGeneric })
      focusElement('checkout-error-panel')
      setSubmitting(false)
    }
  }

  const coursePath = localePath(
    locale,
    session.courseSlug ? `/cursuri/${session.courseSlug}` : '/cursuri',
  )
  const soldOutNow = Boolean(generalError?.soldOut)

  // ——— Display derivations (labels only — every number comes from the engine) ————————————
  // Redesign 3790:4379 simplified the Edition card to the start-date chip alone (the
  // window/schedule/CPD chips and the applied-window pill were dropped by the owner).
  const startDateLabel = formatDateLocale(session.startDate, locale)

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      data-testid="checkout-form"
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-11"
    >
      {/* ——— Form column ——— */}
      <div className="flex min-w-0 flex-col gap-6">
        <Reveal>
          <EditionSummaryCard
            locale={locale}
            course={session.courseTitle}
            track={session.trackLabel}
            startDateLabel={startDateLabel}
            seatsLeft={session.seatsRemaining}
            seatsThreshold={settings.seatsThreshold}
            courseHref={coursePath}
          />
        </Reveal>
        <Reveal>
          <ParticipantsCard
            locale={locale}
            quantity={quantity}
            onQuantityChange={handleQuantityChange}
            participants={participants}
            participantCount={participantCount}
            onParticipantChange={(index, field, value) =>
              setParticipants((prev) =>
                prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)),
              )
            }
            enrolSomeoneElse={enrolSomeoneElse}
            onEnrolSomeoneElseChange={setEnrolSomeoneElse}
            fieldErrors={fieldErrors}
          />
        </Reveal>
        <Reveal>
          <BillingCard
            locale={locale}
            isCompany={isCompany}
            onTypeChange={setIsCompany}
            buyerName={buyerName}
            onBuyerNameChange={setBuyerName}
            buyerEmail={buyerEmail}
            onBuyerEmailChange={setBuyerEmail}
            buyerPhone={buyerPhone}
            onBuyerPhoneChange={setBuyerPhone}
            companyName={companyName}
            onCompanyNameChange={setCompanyName}
            cui={cui}
            onCuiChange={setCui}
            address={address}
            onAddressChange={setAddress}
            fieldErrors={fieldErrors}
          />
        </Reveal>
        <Reveal>
          <DiscountCodeCard
            locale={locale}
            codeInput={codeInput}
            onCodeInputChange={(value) => {
              setCodeInput(value)
              if (codeError) setCodeError(null)
            }}
            onApply={handleApplyCode}
            applying={applyingCode}
            appliedCode={appliedCode}
            codeError={codeError}
            onRemoveCode={handleRemoveCode}
            showStackNote={settings.stackingPolicy === 'stackAll'}
          />
        </Reveal>
      </div>

      {/* ——— Summary column (sticky) ——— */}
      <aside className="flex w-full flex-col gap-6 self-start lg:sticky lg:top-24">
        <Reveal>
          <OrderSummaryCard
            locale={locale}
            course={session.courseTitle}
            editionLabel={startDateLabel ? t.editionLine(startDateLabel) : t.liveOnMeet}
            pricing={pricing}
            quantity={quantity}
            currency={settings.currency}
            vatDisplay={settings.vatDisplay}
            updating={quoteUpdating || applyingCode}
            fallback={quoteFallback}
            codeLabel={appliedCode}
            onRemoveCode={appliedCode ? handleRemoveCode : undefined}
            generalError={generalError?.message ?? null}
            soldOut={soldOutNow}
            courseHref={coursePath}
            submitting={submitting}
          />
        </Reveal>
        <Reveal>
          <WhatHappensNext locale={locale} />
        </Reveal>
      </aside>
    </form>
  )
}
