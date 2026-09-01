import path from 'path'

import { asMedia, cpdCredits, isPastSession } from '@/components/courses/helpers'
import {
  buildEdition,
  courseTeaser,
  formatDotDate,
  formatDotDayMonth,
  getCourseData,
  weekdayFormat,
} from '@/lib/courses/detail'
import { getVisitorCountry, resolveCurrency, resolveSessionForCurrency, type Currency } from '@/lib/currency'
import { getDictionary, localePath, resolveLocale } from '@/lib/i18n'
import { uploadsDir } from '@/lib/media/uploadsDir'
import { pngDataUri, publicAsset } from '@/lib/pdf/assets'
import { renderCoursePdf, type CoursePdfData } from '@/lib/pdf/CoursePdf'
import { lexicalToBlocks } from '@/lib/richtext/plainText'
import { getSiteUrl } from '@/lib/seo/site'
import type { CourseSession } from '@/payload-types'

/**
 * GET /courses/[slug]/pdf — the "Export to PDF" download behind the black pill in
 * EnrolmentCard (owner 2026-09-01). Same data source as the page (`getCourseData`),
 * localized via the dictionary, rendered server-side by `src/lib/pdf/CoursePdf.tsx`.
 * Draft courses 404 here exactly as on the page (public access, no user).
 */

export const dynamic = 'force-dynamic'

// The brand logo never changes at runtime — rasterize public/brand/logo-blue.svg once
// per process instead of on every download.
let logoPromise: Promise<string | null> | null = null
const brandLogoPng = () => (logoPromise ??= pngDataUri(publicAsset('brand', 'logo-blue.svg'), 480))

type Args = { params: Promise<{ locale: string; slug: string }> }

