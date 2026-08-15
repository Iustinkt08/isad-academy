import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@payload-config'
import { getVisitorCountry, resolveCurrency, windowForCurrency, type Currency } from '@/lib/currency'
import { computeOrderPricing } from '@/lib/pricing'
import CheckoutHeader from '@/components/checkout/CheckoutHeader'
import { CheckoutForm } from '@/components/checkout/CheckoutForm'
import { MAX_SEATS } from '@/components/checkout/constants'
import type { CheckoutSessionView, CheckoutSettingsView } from '@/components/checkout/types'
import { cpdCredits } from '@/components/courses/helpers'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { getDictionary, localePath, resolveLocale, type Locale } from '@/lib/i18n'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  return {
    title: getDictionary(locale).checkout.metaTitle,
    robots: { index: false },
  }
}

type SearchParams = Promise<{
  session?: string
  edition?: string
  quantity?: string
  qty?: string
}>

/** Friendly dead-end for a missing/invalid/past/sold-out edition — clear message, no form.
 * Style v3 (owner rule): BORDERLESS card lifted by drop shadow — mirrors the checkout cards. */
function CheckoutUnavailable({
  locale,
  title,
  message,
  courseHref,
}: {
  locale: Locale
  title: string
  message: string
  courseHref?: string
}) {
  const t = getDictionary(locale).checkout
  return (
    <main className="bg-surface-subtle">
      <Container className="animate-rise py-20 sm:py-28">
        <div className="mx-auto max-w-xl rounded-[24px] bg-white p-8 text-center shadow-[0_10px_40px_rgba(77,77,77,0.06),0_2px_8px_rgba(77,77,77,0.03)]">
          <h1 className="text-h2 text-ink">{title}</h1>
          <p className="mt-3 text-body text-grey-600">{message}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {courseHref && (
              <Button href={courseHref} variant="ghost">
                {t.viewCourse}
              </Button>
            )}
            <Button href={localePath(locale, '/courses')}>{t.browseCourses}</Button>
          </div>
        </div>
      </Container>
    </main>
  )
}

/**
 * `/checkout` — one edition per order (CLAUDE.md §3.2, no cart). Contract with T9's
 * EnrolForm: `/checkout?session=<id>&quantity=<n>`; `?edition=` / `?qty=` are accepted as
 * aliases (the owner's Figma extract used those names). The session + settings are fetched
 * server-side with `overrideAccess: false` (public access rules apply exactly as on the
 * REST API); only a display-safe slice is serialized to the client form. The initial
 * breakdown is computed here via `computeOrderPricing` (§8 — same engine the quote/submit
 * endpoints run); every later re-price comes from `POST /api/checkout/quote`.
 */
