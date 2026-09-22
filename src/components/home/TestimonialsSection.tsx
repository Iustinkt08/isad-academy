'use client'

import Image from 'next/image'
import { useRef } from 'react'

import { getDictionary } from '../../lib/i18n/dictionaries'
import type { Locale } from '../../lib/i18n/config'
import { toImageSrc } from '../../lib/media/imageSrc'
import { cn } from '../ui/cn'
import { Container } from '../ui/Container'
import { useMarqueeHoverEase } from '../ui/MarqueeHoverPause'
import { Reveal } from '../ui/Reveal'
import { useSnapCarousel } from '../ui/useSnapCarousel'
import { asMedia } from '../courses/helpers'
import type { Review } from '@/payload-types'

/*
 * "What learners say, from the professionals we've trained." — Home testimonials,
 * 1:1 from the owner's Figma extract (TestimonialsSection.tsx, node 3622:4020, 2026-07-13).
 * Card 431×228, radius 16, marquee gap 44, blurred brand blobs behind the title.
 *
 * Data comes from the Payload `reviews` collection (showOnHome, max 5 — queried in page.tsx).
 * ⚠️ Until real reviews arrive (discovery D7), an explicitly-FICTIVE sample set keeps the
 * marquee populated in dev; it disappears as soon as one real review is curated.
 * Photos are optional — the fallback avatar shows initials on a grey disc.
 *
 * Token mapping from the extract: brand-steel/brand-deep → `steel`/`blue`,
 * surface-subtle → #F8F9FA, line → #e5e5e5, ink-secondary → grey-600.
 * `text-gradient-brand` + `animate-marquee` live in globals.css (tokens-additions.css);
 * the marquee is stilled under prefers-reduced-motion there.
 */

type CardData = {
  name: string
  roleCompany: string
  course: string
  text: string
  photoUrl: string | null
}

/**
 * SAMPLE testimonials (fictive names/companies — D7) shown only while `reviews` is empty.
 * Names/companies/courses stay identical in both languages; only the quote text is
 * localized (dictionary `testimonials.fallbackQuotes`, matched by index).
 */
const SAMPLE_META: Omit<CardData, 'text'>[] = [
  {
    name: 'Andrei Munteanu',
    roleCompany: 'Head of Compliance, Nordis Bank',
    course: 'ISO/IEC 42001 Lead Implementer',
    photoUrl: null,
  },
  {
    name: 'Elena Vasilescu',
    roleCompany: 'Risk & Data Protection Officer, Meridian Energy',
    course: 'AI Governance & Responsible AI',
    photoUrl: null,
  },
  {
    name: 'Robert Klein',
    roleCompany: 'Internal Audit Lead, Vectra Insurance',
    course: 'ISO/IEC 42001 Lead Auditor',
    photoUrl: null,
  },
  {
    name: 'Ioana Petrescu',
    roleCompany: 'IT Governance Manager, Telcom Solutions',
    course: 'ISO/IEC 42001 Foundation',
    photoUrl: null,
  },
  {
    name: 'Marius Dincă',
    roleCompany: 'CISO, Altair Systems',
    course: 'ISO/IEC 42001 Lead Implementer',
    photoUrl: null,
  },
]

/** Map a Payload review to the card shape; relationship `course` resolves at depth 1. */
function toCardData(review: Review, participantFallback: string): CardData {
  const photoUrl = asMedia(review.photo)?.url
  return {
    name: review.authorName?.trim() || participantFallback,
    roleCompany: review.roleCompany?.trim() || '',
    course: typeof review.course === 'object' && review.course ? review.course.title : '',
    text: review.text,
    photoUrl: photoUrl ? toImageSrc(photoUrl) : null,
  }
}

/**
 * Decorative quote marks — the EXACT Figma-exported vector (node 3692:4964, owner v2
 * 2026-07-13): angular forms, white → #666 gradient at 5% opacity ("dissolves into
 * white"), flush with the card's bottom edge at right 27px.
 */
