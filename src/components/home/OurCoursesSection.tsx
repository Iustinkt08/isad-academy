'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

import { getDictionary, type Dictionary } from '../../lib/i18n/dictionaries'
import { localePath, type Locale } from '../../lib/i18n/config'
import { cn } from '../ui/cn'
import { Container } from '../ui/Container'
import { Reveal } from '../ui/Reveal'
import { excerpt, lexicalToPlainText } from '../courses/helpers'
import type { Course } from '@/payload-types'

/*
 * "Explore our upcoming courses." — Home section from the owner's Figma extract
 * (CoursesSection.tsx / tokens-additions.css, node 3622:3535), re-proportioned on
 * 2026-07-13 (owner): content is aligned to the shared Container (the navbar-logo line)
 * instead of the 1920px Figma frame, the four cards shrink to fit one row inside it
 * (fluid grid) and type steps down to normal site scale. The card keeps its Figma identity:
 * 6px line-soft frame, layered shadows, blue wash ("Card BG / Hover"), black Enroll pill on a
 * fixed bottom line, and the start-date tab notched into the bottom edge.
 *
 * Responsive v2 (owner 2026-07-17, Figma node 3784-26): below `lg` the row becomes a
 * full-bleed horizontal SNAP carousel — one full card + a ~10px peek of the next, 21px left
 * padding, 12px gap, hidden scrollbar — with pagination dots synced to the snapped card.
 * At `lg`+ the desktop row is unchanged (4-up grid inside the Container). The blue wash shows
 * on the ACTIVE (snapped) card on mobile and on :hover on desktop. This is a client component
 * so the scroll/dot state can live here; the interactive bits degrade gracefully (the strip is
 * a plain scroll container without JS, dots simply won't track).
 *
 * The start-date tab is smart (owner 2026-07-12): live seats-left when the soonest edition
 * has fewer than 3 seats ("N seats left" / "Sold out"), otherwise the start date.
 */

/** courseId → chip data computed server-side in page.tsx. */
type CourseChip = { startDate: string | null; seatsRemaining: number | null }

/** Combined three-layer card drop shadow, verbatim from Figma dev-mode (#4D4D4D 2%/3%/3%). */
const CARD_SHADOW =
  '24px 80px 50px rgba(77,77,77,0.02), 10px 36px 37px rgba(77,77,77,0.03), 3px 9px 20px rgba(77,77,77,0.03)'

/** Film grain (SVG fractal noise) layered over the hover wash — pronounced per owner 2026-07-13. */
const GRAIN_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

/** Snap geometry (Figma 3784-26): 21px strip padding, mirrored by the scroll-detection math
 *  below and the scroll-padding-left utility. Keep them in sync. */
const STRIP_PAD = 21

/**
 * Card subtitle = the provider / standard behind the course. Derived from `category` (no
 * dedicated provider field yet, CLAUDE.md §4). NOTE: the own-course tag is written "ISAD
 * Academy" — a deliberate exception to the lowercase brand rule (owner, 2026-07-12), matching
 * the Figma card exactly. TODO(silviu): swap for a real provider field once one exists.
 */
function courseSubtitle(course: Course): string {
  return course.category === 'iso' ? 'PECB ISO/IEC 42001' : 'ISAD Academy'
}

/**
 * Short muted blurb for the preview card. The dedicated `shortDescription` field wins
 * (owner-authored, CLAUDE.md §4); falls back to the SEO meta description, then a truncated
 * plain-text of the full body — so older courses without a short description still render.
 */
function courseSummary(course: Course): string {
  const short = course.shortDescription?.trim()
  if (short) return short
  const meta = course.meta?.description?.trim()
  if (meta) return meta
  const plain = lexicalToPlainText(course.description)
  return plain ? excerpt(plain, 120) : ''
}

/**
 * Format a date-only ISO string as "DD.MM.YYYY". Uses UTC getters so a value stored at
 * midnight UTC never shifts a calendar day under the server's local timezone.
 */
