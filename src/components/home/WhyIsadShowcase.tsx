'use client'

import Link from 'next/link'
import { type MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from 'react'

import { getDictionary, type Dictionary } from '../../lib/i18n/dictionaries'
import { localePath, type Locale } from '../../lib/i18n/config'
import { cn } from '../ui/cn'
import { Container } from '../ui/Container'
import { Reveal } from '../ui/Reveal'

/*
 * "Why isad.academy?" showcase — pixel-faithful port of the owner's Figma design
 * (node 3667-2967). Values are copied verbatim from the Figma dev-mode CSS: exact shadows,
 * strokes, radii, the blue↔cyan pill gradient, colors (#000000 / #959595 / #1C5D99), and
 * type sizes. The showcase card is a query container (`@container`) so every inner value is
 * expressed in `cqw` (1300px card ⇒ 1cqw = 13px) and scales proportionally at any width;
 * `clamp()` keeps type readable on small screens. Font is Poppins throughout (per owner).
 *
 * The "A" watermark is the exact Figma asset (grain + gradient + top fade baked in).
 */

export type ShowcaseStat = { num?: string; label: string }
type Stat = ShowcaseStat
type Card =
  | { key: 'practitioner'; title: string; kind: 'expert'; body: string; pillW: number }
  | { key: string; title: string; kind: 'text'; body: string; pillW: number }

/** Cards/stats copy lives in the dictionary (`whyShowcase`) — RO/EN site (owner 2026-07-13). */
const buildCards = (t: Dictionary['whyShowcase']): Card[] => [
  {
    key: 'practitioner',
    title: t.cards.practitioner.title,
    kind: 'expert',
    pillW: 383,
    body: t.cards.practitioner.body,
  },
  {
    key: 'pecb',
    title: t.cards.pecb.title,
    kind: 'text',
    pillW: 310,
    body: t.cards.pecb.body,
  },
  {
    key: 'ai',
    title: t.cards.ai.title,
    kind: 'text',
    pillW: 324,
    body: t.cards.ai.body,
  },
]

const buildFallbackStats = (t: Dictionary['whyShowcase']): Stat[] => [
  { num: t.statsFallback.years.num, label: t.statsFallback.years.label },
  { num: t.statsFallback.companies.num, label: t.statsFallback.companies.label },
  { num: t.statsFallback.sessions.num, label: t.statsFallback.sessions.label },
  { label: t.statsFallback.projects.label },
]

// px → cqw (card = 1300px ⇒ 1cqw = 13px). clamp(min, cqw, px) keeps small screens legible.
const type = (px: number, min: number) => `clamp(${min}px, ${(px / 13).toFixed(3)}cqw, ${px}px)`
const size = (px: number) => `${(px / 13).toFixed(3)}cqw`

/** Gradient-border pill holding the card title (Figma: 3px gradient, inner white + shadow). */
function TagPill({ children }: { children: string }) {
  return (
    <div className="inline-flex rounded-[1.846cqw] bg-[linear-gradient(90deg,#1C5D99_0%,#46D3F6_25%,#1C5D99_50%,#46D3F6_75%,#1C5D99_100%)] p-[0.231cqw] shadow-[3px_12px_7px_rgba(77,77,77,0.02),2px_5px_5px_rgba(77,77,77,0.03),0_1px_3px_rgba(77,77,77,0.03)]">
      <div className="flex items-center justify-center rounded-[1.615cqw] bg-white px-[2.5cqw] py-[1.1cqw]">
        <span
          className="whitespace-nowrap font-medium text-[#000000]"
          style={{ fontSize: type(28, 15), letterSpacing: '-0.5px', lineHeight: 1 }}
        >
          {children}
        </span>
      </div>
    </div>
  )
}

function CarouselCard({ card, photoUrl }: { card: Card; photoUrl: string }) {
  return (
    <article
      data-card
      className="flex shrink-0 snap-center flex-col items-center bg-white shadow-[0_0_7px_1px_rgba(0,0,0,0.13)]"
      style={{ width: size(617), height: size(326), borderRadius: size(16), padding: `${size(51.5)} ${size(42)}` }}
    >
      <div className="flex w-full justify-center">
        <TagPill>{card.title}</TagPill>
      </div>

      {card.kind === 'expert' ? (
        <div className="mt-[3.08cqw] flex w-full flex-1 items-center">
          {/* Photo is the vertical reference; the name is absolute below it so `items-center`
              centers the paragraph on the middle of the image (not the photo+name block). */}
          <div className="relative shrink-0" style={{ width: size(123) }}>
            <div
              className="relative mx-auto overflow-hidden rounded-full"
              style={{ width: size(107), height: size(107), filter: 'drop-shadow(0 0 5.3px rgba(0,0,0,0.28))' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="Dr. Silviu Gresoi" className="size-full object-cover" />
            </div>
            <span
              className="absolute inset-x-0 text-center font-medium text-[#000000]"
              style={{ top: `calc(${size(107)} + ${size(13)})`, fontSize: type(16, 11), lineHeight: 1 }}
            >
              Dr. Silviu Gresoi
            </span>
          </div>
          <p
            className="flex-1 text-right font-medium text-[#000000]"
            style={{ fontSize: type(16, 11), lineHeight: 1.56, paddingLeft: size(6) }}
          >
            {card.body}
          </p>
        </div>
      ) : (
        <p
          className="flex flex-1 items-center text-center font-medium text-[#959595]"
          style={{ fontSize: type(24, 14), lineHeight: 1.42, letterSpacing: '-1px' }}
        >
          {card.body}
        </p>
      )}
    </article>
  )
}

function Arrow({
  dir,
  onClick,
  faint,
  label,
}: {
  dir: 'left' | 'right'
  onClick: () => void
  faint?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        left: dir === 'left' ? '20cqw' : '80cqw',
        width: 'max(36px, 4.154cqw)',
        height: 'max(36px, 4.154cqw)',
        background: faint ? 'rgba(255,255,255,0.002)' : 'rgba(255,255,255,0.42)',
      }}
      className="absolute top-1/2 z-20 hidden -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[#000000] shadow-[inset_0_-4px_8px_rgba(0,0,0,0.1)] backdrop-blur-md sm:flex"
    >
      <svg viewBox="0 0 20 20" className="h-[40%] w-auto" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d={dir === 'left' ? 'M12 5l-5 5 5 5' : 'M8 5l5 5-5 5'} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

/** White copy of an arrow, revealed (masked to the trail) over the real arrow on hover. */
function WhiteArrow({ dir }: { dir: 'left' | 'right' }) {
  return (
    <div
      aria-hidden="true"
      style={{
        left: dir === 'left' ? '20cqw' : '80cqw',
        width: 'max(36px, 4.154cqw)',
        height: 'max(36px, 4.154cqw)',
      }}
      className="absolute top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#1C5D99] shadow-[inset_0_-4px_8px_rgba(0,0,0,0.1)] sm:flex"
    >
      <svg viewBox="0 0 20 20" className="h-[40%] w-auto" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
        <path d={dir === 'left' ? 'M12 5l-5 5 5 5' : 'M8 5l5 5-5 5'} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

export function WhyIsadShowcase({
  locale,
  expertName = 'Dr. Silviu Gresoi',
  expertPhotoUrl = null,
  stats,
}: {
  locale: Locale
  expertName?: string
  expertPhotoUrl?: string | null
  /** CMS stats (homepage.whyIsad.stats, D5) — falls back to the design defaults when unset. */
  stats?: ShowcaseStat[]
}) {
  void expertName
  const t = getDictionary(locale).whyShowcase
  // Ruptura fixă a subtitlului (owner 2026-07-26): ultimul cuvânt al frazei evidențiate
  // rămâne lipit de coadă („practitioners, built for real-world compliance.").
  const subHighlightWords = t.subHighlight.trim().split(/\s+/)
  const subHighlightLast = subHighlightWords.at(-1) ?? ''
  const subHighlightHead = subHighlightWords.slice(0, -1).join(' ')
  const cards = buildCards(t)
  const photoUrl = expertPhotoUrl || '/silviu-gresoi.png'
  const statList = stats && stats.length > 0 ? stats : buildFallbackStats(t)
  // Infinite carousel of full-width pages: `order` = [prev, active, next]; the middle page is
  // centered (no peek). Clicking slides one page, then the order rotates and the transform
  // resets silently — endless loop in both directions.
  const [order, setOrder] = useState<number[]>(() => [cards.length - 1, 0, 1])
  const [slide, setSlide] = useState(0)
  const [anim, setAnim] = useState(true)

  const go = (dir: 1 | -1) => {
    if (slide !== 0) return
    setSlide(dir)
  }
  const onSlideEnd = () => {
    if (slide === 0) return
    setAnim(false)
    setOrder((o) => (slide === 1 ? [o[1]!, o[2]!, o[0]!] : [o[2]!, o[0]!, o[1]!]))
    setSlide(0)
  }
  useEffect(() => {
    if (anim) return
    const id = requestAnimationFrame(() => setAnim(true))
    return () => cancelAnimationFrame(id)
  }, [anim])

  // Cursor-following trail on the main card (owner request): a blurred blue ellipse eases
  // toward the pointer via rAF; a radial mask reveals a white copy of the wordmark (and the
  // arrows) only under it (localised). It sits below the content cards.
  const cardRef = useRef<HTMLDivElement>(null)
  const targetPos = useRef({ x: 0, y: 0 })
  const trailPos = useRef({ x: 0, y: 0 })
  const rafId = useRef<number | null>(null)
  const [trailOn, setTrailOn] = useState(false)

  const runTrail = () => {
    if (rafId.current != null) return
    const tick = () => {
      const t = targetPos.current
      const c = trailPos.current
      c.x += (t.x - c.x) * 0.16
      c.y += (t.y - c.y) * 0.16
      const el = cardRef.current
      if (el) {
        el.style.setProperty('--mx', `${c.x.toFixed(1)}px`)
        el.style.setProperty('--my', `${c.y.toFixed(1)}px`)
      }
      rafId.current = requestAnimationFrame(tick)
    }
    rafId.current = requestAnimationFrame(tick)
  }
  const pointFromEvent = (e: ReactMouseEvent<HTMLDivElement>) => {
    const r = cardRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const onCardEnter = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const p = pointFromEvent(e)
    targetPos.current = { ...p }
    trailPos.current = { ...p }
    setTrailOn(true)
    runTrail()
  }
  const onCardMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    targetPos.current = pointFromEvent(e)
  }
  const onCardLeave = () => {
    setTrailOn(false)
    if (rafId.current != null) {
      cancelAnimationFrame(rafId.current)
      rafId.current = null
    }
  }
  useEffect(
    () => () => {
      if (rafId.current != null) cancelAnimationFrame(rafId.current)
    },
    [],
  )

  return (
    <section aria-labelledby="why-showcase-heading" className="hidden bg-white lg:block">
      {/* Content aligned to the shared Container (the navbar-logo line, owner 2026-07-13);
          the showcase card is a @container so everything inside rescales proportionally.
          Reveal = scroll-triggered fade + blur (owner 2026-07-13). */}
      <Container className="py-16 sm:py-20">
        <Reveal>
        {/* Header (section#video-texts) */}
        <div className="mx-auto text-center">
          <h2
            id="why-showcase-heading"
            className="font-semibold text-[#000000]"
            style={{ fontSize: 'clamp(1.75rem,2.85vw,48px)', letterSpacing: '-0.04em', lineHeight: 1.1 }}
          >
            {t.heading}
          </h2>
          <p
            className="mx-auto mt-[1.9vw] max-w-full font-medium text-[#959595]"
            style={{ fontSize: 'clamp(1rem,1.5vw,28px)', letterSpacing: '-1px', lineHeight: 1.5 }}
          >
            {t.subLead}{' '}
            {/* Brand gradient on the phrase only — the comma stays grey (owner 2026-07-13).
                Ruptura de rând e FIXATĂ (owner 2026-07-26): ultimul cuvânt al frazei
                evidențiate („practitioners") + coada formează un grup non-rupibil, deci
                rândul 2 e mereu „practitioners, built for real-world compliance.". */}
            <span className="text-gradient-brand">{subHighlightHead} </span>
            <span className="whitespace-nowrap">
              <span className="text-gradient-brand">{subHighlightLast}</span>, {t.subTail}
            </span>
          </p>
        </div>

        {/* Showcase card (div.video-container) — query container for proportional 1:1 */}
        <div className="relative mx-auto mt-10 w-full sm:mt-12">
          {/* ::before gradient glow */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-[-0.1cqw] h-[2.2cqw] rounded-full bg-[linear-gradient(90deg,#1C5D99_24.04%,#407EA2_82.69%)] opacity-45 blur-[32px]"
          />
          <div
            ref={cardRef}
            onMouseEnter={onCardEnter}
            onMouseMove={onCardMove}
            onMouseLeave={onCardLeave}
            className="@container relative overflow-hidden border-[6px] border-[#F6F6F6] bg-white shadow-[0_18px_38px_rgba(77,77,77,0.10),0_7px_15px_rgba(77,77,77,0.08),0_2px_6px_rgba(77,77,77,0.06)]"
            style={{ borderRadius: size(24) }}
          >
            {/* "A" watermark — exact Figma export */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/why-watermark.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 h-full w-auto select-none object-cover object-left"
            />

            {/* Wordmark — Poppins 600 50px, brand gradient text */}
            <div className="relative flex justify-center" style={{ paddingTop: size(58) }}>
              <span
                className="bg-[linear-gradient(90deg,#407EA2_0%,#1C5D99_28.85%,#1C5D99_53.37%,#407EA2_100%)] bg-clip-text font-semibold text-transparent"
                style={{ fontSize: type(50, 26), lineHeight: 1.1, letterSpacing: '-0.5px' }}
              >
                isad.academy
              </span>
            </div>

            {/* Cursor trail (Ellipse 38) — blurred blue ellipse easing to the pointer, below
                the content cards */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute rounded-full transition-opacity duration-500 ease-brand"
              style={{
                left: 'var(--mx, 50%)',
                top: 'var(--my, 42%)',
                width: size(215),
                height: size(203),
                transform: 'translate(-50%, -50%) rotate(-0.52deg)',
                background:
                  'linear-gradient(104.06deg, rgba(64,126,162,0.528) 17.54%, rgba(28,93,153,0.66) 35.72%, rgba(64,126,162,0.66) 63.27%, rgba(28,93,153,0.528) 82.37%)',
                filter: 'blur(43.2px)',
                opacity: trailOn ? 1 : 0,
              }}
            />
            {/* White reveal of the wordmark, masked to the trail's position */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 transition-opacity duration-300"
              style={{
                opacity: trailOn ? 1 : 0,
                WebkitMaskImage:
                  'radial-gradient(circle 8cqw at var(--mx, -200px) var(--my, -200px), #000 42%, transparent 100%)',
                maskImage:
                  'radial-gradient(circle 8cqw at var(--mx, -200px) var(--my, -200px), #000 42%, transparent 100%)',
              }}
            >
              <div className="relative flex justify-center" style={{ paddingTop: size(58) }}>
                <span
                  className="font-semibold text-white"
                  style={{ fontSize: type(50, 26), lineHeight: 1.1, letterSpacing: '-0.5px' }}
                >
                  isad.academy
                </span>
              </div>
            </div>

            {/* Carousel (Frame 620) — active card centered, next peeking; infinite loop.
                No overflow on the track (transform-driven) so the card shadow isn't cropped;
                cards sliding past the edges are clipped by the card's own overflow-hidden. */}
            <div className="relative" style={{ marginTop: size(40) }}>
              <Arrow dir="left" onClick={() => go(-1)} label={t.previous} />
              <div
                className={cn('flex', anim && 'transition-transform duration-500 ease-brand')}
                style={{
                  paddingTop: size(12),
                  paddingBottom: size(12),
                  transform: `translateX(${(-100 - slide * 100).toFixed(1)}cqw)`,
                }}
                onTransitionEnd={onSlideEnd}
              >
                {/* One card per full-width page → only the centered one shows (no peek) */}
                {order.map((ci, pos) => (
                  <div key={pos} className="flex w-full shrink-0 justify-center">
                    <CarouselCard card={cards[ci]!} photoUrl={photoUrl} />
                  </div>
                ))}
              </div>
              <Arrow dir="right" onClick={() => go(1)} faint label={t.next} />
            </div>

            {/* White reveal of the arrows — above the arrows, masked to the trail position.
                Mirrors the wordmark + carousel vertical layout so the white arrows land exactly
                on the real ones. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-300"
              style={{
                opacity: trailOn ? 1 : 0,
                WebkitMaskImage:
                  'radial-gradient(circle 8cqw at var(--mx, -200px) var(--my, -200px), #000 42%, transparent 100%)',
                maskImage:
                  'radial-gradient(circle 8cqw at var(--mx, -200px) var(--my, -200px), #000 42%, transparent 100%)',
              }}
            >
              <div className="flex justify-center" style={{ paddingTop: size(58), visibility: 'hidden' }}>
                <span style={{ fontSize: type(50, 26), lineHeight: 1.1 }}>isad.academy</span>
              </div>
              <div className="relative" style={{ marginTop: size(40) }}>
                <div style={{ height: `calc(${size(326)} + ${size(24)})` }} />
                <WhiteArrow dir="left" />
                <WhiteArrow dir="right" />
              </div>
            </div>

            {/* Stats bar (Container) — flush at the card bottom, rounded top only */}
            <div className="relative z-10" style={{ marginTop: size(148) }}>
              <div
                className="mx-auto flex flex-wrap items-center justify-center bg-white shadow-[0_0_4px_rgba(122,122,122,0.33)]"
                style={{
                  width: '91%',
                  borderRadius: `${size(16)} ${size(16)} 0 0`,
                  padding: `${size(14)} ${size(30)}`,
                  gap: `0 ${size(6)}`,
                }}
              >
                {statList.map((stat, index) => (
                  <span
                    key={stat.label}
                    className="whitespace-nowrap font-medium"
                    style={{ fontSize: type(19, 11), letterSpacing: '-0.56px', lineHeight: 1.4 }}
                  >
                    {stat.num && <span className="text-[#1C5D99]">{stat.num} </span>}
                    <span className="text-[#000000]">{stat.label}</span>
                    {index < statList.length - 1 && (
                      <span aria-hidden="true" className="text-[#959595]" style={{ padding: `0 ${size(11)}` }}>
                        ·
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CTAs (feature texts removed per owner 2026-07-12) — centered */}
        <div className="mx-auto mt-10 flex w-full flex-wrap items-center justify-center gap-4 sm:mt-12">
          <Link
            href={localePath(locale, '/cursuri')}
            className="ease-brand inline-flex items-center rounded-full border border-blue bg-[linear-gradient(180deg,#407ea2_0%,#1c5d99_80%)] px-6 py-2.5 text-sm font-normal text-white shadow-[0_4px_14px_rgba(28,93,153,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_7px_20px_rgba(28,93,153,0.45)]"
          >
            {t.exploreCourses}
          </Link>
          <Link
            href={localePath(locale, '/corporate')}
            className="px-[14px] font-normal text-[#000000]"
            style={{ fontSize: '16px' }}
          >
            {t.corporate}
          </Link>
        </div>
        </Reveal>
      </Container>
    </section>
  )
}
