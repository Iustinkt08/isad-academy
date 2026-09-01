import { getPayload } from 'payload'
import { cache } from 'react'

import config from '@payload-config'
import { formatPrice, lexicalToPlainText, excerpt } from '@/components/courses/helpers'
import type { Edition } from '@/components/courses/EnrolmentCard'
import type { Locale } from '@/lib/i18n'
import { isWindowActive } from '@/lib/pricing/windows'
import type { Course, CourseSession } from '@/payload-types'

/**
 * Data + formatting shared by the course detail PAGE and its PDF export route
 * (`/courses/[slug]/pdf`) — extracted from `[slug]/page.tsx` (2026-09-01) so the PDF can
 * never drift from what the page shows. Behaviour unchanged; read the notes below before
 * touching the query shape.
 */

/**
 * Course + editions + display config, deduped between generateMetadata and the page.
 * Every public query uses `overrideAccess: false` with no user, so draft courses are
 * invisible here exactly as on the public API — a draft slug 404s.
 */
export const getCourseData = cache(async (slug: string, locale: Locale) => {
  const payload = await getPayload({ config })

  const coursesResult = await payload.find({
    collection: 'courses',
    where: { slug: { equals: slug } },
    limit: 1,
    // depth 2 (was 1): populates `trainer` AND the trainer's `photo` media doc.
    depth: 2,
    overrideAccess: false,
    locale,
    fallbackLocale: 'en',
  })
  const course = coursesResult.docs[0]
  if (!course) return null

  // Owner 2026-08-13: the per-course override groups (certification card, bottom
  // callouts) must NOT inherit across locales — an override typed only in EN would
  // otherwise leak onto the RO page through the EN fallback above and replace the
  // Romanian default copy. Re-read just those groups with the fallback OFF, so an
  // empty locale falls back to its own dictionary default instead.
  const [overridesResult, sessionsResult, siteSettings] = await Promise.all([
    payload.find({
      collection: 'courses',
      where: { id: { equals: course.id } },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      locale,
      fallbackLocale: false,
      select: { certificationCard: true, callouts: true },
    }),
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

  const overrideGroups = overridesResult.docs[0]
  if (overrideGroups) {
    course.certificationCard = overrideGroups.certificationCard
    course.callouts = overrideGroups.callouts
  }

  return {
    course,
    sessions: sessionsResult.docs,
    siteSettings,
  }
})

/* ——— dot-date formatting (owner Figma: DD.MM.YYYY / DD.MM), UTC for determinism ——— */

const dotParts = (iso: string) => {
  const date = new Date(iso)
  return {
    dd: String(date.getUTCDate()).padStart(2, '0'),
    mm: String(date.getUTCMonth() + 1).padStart(2, '0'),
    yyyy: String(date.getUTCFullYear()),
  }
}
export const formatDotDate = (iso: string): string => {
  const { dd, mm, yyyy } = dotParts(iso)
  return `${dd}.${mm}.${yyyy}`
}
export const formatDotDayMonth = (iso: string): string => {
  const { dd, mm } = dotParts(iso)
  return `${dd}.${mm}`
}
export const weekdayFormat = (locale: Locale) =>
  new Intl.DateTimeFormat(locale === 'ro' ? 'ro-RO' : 'en-GB', {
    weekday: 'short',
    timeZone: 'UTC',
  })

/** "28.07 – 29.07.2026" from the schedule's first/last day, or the start date alone. */
export const editionDateRange = (session: CourseSession): string => {
  const days = (session.schedule ?? [])
    .map((row) => row.date)
    .filter((date): date is string => typeof date === 'string')
    .sort()
  const first = days[0]
  const last = days[days.length - 1]
  if (first && last && first !== last) return `${formatDotDayMonth(first)} - ${formatDotDate(last)}`
  return formatDotDate(first ?? session.startDate)
}

/**
 * §8 → EnrolmentCard view model: seatsLeft from the virtual `seatsRemaining`, sold-out from
 * the derived status, and the DATE-DRIVEN windows — `earlyBird` is present only while the EB
 * window is active right now (the price that would be charged); no active window at all makes
 * the edition non-purchasable ("Enrolment coming soon"). Display-only: checkout re-computes.
 */
export function buildEdition(
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

/** Teaser: shortDescription → SEO meta → truncated body (same chain as the catalog). */
export const courseTeaser = (course: Course): string => {
  const short = course.shortDescription?.trim()
  if (short) return short
  const meta = course.meta?.description?.trim()
  if (meta) return meta
  const plain = lexicalToPlainText(course.description)
  return plain ? excerpt(plain, 160) : ''
}