function QuoteMark() {
  return (
    <svg
      aria-hidden="true"
      width="122"
      height="76"
      viewBox="0 0 122 76"
      fill="none"
      className="pointer-events-none absolute bottom-0 right-[27px]"
    >
      <path
        d="M0 76L20.3618 35.5358H0V0H51.0895V32.4232L26.6554 76H0Z"
        fill="url(#tq-grad)"
        fillOpacity="0.05"
      />
      <path
        d="M70.9105 76L91.2722 35.5358H70.9105V0H122V32.4232L97.5659 76H70.9105Z"
        fill="url(#tq-grad)"
        fillOpacity="0.05"
      />
      <defs>
        <linearGradient
          id="tq-grad"
          x1="61"
          y1="0"
          x2="66.5405"
          y2="24.0573"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" />
          <stop offset="1" stopColor="#666666" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function TestimonialCard({ card }: { card: CardData }) {
  const initials = card.name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)

  return (
    <figure className="relative h-[228px] w-[min(431px,calc(100vw_-_40px))] shrink-0 overflow-hidden rounded-[16px] bg-white shadow-[0_0_7px_1px_rgba(0,0,0,0.09)]">
      <QuoteMark />

      {/* Avatar 52px @ (28,28) — optional photo, initials fallback */}
      {card.photoUrl ? (
        <Image
          src={card.photoUrl}
          alt={card.name}
          width={52}
          height={52}
          className="absolute left-[28px] top-[28px] size-[52px] rounded-full object-cover drop-shadow-[0_0_2.65px_rgba(0,0,0,0.28)]"
        />
      ) : (
        <span
          aria-hidden="true"
          className="absolute left-[28px] top-[28px] flex size-[52px] items-center justify-center rounded-full bg-[#e5e5e5] text-[16px] font-semibold text-grey-600 drop-shadow-[0_0_2.65px_rgba(0,0,0,0.28)]"
        >
          {initials}
        </span>
      )}

      {/* Author — 12/14 Medium, two lines, centred on y=54 */}
      <figcaption className="absolute left-[99px] top-[54px] w-[min(286px,calc(100%_-_113px))] -translate-y-1/2 text-[12px] font-medium leading-[14px] text-ink">
        <p className="line-clamp-2">
          {card.name}
          {card.roleCompany && ` · ${card.roleCompany}`}
        </p>
        {card.course && <p className="line-clamp-1">{card.course}</p>}
      </figcaption>

      {/* Quote — 12/16 Medium, centred on y=138 */}
      {/* line-clamp-5: cutia are 228px ficși — citate mai lungi din CMS ar ieși peste autor */}
      <blockquote className="absolute left-[27px] top-[138px] line-clamp-5 w-[min(377px,calc(100%_-_54px))] -translate-y-1/2 text-[12px] font-medium leading-4 text-ink">
        {card.text}
      </blockquote>
    </figure>
  )
}

export function TestimonialsSection({ reviews, locale }: { reviews: Review[]; locale: Locale }) {
  const t = getDictionary(locale).testimonials
  const sample: CardData[] = SAMPLE_META.map((meta, index) => ({
    ...meta,
    text: t.fallbackQuotes[index] ?? '',
  }))
  const cards =
    reviews.length > 0 ? reviews.map((review) => toCardData(review, t.participantFallback)) : sample

  /* Mobile snap carousel (owner 2026-09-22): dots synced to the snapped card, same hook and
     centred geometry as the courses carousel. Inert on desktop, where the track is a marquee. */
  const scrollerRef = useRef<HTMLDivElement>(null)
  const { activeIndex, scrollToIndex } = useSnapCarousel(scrollerRef, cards.length, {
    align: 'center',
  })
  /* Desktop marquee: eases to a halt under the mouse and back up when it leaves (owner
     2026-09-22 — "not stop dead"), and can be DRAGGED to browse the cards by hand (owner,
     same day); no-op on mobile where the track has no animation (native swipe instead). */
  useMarqueeHoverEase(scrollerRef, { drag: true })

  return (
    <section
      id="testimonials"
      aria-labelledby="testimonials-heading"
      className="relative overflow-hidden bg-[#F8F9FA] py-20 sm:py-24"
    >
      {/* Blurred decorative brand blobs (Figma: Ellipse 38/39) — at the VIEWPORT corners:
          top-right and bottom-left of the section (owner 2026-07-13) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-60px] top-[-64px] size-[238px] rounded-full bg-gradient-to-br from-steel/60 to-blue/50 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-48px] left-[-48px] size-[217px] rounded-full bg-gradient-to-tr from-steel/60 to-blue/50 blur-2xl"
      />

      <Container className="relative">
        <Reveal>
        {/* Two-tone title — Poppins SemiBold, capped at 48px (owner 2026-07-13) */}
        <h2
          id="testimonials-heading"
          className="mx-auto max-w-[769px] text-center text-[clamp(32px,4vw,48px)] font-semibold leading-[1.1] tracking-[-0.04em] text-ink"
        >
          {t.headingPre} <span className="text-gradient-brand">{t.headingLearners}</span>{' '}
          {t.headingMid} <span className="text-gradient-brand">{t.headingProfessionals}</span>{' '}
          {t.headingPost}
          <span className="text-gradient-brand">.</span>
        </h2>

        {/* Track — one DOM, two behaviours (owner 2026-09-22):
            — ≥ lg: the Figma marquee, clipped to the container (owner 2026-07-13), gap 44;
              the list is duplicated for a seamless loop (trailing pr = gap keeps the −50%
              wrap exact) and the clones are aria-hidden so screen readers hear each review
              once. The animation EASES TO A HALT while the mouse is anywhere over the strip
              (useMarqueeHoverEase) so a review can actually be read, and eases back up when
              it leaves. The horizontal mask melts the cards at both edges.
            — < lg: a full-bleed horizontal SNAP carousel (native scroll, one card per swipe,
              CENTRED like the courses carousel: track padding = (viewport − card) / 2 so every
              card, first and last included, rests in the middle with symmetric peeks; 12px
              gap; dots below) — each testimonial can be read on a phone. No auto-motion here:
              touch has no hover to pause it, and the other mobile carousels on Home are manual
              too. The clones are display:none below lg so the swipe list holds each review
              exactly once.
            py lets the card shadow breathe past the clip. */}
        <div
          ref={scrollerRef}
          className="-mx-4 mt-12 snap-x snap-mandatory overflow-x-auto py-3 [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:-mx-6 sm:mt-16 lg:mx-0 lg:cursor-grab lg:select-none lg:snap-none lg:overflow-hidden lg:[mask-image:linear-gradient(to_right,transparent,black_7%,black_93%,transparent)] [&::-webkit-scrollbar]:hidden"
        >
          {/* Bare `animate-marquee` (not `lg:`) so the prefers-reduced-motion override in
              globals.css keeps stilling it; `max-lg:animate-none` turns it off for the swipe
              list. Mobile padding mirrors the card width in TestimonialCard (min(431, 100vw − 40)). */}
          <div className="flex w-max animate-marquee gap-3 px-[calc((100vw_-_min(431px,100vw_-_40px))_/_2)] max-lg:animate-none lg:gap-11 lg:pl-0 lg:pr-11">
            {[...cards, ...cards].map((card, index) => {
              const clone = index >= cards.length
              return (
                <div
                  key={`${card.name}-${index}`}
                  data-carousel-card={clone ? undefined : ''}
                  aria-hidden={clone || undefined}
                  className={cn('shrink-0 snap-center', clone && 'hidden lg:block')}
                >
                  <TestimonialCard card={card} />
                </div>
              )
            })}
          </div>
        </div>

        {/* Pagination dots (mobile only) — synced to the snapped card. Active = 22×8 gradient
            pill, inactive = 8px #d1d1d1, each clickable to jump (same as the courses dots). */}
        {cards.length > 1 && (
          <div
            className="mt-6 flex items-center justify-center gap-[7px] lg:hidden"
            role="tablist"
            aria-label={t.dotsAria}
          >
            {cards.map((card, i) => (
              <button
                key={`${card.name}-${i}`}
                type="button"
                role="tab"
                aria-selected={i === activeIndex}
                aria-label={t.goTo(i + 1)}
                onClick={() => scrollToIndex(i)}
                className={cn(
                  'relative h-2 overflow-hidden rounded-full bg-[#d1d1d1] transition-[width] duration-300 ease-out',
                  i === activeIndex ? 'w-[22px]' : 'w-2',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-0 rounded-full bg-gradient-to-r from-steel to-blue transition-opacity duration-300',
                    i === activeIndex ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </button>
            ))}
          </div>
        )}
        </Reveal>
      </Container>
    </section>
  )
}
