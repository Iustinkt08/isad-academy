import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { cache } from 'react'

import config from '@payload-config'
import {
  asMedia,
  cpdCredits,
  excerpt,
  formatPrice,
  isPastSession,
  lexicalToPlainText,
} from '@/components/courses/helpers'
import CourseCallout from '@/components/cursuri/CourseCallout'
import {
  CourseAbout,
  CourseAudience,
  CourseCertification,
  CourseProgramme,
  type ProgrammeDay,
} from '@/components/cursuri/CourseContent'
import CourseHeader from '@/components/cursuri/CourseHeader'
import EnrolmentCard, { ExpertMiniCard, type Edition } from '@/components/cursuri/EnrolmentCard'
import { NewsletterForm } from '@/components/layout/NewsletterForm'
import { JsonLd } from '@/components/seo/JsonLd'
import { Container } from '@/components/ui/Container'
import { Reveal } from '@/components/ui/Reveal'
import { getVisitorCountry, resolveCurrency, resolveSessionForCurrency, type Currency } from '@/lib/currency'
import { getDictionary, localePath, resolveLocale, type Locale } from '@/lib/i18n'
import { isWindowActive } from '@/lib/pricing/windows'
import { DEFAULT_OG_IMAGE, SITE_NAME, getSiteUrl } from '@/lib/seo/site'
import type { Course, CourseSession } from '@/payload-types'

/**
 * Course + editions + display config, deduped between generateMetadata and the page.
 * Every public query uses `overrideAccess: false` with no user, so draft courses are
 * invisible here exactly as on the public API — a draft slug 404s.
 */
const getCourseData = cache(async (slug: string, locale: Locale) => {
  const payload = await getPayload({ config })

  const coursesResult = await payload.find({
    collection: 'courses',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
    overrideAccess: false,
    locale,
    fallbackLocale: 'en',
  })
  const course = coursesResult.docs[0]
  if (!course) return null

  const [sessionsResult, siteSettings] = await Promise.all([
    payload.find({
      collection: 'courseSessions',
      where: { course: { equals: course.id } },
      sort: 'startDate',
      pagination: false,
      depth: 0,
      overrideAccess: false,
      locale,
      fallbackLocale: 'en',
    }),
    payload.findGlobal({
      slug: 'siteSettings',
      overrideAccess: false,
      locale,
      fallbackLocale: 'en',
    }),
  ])

  return {
    course,
    sessions: sessionsResult.docs,
    siteSettings,
  }
})

type Args = { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { locale: localeParam, slug } = await params
  const locale = resolveLocale(localeParam)
  const dict = getDictionary(locale)
  const data = await getCourseData(slug, locale)
  if (!data) return { title: dict.courseDetail.metaNotFound }

  const { course } = data
  const coursePath = localePath(locale, `/cursuri/${course.slug}`)

  // plugin-seo `meta.*` first (T14 — docs/PLAN.md locked decision), content fallbacks after.
  // An editor-set meta.title is used verbatim (absolute), otherwise the root layout's
  // `%s | isad.academy` template brands the plain course title.
  const metaTitle = course.meta?.title?.trim()
  const description =
    course.meta?.description?.trim() ||
    excerpt(lexicalToPlainText(course.description)) ||
    dict.courseDetail.metaFallbackDescription
  // OG image chain: meta.image → course banner → site default (resolved via metadataBase).
  const ogImage = asMedia(course.meta?.image)?.url || asMedia(course.image)?.url || DEFAULT_OG_IMAGE

  return {
    title: metaTitle ? { absolute: metaTitle } : course.title,
    description,
    alternates: { canonical: coursePath },
    openGraph: {
      title: metaTitle || `${course.title} | ${SITE_NAME}`,
      description,
      url: coursePath,
      siteName: SITE_NAME,
      type: 'website',
      images: [{ url: ogImage }],
    },
  }
}

/**
 * Schema.org Course + hasCourseInstance (T14, CLAUDE.md §7). Factual claims only:
 * provider = isad.academy, NO accreditation claims (§9 R2). One CourseInstance per
 * upcoming edition; `offers` only when a price window is active right now (§8 —
 * otherwise the edition is not purchasable and advertising a price would be wrong).
 */
