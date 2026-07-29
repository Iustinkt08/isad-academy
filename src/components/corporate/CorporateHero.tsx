import PillTag from '../PillTag'
import { Container } from '../ui/Container'
import { Reveal } from '../ui/Reveal'
import type { Locale } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/dictionaries'

/**
 * Corporate / Hero — "Help your organization adopt AI responsibly."
 * Redesign 1:1 from the owner's Figma extract (node 3790:3626, Page / Corporate 3790:3624):
 * PillTag badge, 54px two-tone SemiBold title (period inside the gradient), subtitle,
 * dual CTA. The client-logo strip stays REMOVED (owner redesign).
 *
 * Deviations from the raw extract, on purpose:
 *  - tokens mapped to tokens.css (`blue`/`steel`/`ink`/`grey-600`/`line`/`surface-subtle`,
 *    `rounded-full`) — no new hex values;
 *  - NO blue strokes (owner): the primary CTA swaps the extract's `border-brand-deep` for
 *    a transparent border (same geometry as the grey-bordered secondary), the secondary
 *    keeps the grey `border-line`;
 *  - the secondary CTA anchors to the training-topics section (`#topics`, per the extract)
 *    instead of the catalog;
 *  - the title clamps below desktop (quality floor, CLAUDE.md §15).
 */

export default function CorporateHero({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).corporate.hero

  return (
    <section className="bg-surface-subtle">
      {/* Content aligned to the shared Container (navbar-logo line — owner 2026-07-13);
          Reveal = scroll-triggered fade + blur */}
      <Container className="pb-[70px] pt-16 lg:pt-20">
        <Reveal className="flex flex-col items-center gap-[22px]">
          <PillTag>{t.pill}</PillTag>

          {/* Title — gradient on the highlighted phrase, period included (extract). */}
          <h1 className="max-w-[700px] text-center text-[min(8.72vw,34px)] font-semibold leading-[1.15] tracking-[-1.5px] text-ink md:text-[clamp(34px,4.5vw,54px)]">
            {t.titleTop}
            <br />
            {t.titleBottomPrefix}{' '}
            <span className="text-gradient-brand tracking-[-2.16px]">
              {t.titleBottomHighlight}
            </span>
            {'.'}
          </h1>

          <p className="max-w-[760px] text-center text-[min(4.36vw,17px)] leading-[1.6] text-grey-600">
            {t.subtitle}
          </p>

          {/* Dual CTA — emphasis via gradient fill + drop shadow, never a colored stroke */}
          <div className="flex flex-wrap items-center justify-center gap-[14px] pt-2">
            <a
              href="#corporate-form"
              className="rounded-full border border-[#1C5D99] bg-gradient-to-b from-steel to-blue to-[80%] px-[22px] pb-3 pt-[11px] text-[16px] leading-normal text-white shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-transform hover:scale-[1.03]"
            >
              {t.ctaPrimary}
            </a>
            <a
              href="#topics"
              className="rounded-full bg-white px-[22px] pb-3 pt-[11px] text-[16px] font-medium leading-normal text-ink shadow-[0_0_4.4px_rgba(0,0,0,0.07)] transition-transform hover:scale-[1.03]"
            >
              {t.ctaSecondary}
            </a>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
