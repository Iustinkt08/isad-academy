import Link from 'next/link'

import { getDictionary, type Dictionary, type Locale } from '../../lib/i18n'
import Certificate from '../Certificate'
import { Container } from '../ui/Container'

/*
 * Home hero — 1:1 from the owner's Figma extract (HeroSection.tsx, node 3622:4289,
 * 2026-07-13): 54/59.4 SemiBold title (tracking −2.16 @54px = −0.04em, so it scales with the
 * clamp), gradient CTA pill, and a fan of three DOM certificates (620×371, radius 40 —
 * centre clear, sides blurred 4px at scale 0.834, offset ±488px and 41px lower) on a fixed
 * 1920px stage that scales 0.55 / 0.75 / 1 by breakpoint (1:1 at desktop).
 *
 * Deviations from the raw extract, on purpose (owner decisions that post-date it):
 *  - the title keeps the brand-gradient tail + black "." (owner 2026-07-12; extract is
 *    all-ink) and the CMS subtitle stays (extract has none);
 *  - the blurred Ellipse-38 arc keeps the owner's verbatim Figma dev-mode gradient
 *    (#1C5D99 → #407EA2 → #FFFFFF) anchored at the viewport bottom so its white edge melts
 *    into the next section (owner 2026-07-12/13) — the extract's opaque blue dome has no
 *    white melt; the section stays bg-white for the same seam reason;
 *  - certificate copy stays dictionary-driven (RO/EN switcher) and the course line keeps
 *    "AI Management Systems" — the extract's "AI FRAUD MANAGEMENT" is flagged unconfirmed
 *    in the extract itself and misnames ISO/IEC 42001 (CLAUDE.md §9 R1);
 *  - the icon is /brand/icon-black.svg (no plain icon.svg exists in public/brand/).
 */

/**
 * Dict → shared-Certificate adapter. The certificate DOM itself now lives in
 * `src/components/Certificate.tsx` (flat string props, shared with the course page's
 * Certification card); this wrapper keeps the hero's i18n (RO/EN dict) and its
 * role="img"/aria/decorative handling exactly where they were — the rendered markup
 * (620×371, rounded-40, same layout) is byte-identical to the old internal version.
 */
function HeroCertificate({
  t,
  className,
  decorative = false,
}: {
  t: Dictionary['hero']['cert']
  className?: string
  decorative?: boolean
}) {
  return (
    <Certificate
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : t.aria}
      aria-hidden={decorative || undefined}
      trainerLabel={t.trainerLabel}
      trainer={t.trainer}
      dateLabel={t.dateLabel}
      date={t.sampleDate}
      certifiesLine={t.certifies}
      studentName={t.sampleName}
      completedLine={t.completed}
      courseTitle={t.course}
      className={className}
    />
  )
}

export function HomeHero({
  locale,
  title,
  subtitle,
  ctaText,
  ctaLink,
}: {
  locale: Locale
  title: string
  subtitle: string
  ctaText: string
  ctaLink: string
}) {
  const dict = getDictionary(locale)

  // Design render: only the FIRST word stays Ink — the rest carries the brand gradient.
  const words = title.trim().split(/\s+/)
  const head = words[0] ?? ''
  const tail = words.slice(1).join(' ')

  return (
    <section className="relative isolate flex min-h-[calc(100dvh-5rem)] flex-col overflow-hidden bg-white">
      {/* Brand glow (design: Ellipse 38) — a large blurred ellipse whose blue TOP edge arcs
          under the certificate fan and melts to white, smoothing the seam into the next
          section. Ported from Figma (1920 frame) as vw so the arc scales with viewport width;
          painted ABOVE the cards (z-20) so their bases fog into the wash. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[75%] z-20 aspect-[2245/1308] w-[min(1500px,140vw)] rounded-[50%] blur-[20px]"
        style={{
          background:
            'linear-gradient(180.71deg, #1C5D99 -5.99%, #407EA2 6.09%, #FFFFFF 20.46%)',
          transform: 'translateX(-50%) rotate(-0.16deg)',
        }}
      />

      <Container className="flex flex-1 flex-col pt-16 sm:pt-20">
        <div className="animate-rise mx-auto flex max-w-[800px] flex-col items-center gap-5 text-center">
          {/* Poppins SemiBold, capped at 48px (owner 2026-07-13: scale titles to the
              container, not the 1920 Figma frame); tracking −0.04em scales with the clamp */}
          <h1 className="text-[clamp(2.125rem,4vw+1rem,48px)] font-semibold leading-[1.1] tracking-[-0.04em] text-ink">
            {head} <span className="text-gradient">{tail}</span>
            <span className="text-ink">.</span>
          </h1>
          <p className="text-lg font-medium tracking-[-0.04em] text-grey-600">{subtitle}</p>
          <Link
            href={ctaLink}
            className="mt-1 rounded-full border border-blue bg-gradient-to-b from-steel to-blue to-[80%] px-[15px] pb-2 pt-[7px] text-center text-[16px] leading-normal text-white shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-transform hover:scale-[1.03]"
          >
            {ctaText}
          </Link>
        </div>

        {/* Certificate fan — extract geometry (±488px, +41px, scale 0.834, blur 4) on a fixed
            1920px stage, scaled per breakpoint so the WHOLE fan (1493px of certificates) fits
            inside the content container (owner 2026-07-13: everything within the navbar-logo
            line, nothing bleeding off). The outer div reserves the scaled height. */}
        <div
          className="animate-rise pointer-events-none relative mt-10 h-[230px] w-full sm:h-[255px] md:h-[200px] lg:h-[265px] xl:h-[300px]"
          style={{ animationDelay: '150ms' }}
        >
          <div className="absolute left-1/2 top-0 origin-top -translate-x-1/2 scale-[0.55] sm:scale-[0.62] md:scale-[0.48] lg:scale-[0.64] xl:scale-[0.72]">
            <div className="relative h-[600px] w-[1920px]">
              {/* Left certificate — fans out from behind the centre card (fade + blur) */}
              <div className="animate-fan-left absolute left-1/2 top-[41px] hidden -translate-x-[calc(50%+488px)] scale-[0.834] blur-[4px] [animation-delay:500ms] md:block">
                <HeroCertificate t={dict.hero.cert} decorative />
              </div>

              {/* Right certificate — fans out from behind the centre card (fade + blur) */}
              <div className="animate-fan-right absolute left-1/2 top-[41px] hidden -translate-x-[calc(50%-488px)] scale-[0.834] blur-[4px] [animation-delay:500ms] md:block">
                <HeroCertificate t={dict.hero.cert} decorative />
              </div>

              {/* Centre certificate — clear, on top */}
              <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2">
                <HeroCertificate t={dict.hero.cert} className="backdrop-blur-[2px]" />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