function buildCourseJsonLd(
  course: Course,
  upcomingSessions: CourseSession[],
  currency: string,
  now: Date,
  locale: Locale,
): Record<string, unknown> {
  const siteUrl = getSiteUrl()
  const courseUrl = `${siteUrl}${localePath(locale, `/cursuri/${course.slug}`)}`
  const description = excerpt(lexicalToPlainText(course.description))
  const image = asMedia(course.meta?.image)?.url || asMedia(course.image)?.url

  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    url: courseUrl,
    ...(description ? { description } : {}),
    ...(image ? { image: `${siteUrl}${image}` } : {}),
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: siteUrl,
    },
    hasCourseInstance: upcomingSessions.map((session) => {
      const activeWindow = isWindowActive(session.earlyBird, now)
        ? session.earlyBird
        : isWindowActive(session.standard, now)
          ? session.standard
          : null
      const scheduleDates = (session.schedule ?? [])
        .map((row) => row.date)
        .filter((date): date is string => typeof date === 'string')
        .sort()
      const endDate = scheduleDates[scheduleDates.length - 1]

      return {
        '@type': 'CourseInstance',
        courseMode: 'Online',
        startDate: session.startDate,
        ...(endDate ? { endDate } : {}),
        ...(activeWindow?.price != null
          ? {
              offers: {
                '@type': 'Offer',
                price: activeWindow.price,
                priceCurrency: currency,
                availability:
                  session.status === 'soldOut'
                    ? 'https://schema.org/SoldOut'
                    : 'https://schema.org/InStock',
                url: courseUrl,
                ...(activeWindow.endDate ? { priceValidUntil: activeWindow.endDate } : {}),
              },
            }
          : {}),
      }
    }),
  }
}

/* ——— dot-date formatting (owner Figma: DD.MM.YYYY / DD.MM), UTC for determinism ——— */

const dotParts = (iso: string) => {
  const date = new Date(iso)
  return {
    dd: String(date.getUTCDate()).padStart(2, '0'),
    mm: String(date.getUTCMonth() + 1).padStart(2, '0'),
    yyyy: String(date.getUTCFullYear()),
  }
}
const formatDotDate = (iso: string): string => {
  const { dd, mm, yyyy } = dotParts(iso)
  return `${dd}.${mm}.${yyyy}`
}
const formatDotDayMonth = (iso: string): string => {
  const { dd, mm } = dotParts(iso)
  return `${dd}.${mm}`
}
const weekdayFormat = (locale: Locale) =>
  new Intl.DateTimeFormat(locale === 'ro' ? 'ro-RO' : 'en-GB', {
    weekday: 'short',
    timeZone: 'UTC',
  })

/** "28.07 – 29.07.2026" from the schedule's first/last day, or the start date alone. */
const editionDateRange = (session: CourseSession): string => {
  const days = (session.schedule ?? [])
    .map((row) => row.date)
    .filter((date): date is string => typeof date === 'string')
    .sort()
  const first = days[0]
  const last = days[days.length - 1]
  if (first && last && first !== last) return `${formatDotDayMonth(first)} – ${formatDotDate(last)}`
  return formatDotDate(first ?? session.startDate)
}

/**
 * §8 → EnrolmentCard view model: seatsLeft from the virtual `seatsRemaining`, sold-out from
 * the derived status, and the DATE-DRIVEN windows — `earlyBird` is present only while the EB
 * window is active right now (the price that would be charged); no active window at all makes
 * the edition non-purchasable ("Enrolment coming soon"). Display-only: checkout re-computes.
 */