export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: SearchParams
}) {
  const locale = resolveLocale((await params).locale)
  const t = getDictionary(locale).checkout
  const search = await searchParams

  const sessionParam = search.session ?? search.edition ?? ''
  if (!/^\d+$/.test(sessionParam)) {
    return (
      <CheckoutUnavailable
        locale={locale}
        title={t.noEditionTitle}
        message={t.noEditionMessage}
      />
    )
  }
  const sessionId = Number(sessionParam)

  const quantityParsed = Number.parseInt(search.quantity ?? search.qty ?? '1', 10)
  const initialQuantity = Number.isFinite(quantityParsed)
    ? Math.min(MAX_SEATS, Math.max(1, quantityParsed))
    : 1

  const payload = await getPayload({ config })

  const [session, siteSettings] = await Promise.all([
    payload
      .findByID({
        collection: 'courseSessions',
        id: sessionId,
        depth: 1,
        overrideAccess: false,
        locale,
        fallbackLocale: 'en',
      })
      .catch(() => null),
    payload.findGlobal({
      slug: 'siteSettings',
      overrideAccess: false,
      locale,
      fallbackLocale: 'en',
    }),
  ])

  if (!session) {
    return (
      <CheckoutUnavailable
        locale={locale}
        title={t.editionNotFoundTitle}
        message={t.editionNotFoundMessage}
      />
    )
  }

  const course = session.course && typeof session.course === 'object' ? session.course : null
  const courseHref = course?.slug ? localePath(locale, `/courses/${course.slug}`) : undefined

  // Exhaustive status gate (T16): only an explicit 'upcoming' reaches the form. An
  // unknown/missing status (e.g. a future status value this page doesn't know about)
  // falls into `default` and renders the friendly dead-end — never a silently open form.
  switch (session.status) {
    case 'past':
      return (
        <CheckoutUnavailable
          locale={locale}
          title={t.pastEditionTitle}
          message={t.pastEditionMessage}
          courseHref={courseHref}
        />
      )
    case 'soldOut':
      return (
        <CheckoutUnavailable
          locale={locale}
          title={t.soldOutTitle}
          message={t.soldOutMessage}
          courseHref={courseHref}
        />
      )
    case 'noActiveWindow':
      return (
        <CheckoutUnavailable
          locale={locale}
          title={t.noWindowTitle}
          message={t.noWindowMessage}
          courseHref={courseHref}
        />
      )
    case 'upcoming':
      break // purchasable — render the checkout form below
    default:
      return (
        <CheckoutUnavailable
          locale={locale}
          title={t.unavailableTitle}
          message={t.unavailableMessage}
          courseHref={courseHref}
        />
      )
  }

  // B1 — visitor currency from geo, config fallback; windows resolved to that currency
  // BEFORE both the display slice and the SSR pricing (never bill/show the wrong currency).
  const currency = resolveCurrency(
    getVisitorCountry(await headers()),
    (siteSettings?.currency as Currency) ?? 'EUR',
  )
  const earlyBird = windowForCurrency(session.earlyBird, currency) ?? null
  const standard = windowForCurrency(session.standard, currency) ?? null

  // Initial breakdown — the SAME engine `POST /api/checkout/quote` and `processCheckout`
  // run (§8, stackingPolicy from siteSettings). No code / no membership at first paint.
  const initialPricingResult = computeOrderPricing({
    windows: { earlyBird, standard },
    quantity: initialQuantity,
    code: null,
    isMember: false,
    policy: siteSettings?.stackingPolicy ?? 'stackAll',
    // Member pricing retired (owner 2026-08-08) — discount codes are the only reductions.
    memberDiscountPercent: 0,
    now: new Date(),
  })

  // Locale-aware schedule chip, e.g. "2 days · 09:00–17:00" / "2 zile · 09:00–17:00".
  const scheduleRows = session.schedule ?? []
  const firstScheduleRow = scheduleRows[0]
  const scheduleLabel = firstScheduleRow
    ? `${t.dayCount(scheduleRows.length)} · ${firstScheduleRow.startTime}-${firstScheduleRow.endTime}`
    : null

  const sessionView: CheckoutSessionView = {
    id: session.id,
    courseTitle: course?.title ?? t.courseEditionFallback,
    courseSlug: course?.slug ?? null,
    startDate: session.startDate,
    scheduleSummary: scheduleLabel,
    trackLabel: course?.categoryKey === 'iso' ? 'PECB ISO/IEC 42001' : 'ISAD Academy',
    cpdCredits: course ? cpdCredits(course) : null,
    seatsRemaining: session.seatsRemaining ?? null,
    earlyBird,
    standard,
  }

  const settingsView: CheckoutSettingsView = {
    currency,
    vatDisplay: siteSettings?.vatDisplay ?? 'incl',
    stackingPolicy: siteSettings?.stackingPolicy ?? 'stackAll',
    seatsThreshold: siteSettings?.seatsThreshold ?? 5,
  }

  return (
    <main className="bg-surface-subtle pb-16 lg:pb-[100px]">
      <CheckoutHeader locale={locale} currentStep={1} />
      {/* Gutter mobil 20px (Figma 3977-251) — replică clasele Container cu px-5 pe <sm;
          desktop identic (max-w-6xl + lg:px-8 + lg:pt-12). */}
      <div className="mx-auto w-full max-w-6xl px-5 pt-6 sm:px-6 lg:px-8 lg:pt-12">
        <CheckoutForm
          locale={locale}
          session={sessionView}
          settings={settingsView}
          initialQuantity={initialQuantity}
          initialPricing={initialPricingResult.ok ? initialPricingResult.pricing : null}
        />
      </div>
    </main>
  )
}