export async function GET(request: Request, { params }: Args): Promise<Response> {
  const { locale: localeParam, slug } = await params
  const locale = resolveLocale(localeParam)
  const t = getDictionary(locale).courseDetail
  const data = await getCourseData(slug, locale)
  if (!data) return new Response('Not found', { status: 404 })

  const { course, sessions, siteSettings } = data
  const now = new Date()

  // Same config-driven decisions as the page (§13): threshold + geo-resolved currency.
  const seatsThreshold = siteSettings?.seatsThreshold ?? 5
  const country = getVisitorCountry(request.headers)
  const currency = resolveCurrency(country, (siteSettings?.currency as Currency) ?? 'EUR')

  const sessionsForVisitor = sessions.map((session) => resolveSessionForCurrency(session, currency))
  const upcomingSessions = sessionsForVisitor.filter((session) => !isPastSession(session))
  const editions = upcomingSessions.map((session) =>
    buildEdition(session, now, currency, seatsThreshold, locale),
  )
  const nextSession = upcomingSessions[0] ?? null
  const credits = cpdCredits(course)
  const isPecbTrack = course.categoryKey === 'iso'

  /* ——— Title split — the page header's pattern: last word in Deep Blue ——— */
  const titleWords = course.title.trim().replace(/\.$/, '').split(/\s+/)
  const titleAccent = titleWords[titleWords.length - 1] ?? ''
  const titlePlain = titleWords.length > 1 ? `${titleWords.slice(0, -1).join(' ')} ` : ''

  /* ——— Meta line: duration · CPD · live ——— */
  const metaLine = [
    course.durationHours ? t.chipHours(course.durationHours) : null,
    credits != null ? t.chipCpd(credits) : null,
    t.chipLive,
  ]
    .filter(Boolean)
    .join('  ·  ')

  /* ——— Programme (earliest upcoming edition) — same rows as the page ——— */
  type ScheduleRow = NonNullable<CourseSession['schedule']>[number]
  const programmeRows = (nextSession?.schedule ?? []).filter(
    (row): row is ScheduleRow & { date: string } => typeof row.date === 'string',
  )
  const weekday = weekdayFormat(locale)
  const programme =
    nextSession && programmeRows.length > 0
      ? {
          title: t.programmeTitle(formatDotDate(nextSession.startDate)),
          hours: programmeRows[0]
            ? `${programmeRows[0].startTime}-${programmeRows[0].endTime}${
                programmeRows.length > 1 ? ` · ${t.daily}` : ''
              }`
            : '',
          rows: programmeRows.map((row, index) => ({
            day: t.dayN(index + 1),
            date: `${weekday.format(new Date(row.date))} ${formatDotDayMonth(row.date)}`,
            topic: t.liveSession(row.startTime, row.endTime),
          })),
        }
      : null

  /* ——— Editions & pricing — from the same Edition view models as EnrolmentCard ——— */
  const editionItems = editions.map((edition) => ({
    dateRange: edition.dateRange,
    soldOut: edition.soldOut ? t.soldOut : null,
    primary: edition.earlyBird
      ? t.summaryEarlyBird(edition.earlyBird.price, edition.earlyBird.until)
      : edition.hasActiveWindow && edition.standard
        ? t.summaryStandard(edition.standard.price)
        : null,
    primaryTone: edition.earlyBird ? ('eb' as const) : ('std' as const),
    secondary:
      edition.earlyBird && edition.standard
        ? `${t.summaryStandard(edition.standard.price)}${
            edition.standard.from ? ` · ${t.fromDate(edition.standard.from)}` : ''
          }`
        : !edition.hasActiveWindow
          ? t.opensLater
          : null,
  }))

  /* ——— Certification — the CourseCertification rules: a custom body is shown verbatim
         (no automatic CPD line); empty overrides keep the per-track defaults ——— */
  const customBody = course.certificationCard?.body?.trim()
  const customSteps = (course.certificationCard?.steps ?? [])
    .map((step) => step.text?.trim() ?? '')
    .filter((text) => text.length > 0)
  const certification = {
    title: course.certificationCard?.title?.trim() || t.certificationTitle,
    body: customBody || (isPecbTrack ? t.certPecbCopy : t.certOwnCopy),
    steps: customSteps.length > 0 ? customSteps : [...(isPecbTrack ? t.certPecbSteps : t.certOwnSteps)],
    cpdLine:
      !customBody && course.durationHours != null && credits != null
        ? t.certCpdLine(course.durationHours, credits)
        : null,
  }

  /* ——— Trainer(s) — course trainers, or the site default (ExpertMiniCard's fallback) ——— */
  const courseTrainers = (course.trainers ?? []).filter(
    (entry) => typeof entry === 'object' && entry !== null,
  )
  const trainerItems = await Promise.all(
    courseTrainers.length > 0
      ? courseTrainers.map(async (trainer) => {
          const filename = asMedia(trainer.photo)?.filename
          // No photo (or unreadable file) → the default trainer photo, exactly like
          // ExpertMiniCard's fallback on the page.
          const photoPng =
            (filename ? await pngDataUri(path.join(uploadsDir, filename), 120) : null) ??
            (await pngDataUri(publicAsset('silviu-gresoi.png'), 120))
          return {
            name: trainer.name,
            role: trainer.role?.trim() || t.expertRole,
            photoPng,
          }
        })
      : [
          (async () => ({
            name: 'Dr. Silviu Gresoi, PhD, CFE',
            role: t.expertRole,
            photoPng: await pngDataUri(publicAsset('silviu-gresoi.png'), 120),
          }))(),
        ],
  )

  const courseUrl = `${getSiteUrl()}${localePath(locale, `/courses/${course.slug}`)}`
  const pdfData: CoursePdfData = {
    titlePlain,
    titleAccent,
    pill: isPecbTrack ? t.pillPecb : t.pillOwn,
    teaser: courseTeaser(course),
    metaLine,
    logoPng: await brandLogoPng(),
    about: { title: t.aboutTitle, blocks: lexicalToBlocks(course.description) },
    audience: {
      title: t.audienceTitle,
      items: (course.audience ?? [])
        .map((item) => item.text?.trim() ?? '')
        .filter((text) => text.length > 0),
    },
    programme,
    editions: { title: t.pdfEditionsTitle, items: editionItems },
    certification,
    trainers: { title: t.pdfTrainerTitle, items: trainerItems },
    notes: [t.vatNote, t.refundNote, t.discountsNote],
    footerLeft: 'isad.academy',
    footerRight: t.pdfFooter(courseUrl),
  }

  const pdf = await renderCoursePdf(pdfData)
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${course.slug}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
