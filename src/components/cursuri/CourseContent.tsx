import { getDictionary } from '@/lib/i18n/dictionaries'
import type { Locale } from '@/lib/i18n/config'

/**
 * Course / Content — the 4 cards of the course page's left column, redesign from the
 * owner's Figma extract (node 3790:4248): About · Who it's for · Programme · Certification.
 * NO modules, NO reviews, NO similar courses (CLAUDE.md §6).
 * Redesign changes vs the previous integration:
 * — "Who it's for": gradient CHECKMARK instead of the gradient dot.
 * — "Certification": full-width text + steps, NO certificate preview image.
 * Site adaptations kept: card radius 24 with the 6px line-soft frame (grey strokes only,
 * never blue), body text grey-600 (extract #595959), responsive px-6→px-10.
 * R2 wording: PECB courses → official PECB exam/platform; own courses ('other' category)
 * → isad.academy certificate of completion — never an accreditation claim.
 */

const cardCls =
  'flex w-full flex-col gap-4 rounded-[24px] border-[6px] border-line-soft bg-white px-10 pb-8 pt-[30px] shadow-[3px_9px_20px_rgba(77,77,77,0.03)]'
const headingCls =
  'text-[18px] font-medium leading-[26px] tracking-[-0.5px] text-ink lg:text-[24px] lg:leading-normal lg:tracking-[-0.8px]'
const bodyText = 'text-[15.5px] leading-[26px] text-grey-600'

/** Gradient checkmark — the "Who it's for" icon (Figma: vector "Line" 8.7×8.7). */
function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      className="shrink-0"
    >
      <path
        d="M2 6.8L5 9.8L11 2.5"
        stroke="url(#chk)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="chk" x1="2" y1="2" x2="11" y2="10" gradientUnits="userSpaceOnUse">
          <stop stopColor="#407EA2" />
          <stop offset="1" stopColor="#1C5D99" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/** About this course — richText `courses.description`, flattened to paragraphs. */
export function CourseAbout({ locale, paragraphs }: { locale: Locale; paragraphs: string[] }) {
  const t = getDictionary(locale).courseDetail
  if (paragraphs.length === 0) return null
  return (
    <section className={cardCls}>
      <h2 className={headingCls}>{t.aboutTitle}</h2>
      {paragraphs.map((p) => (
        <p key={p.slice(0, 48)} className={bodyText}>
          {p}
        </p>
      ))}
    </section>
  )
}

/** Who it's for — `courses.audience[].text`; the card hides itself when empty (§6). */
export function CourseAudience({ locale, audience }: { locale: Locale; audience: string[] }) {
  const t = getDictionary(locale).courseDetail
  if (audience.length === 0) return null
  return (
    <section className={cardCls}>
      <h2 className={headingCls}>{t.audienceTitle}</h2>
      {audience.map((a) => (
        <div key={a} className="flex items-center gap-3 px-0.5">
          <CheckIcon />
          <span className="text-[15px] leading-[23px] text-grey-600">{a}</span>
        </div>
      ))}
    </section>
  )
}

export type ProgrammeDay = { day: string; date: string; topic: string }

/** Programme — the earliest upcoming edition's `schedule` (server-rendered, §6). */
export function CourseProgramme({
  locale,
  editionLabel,
  hoursLabel,
  days,
}: {
  locale: Locale
  editionLabel: string
  hoursLabel: string
  days: ProgrammeDay[]
}) {
  const t = getDictionary(locale).courseDetail
  if (days.length === 0) return null
  return (
    <section className={cardCls}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={headingCls}>{t.programmeTitle(editionLabel)}</h2>
        <span className="text-[14px] text-grey-600">{hoursLabel}</span>
      </div>
      {days.map((d) => (
        <div
          key={d.day}
          className="flex w-full flex-col gap-1.5 rounded-[14px] bg-line-soft px-[18px] py-3 lg:flex-row lg:items-center lg:gap-4"
        >
          {/* Mobil: „Day N + data" pe un rând, subiectul dedesubt; desktop: toate trei inline
              (lg:contents dizolvă metarândul în rândul flex) */}
          <span className="flex items-center gap-2.5 lg:contents">
            <span className="text-[14px] font-semibold tracking-[-0.3px] text-blue">{d.day}</span>
            <span className="text-[13px] font-medium text-grey-600">{d.date}</span>
          </span>
          <span className="text-[14.5px] leading-[21px] text-grey-600 lg:leading-normal">
            {d.topic}
          </span>
        </div>
      ))}
    </section>
  )
}

/**
 * Certification — R2 copy per track, full-width text + numbered steps.
 * Redesign: NO certificate preview (the shared Certificate render was removed).
 */
export function CourseCertification({
  locale,
  hours,
  cpdCredits,
  track,
}: {
  locale: Locale
  hours: number | null
  cpdCredits: number | null
  track: 'pecb' | 'own'
}) {
  const t = getDictionary(locale).courseDetail
  const cpdLine = hours != null && cpdCredits != null ? ` ${t.certCpdLine(hours, cpdCredits)}` : ''
  const copy = `${track === 'pecb' ? t.certPecbCopy : t.certOwnCopy}${cpdLine}`
  const steps = track === 'pecb' ? t.certPecbSteps : t.certOwnSteps

  // Mobil (Figma 3925-115): py-8 (pt 32) + spațieri interne 12; desktop: pt 30 / gap 16
  return (
    <section className="flex w-full flex-col gap-3 rounded-[24px] border-[6px] border-line-soft bg-white px-10 py-8 shadow-[3px_9px_20px_rgba(77,77,77,0.03)] lg:gap-4 lg:pt-[30px]">
      <h2 className={headingCls}>{t.certificationTitle}</h2>
      <p className="text-[15px] leading-6 text-grey-600">{copy}</p>
      {steps.map((s: string, i: number) => (
        <div key={s} className="flex items-center gap-2.5">
          <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-line-soft text-[12px] font-semibold text-blue">
            {i + 1}
          </span>
          <span className="flex-1 text-[14px] leading-[21px] text-grey-600 lg:leading-normal">
            {s}
          </span>
        </div>
      ))}
    </section>
  )
}
