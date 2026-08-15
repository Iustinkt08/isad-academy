import type { Metadata } from 'next'
import { getPayload } from 'payload'

import config from '@payload-config'
import {
  earliestUpcomingStart,
  excerpt,
  isPastSession,
  lexicalToPlainText,
} from '@/components/courses/helpers'
import CatalogGrid from '@/components/courses/CatalogGrid'
import CatalogHeader from '@/components/courses/CatalogHeader'
import { Reveal } from '@/components/ui/Reveal'
import type { CatalogCourse } from '@/components/courses/CourseCard'
import PastEditions, { type PastEdition } from '@/components/courses/PastEditions'
import { getDictionary, localePath, resolveLocale, type Locale } from '@/lib/i18n'
import type { Course, CourseSession } from '@/payload-types'

type Args = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const dict = getDictionary(locale)
  return {
    title: dict.catalog.metaTitle,
    description: dict.catalog.metaDescription,
  }
}

/** Card subtitle = provider/standard, same heuristic as the Home preview cards (§4 TODO). */
const courseSubtitle = (course: Course): string =>
  course.categoryKey === 'iso' ? 'PECB ISO/IEC 42001' : 'ISAD Academy'

/** Short blurb: shortDescription → SEO meta → truncated body (same chain as Home). */
const courseSummary = (course: Course): string => {
  const short = course.shortDescription?.trim()
  if (short) return short
  const meta = course.meta?.description?.trim()
  if (meta) return meta
  const plain = lexicalToPlainText(course.description)
  return plain ? excerpt(plain, 120) : ''
}

const formatDotDate = (iso: string): string => {
  const date = new Date(iso)
  const dd = String(date.getUTCDate()).padStart(2, '0')
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${date.getUTCFullYear()}`
}

type CatalogData = { catalog: CatalogCourse[]; past: PastEdition[] }

/**
 * Published courses + their editions via the Local API with access control on
 * (`overrideAccess: false`, no user) — drafts never leak. A course appears in the grid when
 * it has ≥1 upcoming edition (or none scheduled yet — "coming soon" on its page); editions
 * whose derived status is `past` feed the Past editions strip (§4/§6).
 */
async function getCatalogData(locale: Locale): Promise<CatalogData> {
  const dict = getDictionary(locale)
  try {
    const payload = await getPayload({ config })
    const [coursesResult, sessionsResult] = await Promise.all([
      payload.find({
        collection: 'courses',
        pagination: false,
        depth: 0,
        overrideAccess: false,
        locale,
        fallbackLocale: 'en',
      }),
      payload.find({
        collection: 'courseSessions',
        pagination: false,
        depth: 0,
        overrideAccess: false,
        locale,
        fallbackLocale: 'en',
      }),
    ])

    const byCourse = new Map<number, CourseSession[]>()
    for (const session of sessionsResult.docs) {
      const courseId = typeof session.course === 'object' ? session.course.id : session.course
      byCourse.set(courseId, [...(byCourse.get(courseId) ?? []), session])
    }

    const catalog: CatalogCourse[] = []
    const past: PastEdition[] = []

    for (const course of coursesResult.docs) {
      const sessions = byCourse.get(course.id) ?? []
      const upcomingStart = earliestUpcomingStart(sessions)
      const hasUpcoming = upcomingStart != null

      // Past editions strip — every already-delivered edition, newest first (below).
      // v2 (owner Figma 3908-107): the muted cards are NOT clickable anymore.
      for (const session of sessions.filter(isPastSession)) {
        past.push({
          title: course.title,
          subtitle: courseSubtitle(course),
          meta: dict.catalog.editionMeta(formatDotDate(session.startDate), session.seatsSold ?? 0),
        })
      }

      // Grid: courses with an upcoming edition, or with no editions scheduled yet.
      // v2: no durationLabel / earlyBirdOpen — the chips were removed from the card.
      if (hasUpcoming || sessions.length === 0) {
        catalog.push({
          title: course.title,
          subtitle: courseSubtitle(course),
          description: courseSummary(course),
          href: localePath(locale, `/courses/${course.slug}`),
          // No upcoming edition → sort last (the date is never rendered).
          nextStartDate: hasUpcoming ? new Date(upcomingStart).toISOString() : '9999-12-31',
        })
      }
    }

    past.sort((a, b) => b.meta.localeCompare(a.meta))
    return { catalog, past }
  } catch {
    // CMS unreachable → empty grid state + hidden past strip (§6 empty state).
    return { catalog: [], past: [] }
  }
}

/**
 * /courses (§6, owner Figma redesign v2 RESPONSIVE — desktop 3732-7, mobil 3908-107):
 * CatalogHeader (quiz CTA = the primary action) → CatalogGrid (sort toggle only — no
 * filters, no search; teaser cards without date/price/seats; mobile snap strip + dots) →
 * PastEditions (mobile snap strip). Fully CMS-driven: courses + courseSessions from Payload.
 */
export default async function CoursesPage({ params }: Args) {
  const locale = resolveLocale((await params).locale)
  const { catalog, past } = await getCatalogData(locale)

  return (
    <div className="bg-[#f8f9fa]">
      {/* Fade-in on scroll per secțiune (owner 2026-07-25) — același Reveal ca pe homepage */}
      <Reveal>
        <CatalogHeader locale={locale} quizHref={localePath(locale, '/quiz')} />
      </Reveal>
      <Reveal>
        <CatalogGrid locale={locale} courses={catalog} />
      </Reveal>
      <Reveal>
        <PastEditions locale={locale} editions={past} />
      </Reveal>
    </div>
  )
}
