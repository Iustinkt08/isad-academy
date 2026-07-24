import type { Locale } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { isWindowActive } from '@/lib/pricing/windows'
import type { Course, CourseSession, Media } from '@/payload-types'

/** Narrow a Payload upload/relationship value to the populated document. */
export const asMedia = (value: number | Media | null | undefined): Media | null =>
  value != null && typeof value === 'object' ? value : null

/** Populated published courses only — draft/id-only entries are dropped defensively. */
export const asPublishedCourses = (value: (number | Course)[] | null | undefined): Course[] =>
  (value ?? []).filter(
    (entry): entry is Course => typeof entry === 'object' && entry._status === 'published',
  )

/** Deterministic server-side date formatting, e.g. "19 Aug 2026" / "19 aug. 2026". */
const DATE_FORMATS: Record<Locale, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  ro: new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' }),
}

export const formatDate = (
  value: string | null | undefined,
  locale: Locale = 'en',
): string | null => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : DATE_FORMATS[locale].format(date)
}

/** "€900" / "RON 900" — whole units, currency comes from siteSettings (§13, config-driven). */
export const formatPrice = (value: number, currency: string, locale: Locale = 'en'): string =>
  new Intl.NumberFormat(locale === 'ro' ? 'ro-RO' : 'en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)

export const isPastSession = (session: CourseSession): boolean => session.status === 'past'

/**
 * CPD credits awarded for a course. House rule C3 (CLAUDE.md §9 R2): **1 course hour = 1
 * CPD credit**, so `durationHours` is authoritative — a course with a known duration always
 * earns exactly that many credits. `certificationCredits` is only a fallback for courses
 * whose duration isn't recorded (and stays available as a manual number there). Returns null
 * when neither is known — the caller then hides the CPD badge rather than showing "0".
 */
export const cpdCredits = (
  course: Pick<Course, 'certificationCredits' | 'durationHours'>,
): number | null => course.durationHours ?? course.certificationCredits ?? null

/**
 * Catalog EB badge rule (§6): a course advertises Early Bird only when some FUTURE
 * (non-past) edition has an Early Bird window active RIGHT NOW. Reuses the pricing
 * engine's `isWindowActive` so the badge can never disagree with checkout.
 */
export const hasActiveEarlyBird = (sessions: CourseSession[], now: Date = new Date()): boolean =>
  sessions.some((session) => !isPastSession(session) && isWindowActive(session.earlyBird, now))

/** Millis of the earliest non-past edition start — the catalog sort key. Null = no upcoming. */
export const earliestUpcomingStart = (sessions: CourseSession[]): number | null => {
  const times = sessions
    .filter((session) => !isPastSession(session))
    .map((session) => new Date(session.startDate).getTime())
    .filter((time) => !Number.isNaN(time))
  return times.length > 0 ? Math.min(...times) : null
}

/** Short human summary of an edition's schedule, e.g. "2 days · 09:00–17:00". */
export const scheduleSummary = (session: CourseSession, locale: Locale = 'en'): string | null => {
  const rows = session.schedule ?? []
  const [first] = rows
  if (!first) return null
  const dayCount = getDictionary(locale).courseDetail.dayCount(rows.length)
  return `${dayCount} · ${first.startTime}–${first.endTime}`
}

/** Re-exported from the shared lib (T12 moved it so collection hooks can use it too). */
export { lexicalToPlainText } from '@/lib/richtext/plainText'

/** Truncate plain text for a meta description. */
export const excerpt = (text: string, maxLength = 155): string =>
  text.length <= maxLength ? text : `${text.slice(0, maxLength - 1).trimEnd()}…`