function buildEdition(
  session: CourseSession,
  now: Date,
  currency: string,
  seatsThreshold: number,
  locale: Locale,
): Edition {
  const ebActive = isWindowActive(session.earlyBird, now)
  const stdActive = isWindowActive(session.standard, now)
  const seatsLeft = session.seatsRemaining ?? Math.max(0, (session.capacity ?? 0) - (session.seatsSold ?? 0))
  const standardFrom =
    session.standard?.startDate && new Date(session.standard.startDate) > now
      ? formatDotDate(session.standard.startDate)
      : null

  return {
    id: session.id,
    dateRange: editionDateRange(session),
    seatsLeft,
    seatsThreshold,
    soldOut: session.status === 'soldOut' || seatsLeft <= 0,
    hasActiveWindow: ebActive || stdActive,
    earlyBird:
      ebActive && session.earlyBird?.price != null && session.earlyBird.endDate
        ? {
            price: formatPrice(session.earlyBird.price, currency, locale),
            until: formatDotDate(session.earlyBird.endDate),
          }
        : null,
    standard:
      session.standard?.price != null
        ? { price: formatPrice(session.standard.price, currency, locale), from: standardFrom }
        : null,
  }
}

/** Top-level Lexical paragraphs → plain-text strings (About card, §6). */
const descriptionParagraphs = (description: Course['description']): string[] => {
  const children = (description as { root?: { children?: unknown[] } } | null | undefined)?.root
    ?.children
  if (!Array.isArray(children)) return []
  return children
    .map((child) => lexicalToPlainText({ root: { children: [child] } }))
    .filter((p) => p.length > 0)
}

/** Teaser: shortDescription → SEO meta → truncated body (same chain as the catalog). */
const courseTeaser = (course: Course): string => {
  const short = course.shortDescription?.trim()
  if (short) return short
  const meta = course.meta?.description?.trim()
  if (meta) return meta
  const plain = lexicalToPlainText(course.description)
  return plain ? excerpt(plain, 160) : ''
}

/**
 * /cursuri/[slug] — owner Figma redesign (node 3790:4223):
 * CourseHeader (simplified — no meta chips, no Share) → two columns (content flex-1
 * basis-600 + aside 456 sticky) → CourseCallout, on surface-subtle. Programme shows the
 * EARLIEST upcoming edition's schedule (server-rendered — the client edition selection
 * stays inside EnrolmentCard). NO reviews, NO modules, NO related courses (§6).
 */