function formatDotDate(iso: string): string | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const dd = String(date.getUTCDate()).padStart(2, '0')
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${date.getUTCFullYear()}`
}

/**
 * Smart tab text: sold out → seats-left (only under 3, live from the backend) → start date.
 * Returns null when the course has no upcoming edition (the tab is then hidden).
 */
function chipLabel(chip: CourseChip | undefined, t: Dictionary['ourCourses']): string | null {
  const seats = chip?.seatsRemaining
  if (seats != null && seats <= 0) return t.soldOut
  if (seats != null && seats < 3) return t.seatsLeft(seats)
  const start = chip?.startDate ? formatDotDate(chip.startDate) : null
  return start ? t.startDate(start) : null
}

function CourseCard({
  course,
  chip,
  locale,
  t,
  active = false,
  radiusClass = 'rounded-[20px]',
}: {
  course: Course
  chip: CourseChip | undefined
  locale: Locale
  t: Dictionary['ourCourses']
  /** Mobile only: the snapped card in the carousel shows the wash (desktop uses :hover). */
  active?: boolean
  /** Explicit radius per breakpoint — desktop 20px (unchanged), mobile 24px (Figma 3784-26). */
  radiusClass?: string
}) {
  const label = chipLabel(chip, t)

  return (
    <article
      data-testid="our-course-card"
      data-active={active ? 'true' : undefined}
      className={cn(
        'group relative flex h-full min-h-[380px] flex-col overflow-hidden border-[6px] border-line-soft bg-white p-[26px] pb-14',
        radiusClass,
      )}
      style={{ boxShadow: CARD_SHADOW }}
    >
      {/* Blue wash — Figma "Card BG / Hover": visible on :hover (desktop) or on the active,
          snapped card (mobile, via data-active). A pronounced grain layer rides on top. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[150px] bg-gradient-to-t from-[#b9cde3]/70 via-[#dbe6f0]/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-data-[active=true]:opacity-100"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[150px] opacity-0 mix-blend-overlay transition-opacity duration-300 [mask-image:linear-gradient(to_top,black,transparent)] group-hover:opacity-90 group-data-[active=true]:opacity-90"
        style={{ backgroundImage: GRAIN_URL, backgroundSize: '90px 90px' }}
      />

      {/* Content column — gap-scaled from the Figma stack (gap 12 @347px card) */}
      <div className="relative z-10 flex flex-1 flex-col items-start gap-2.5">
        {/* Course icon — approved black logo mark (48×52.5 in Figma, stepped down) */}
        <Image
          src="/brand/icon-black.svg"
          alt=""
          aria-hidden="true"
          width={40}
          height={44}
          unoptimized
          className="h-11 w-10 object-contain object-left"
        />
        <h3 className="text-[18px] font-medium leading-snug tracking-[-0.72px] text-ink">
          {course.title}
        </h3>
        <p className="text-[14px] leading-[1.5] text-ink">{courseSubtitle(course)}</p>
        <p className="text-[14px] leading-[1.5] text-[#959595]">{courseSummary(course)}</p>

        {/* Enroll — black pill with subtle ring, anchored to the same bottom line on every
            card regardless of blurb length (owner 2026-07-12) */}
        <div className="mt-auto pt-5">
          <Link
            href={localePath(locale, `/cursuri/${course.slug}`)}
            className="inline-flex rounded-[20px] bg-black px-4 py-2 text-[13px] font-semibold leading-normal text-white shadow-[0_0_0_1px_rgba(255,255,255,0.2),4px_6px_25px_rgba(0,0,0,0.25),8px_10px_45px_rgba(0,0,0,0.2)] transition-transform hover:scale-[1.03]"
          >
            {t.enroll}
          </Link>
        </div>
      </div>

      {/* Start-date tab — notched into the bottom edge (same fill as the card border, so it
          reads as one piece), rounded top corners, gradient dot + Poppins Medium label */}
      {label && (
        <div className="absolute bottom-0 left-1/2 z-10 flex h-6 -translate-x-1/2 items-center gap-[6px] whitespace-nowrap rounded-t-[18px] bg-line-soft px-3 drop-shadow-[0_0_2px_rgba(122,122,122,0.33)]">
          <span
            aria-hidden="true"
            className="size-[9px] shrink-0 rounded-full bg-gradient-to-b from-blue to-steel"
          />
          <span className="text-[13px] font-medium leading-normal tracking-[-0.5px] text-ink">
            {label}
          </span>
        </div>
      )}
    </article>
  )
}

export function OurCoursesSection({
  courses,
  chips,
  locale,
}: {
  courses: Course[]
  chips: Record<number, CourseChip>
  locale: Locale
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  /* Track the snapped card by measuring each card's left edge against the strip's start
     (21px inset via scroll-padding-left). Robust to any card width / device pixel ratio,
     rAF-throttled so scroll stays smooth. */
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    let raf = 0
    const sync = () => {
      raf = 0
      const cards = scroller.querySelectorAll<HTMLElement>('[data-carousel-card]')
      if (cards.length === 0) return
      const stripLeft = scroller.getBoundingClientRect().left + STRIP_PAD
      let best = 0
      let bestDist = Infinity
      cards.forEach((card, i) => {
        const dist = Math.abs(card.getBoundingClientRect().left - stripLeft)
        if (dist < bestDist) {
          bestDist = dist
          best = i
        }
      })
      setActiveIndex(best)
    }
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(sync)
    }

    sync()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [courses.length])

  const scrollToIndex = useCallback((i: number) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const card = scroller.querySelectorAll<HTMLElement>('[data-carousel-card]')[i]
    if (!card) return
    const left =
      scroller.scrollLeft +
      (card.getBoundingClientRect().left - scroller.getBoundingClientRect().left) -
      STRIP_PAD
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    scroller.scrollTo({ left, behavior: reduce ? 'auto' : 'smooth' })
  }, [])

  if (courses.length === 0) return null
  const t = getDictionary(locale).ourCourses

  return (
    <section
      id="our-courses"
      aria-labelledby="our-courses-heading"
      className="bg-[#F8F9FA] py-20 sm:py-24"
    >
      <Reveal>
        <div className="flex flex-col items-center gap-10">
          {/* Two-tone title — Poppins SemiBold, gradient on "courses.". Mobile: 28px/34 on two
              lines (Figma 256px block); desktop: unchanged fluid clamp. */}
          <Container>
            <h2
              id="our-courses-heading"
              className="mx-auto max-w-[256px] text-center text-[28px] font-semibold leading-[34px] tracking-[-0.04em] text-ink lg:max-w-[600px] lg:text-[clamp(32px,4vw,48px)] lg:leading-[1.1]"
            >
              {t.headingLead}{' '}
              <span className="text-gradient-brand">{t.headingHighlight}</span>
              <span className="text-ink">.</span>
            </h2>
          </Container>

          {/* MOBILE (< lg) — full-bleed horizontal snap carousel (Figma 3784-26): 21px left
              padding, 12px gap, one full card + ~10px peek, momentum + snap-mandatory, hidden
              scrollbar. Card width = viewport − 21(pad) − 12(gap) − 10(peek), capped at the
              Figma 347px so tablets keep the design size and simply reveal more peek. */}
          <div className="w-full lg:hidden">
            <div
              ref={scrollerRef}
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-[21px] py-4 pl-[21px] pr-[21px] [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {courses.map((course, i) => (
                <div
                  key={course.id}
                  data-carousel-card
                  className="w-[calc(100vw_-_43px)] max-w-[347px] shrink-0 snap-start"
                >
                  <CourseCard
                    course={course}
                    chip={chips[course.id]}
                    locale={locale}
                    t={t}
                    active={i === activeIndex}
                    radiusClass="rounded-[24px]"
                  />
                </div>
              ))}
            </div>

            {/* Pagination dots — synced to the snapped card. Active = 22×8 gradient pill,
                inactive = 8px #d1d1d1, each clickable to jump. */}
            {courses.length > 1 && (
              <div className="mt-6 flex items-center justify-center gap-[7px]">
                {courses.map((course, i) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => scrollToIndex(i)}
                    aria-label={`Go to course ${i + 1}`}
                    aria-current={i === activeIndex ? 'true' : undefined}
                    className={cn(
                      'h-2 rounded-full transition-all duration-300',
                      i === activeIndex
                        ? 'w-[22px] bg-gradient-to-r from-steel to-blue'
                        : 'w-2 bg-[#d1d1d1]',
                    )}
                  />
                ))}
              </div>
            )}
          </div>

          {/* DESKTOP (≥ lg) — unchanged 4-up row inside the shared Container. */}
          <Container className="hidden w-full lg:block">
            <div className="grid grid-cols-4 gap-6">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  chip={chips[course.id]}
                  locale={locale}
                  t={t}
                />
              ))}
            </div>
          </Container>

          {/* CTA — gradient pill; quiz entry point (quiz live since 2026-07-23).
              15px on mobile, 16px on desktop (unchanged). */}
          <Link
            href={localePath(locale, '/quiz')}
            className="rounded-full border border-blue bg-gradient-to-b from-steel to-blue to-[80%] px-[15px] pb-2 pt-[7px] text-center text-[15px] leading-normal text-white shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-transform hover:scale-[1.03] lg:text-[16px]"
          >
            {t.whichCourse}
          </Link>
        </div>
      </Reveal>
    </section>
  )
}