export default async function CourseDetailPage({ params }: Args) {
  const { locale: localeParam, slug } = await params
  const locale = resolveLocale(localeParam)
  const dict = getDictionary(locale)
  const t = dict.courseDetail
  const data = await getCourseData(slug, locale)
  if (!data) notFound()

  const { course, sessions, siteSettings } = data
  const now = new Date()

  // Config-driven display decisions (§13 — never hardcoded)
  const seatsThreshold = siteSettings?.seatsThreshold ?? 5
  // B1 — geo-resolved visitor currency (RON for RO, else EUR); config fallback without geo
  const country = getVisitorCountry(await headers())
  const currency = resolveCurrency(country, (siteSettings?.currency as Currency) ?? 'EUR')

  const sessionsForVisitor = sessions.map((session) => resolveSessionForCurrency(session, currency))
  const upcomingSessions = sessionsForVisitor.filter((session) => !isPastSession(session))
  const editions = upcomingSessions.map((session) =>
    buildEdition(session, now, currency, seatsThreshold, locale),
  )
  const nextSession = upcomingSessions[0] ?? null
  const credits = cpdCredits(course)
  const isPecbTrack = course.category === 'iso'

  /* ——— Header data (redesign: no meta chips, no Share) ——— */
  const titleWords = course.title.trim().replace(/\.$/, '').split(/\s+/)
  const titleGradient = titleWords[titleWords.length - 1] ?? ''
  const titlePlain = titleWords.length > 1 ? `${titleWords.slice(0, -1).join(' ')} ` : ''

  /* ——— Programme (earliest upcoming edition, server-rendered — §6, keep it simple) ——— */
  type ScheduleRow = NonNullable<CourseSession['schedule']>[number]
  const programmeRows = (nextSession?.schedule ?? []).filter(
    (row): row is ScheduleRow & { date: string } => typeof row.date === 'string',
  )
  const weekday = weekdayFormat(locale)
  const programmeDays: ProgrammeDay[] = programmeRows.map((row, index) => ({
    day: t.dayN(index + 1),
    date: `${weekday.format(new Date(row.date))} ${formatDotDayMonth(row.date)}`,
    topic: t.liveSession(row.startTime, row.endTime),
  }))
  const programmeHoursLabel = programmeRows[0]
    ? `${programmeRows[0].startTime}–${programmeRows[0].endTime}${programmeRows.length > 1 ? ` · ${t.daily}` : ''}`
    : ''

  return (
    <div className="bg-surface-subtle">
      <JsonLd data={buildCourseJsonLd(course, upcomingSessions, currency, now, locale)} />

      <Reveal>
        <CourseHeader
          data={{
            // Back la catalog (owner 2026-07-26) — a înlocuit breadcrumb-ul
            backLabel: t.backToCourses,
            backHref: localePath(locale, '/cursuri'),
            pillLabel: isPecbTrack ? t.pillPecb : t.pillOwn,
            titlePlain,
            titleGradient,
            teaser: courseTeaser(course),
          }}
        />
      </Reveal>

      {/* gap-8: 600 (content basis) + 456 (aside) + 32 = 1088 = the Container's inner width
          at lg (max-w-6xl − px-8) — the extract's gap-11 would wrap the aside below. */}
      {/* Mobil (<lg): coloana de înscriere PRIMA (order-1), apoi conținutul — un singur DOM,
          ordinea prin clase (Figma 3925-115). Desktop: neschimbat, aside sticky în dreapta. */}
      {/* px-5: marginile de 20 ale designului mobil (390 → conținut 350; -mx-5 = full-bleed) */}
      <Container className="flex w-full flex-col gap-5 px-5 pb-[60px] sm:px-5 lg:flex-row lg:flex-wrap lg:gap-8 lg:px-8">
        {/* Content column */}
        <div className="order-2 flex min-w-0 flex-col gap-5 lg:order-1 lg:min-w-[300px] lg:flex-1 lg:basis-[600px] lg:gap-6">
          <Reveal>
            <CourseAbout locale={locale} paragraphs={descriptionParagraphs(course.description)} />
          </Reveal>
          <Reveal>
            <CourseAudience
              locale={locale}
              audience={(course.audience ?? [])
                .map((item) => item.text?.trim() ?? '')
                .filter((text) => text.length > 0)}
            />
          </Reveal>
          {nextSession && programmeDays.length > 0 && (
            <Reveal>
              <CourseProgramme
                locale={locale}
                editionLabel={formatDotDate(nextSession.startDate)}
                hoursLabel={programmeHoursLabel}
                days={programmeDays}
              />
            </Reveal>
          )}
          <Reveal>
            <CourseCertification
              locale={locale}
              hours={course.durationHours ?? null}
              cpdCredits={credits}
              track={isPecbTrack ? 'pecb' : 'own'}
            />
          </Reveal>
        </div>

        {/* Enrolment column — sticky */}
        <aside className="order-1 flex w-full flex-col gap-5 self-start lg:order-2 lg:sticky lg:top-24 lg:w-[456px] lg:gap-6">
          <Reveal className="flex flex-col gap-5 lg:gap-6">
            {editions.length > 0 ? (
              <EnrolmentCard locale={locale} editions={editions} />
            ) : (
              /* No upcoming editions at all (§6) → coming soon + newsletter */
              <div className="flex w-full flex-col gap-3 rounded-[24px] border-[6px] border-line-soft bg-white px-6 py-8 shadow-[3px_9px_24px_rgba(77,77,77,0.05)] sm:px-9">
                <h2 className="text-[20px] font-medium tracking-[-0.8px] text-ink">
                  {t.comingSoonTitle}
                </h2>
                <p className="text-[13.5px] leading-[21px] text-grey-600">{t.comingSoonBody}</p>
                <NewsletterForm tone="light" locale={locale} />
              </div>
            )}
            <ExpertMiniCard locale={locale} />
          </Reveal>
        </aside>
      </Container>

      <Reveal>
        <CourseCallout locale={locale} />
      </Reveal>
    </div>
  )
}
