/**
 * Corporate / Benefits — "One expert. Three ways to train your team." + industries.
 * Redesign 1:1 from the owner's Figma extract (v3: node 3817:182 / clean 3806:39).
 * Changes vs the previous version: the cards open with a gradient CHECKMARK (steel → deep)
 * instead of the gradient dot, and emphasis comes from the DROP SHADOW alone (borderless) —
 * never a blue stroke (owner rule). The section carries `id="topics"` — the hero's
 * "See training topics" CTA anchors here.
 *
 * Tokens mapped to tokens.css (blue/steel/ink/grey-600/line/line-soft/surface-subtle);
 * the title clamps below desktop and the card row goes fluid 3-up → stacked
 * (quality floor, CLAUDE.md §15).
 */

import { Container } from '../ui/Container'
import { Reveal } from '../ui/Reveal'
import type { Locale } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/dictionaries'

/** Gradient checkmark (steel → deep, brand palette) — one unique gradient id per card. */
function CheckIcon({ id }: { id: string }) {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 8.5L6.5 12L13 3.5"
        stroke={`url(#${id})`}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id={id} x1="3" y1="3" x2="13" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#407EA2" />
          <stop offset="1" stopColor="#1C5D99" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function CorporateBenefits({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).corporate.benefits

  return (
    <section id="topics" className="bg-surface-subtle">
      {/* Content aligned to the shared Container (navbar-logo line — owner 2026-07-13);
          the 3×347px Figma row goes fluid inside it (3-up desktop, stacked mobile). */}
      <Container className="pb-10 pt-[60px]">
        <Reveal className="flex flex-col items-center gap-9">
          {/* Two-tone title — 40 SemiBold, period in INK, outside the gradient (owner 2026-07-26) */}
          <h2 className="text-center text-[clamp(28px,3.4vw,40px)] font-semibold leading-normal tracking-[-1.2px] text-ink">
            {t.titlePlain}{' '}
            <span className="text-gradient-brand tracking-[-1.6px]">{t.titleHighlight}</span>{'.'}
          </h2>

          {/* Benefit cards (v3, owner 2026-07-14): BORDERLESS, plain white + soft shadow;
              on hover a blue wash rises from the bottom (same pattern as the home course
              cards) + a stronger shadow. Opacity-only transition — subtle enough to keep
              under prefers-reduced-motion. */}
          <div className="grid w-full grid-cols-1 gap-[30px] md:grid-cols-3">
            {t.items.map((benefit: { title: string; text: string }, index: number) => (
              <article
                key={benefit.title}
                className="group relative flex w-full flex-col items-start gap-3 overflow-hidden rounded-[24px] border-[6px] border-[#F6F6F6] bg-white px-9 pb-[34px] pt-8 shadow-[3px_9px_20px_rgba(77,77,77,0.03)] transition-shadow duration-300 hover:shadow-[3px_14px_34px_rgba(77,77,77,0.12)]"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-[120px] bg-gradient-to-t from-[#b9cde3]/70 via-[#dbe6f0]/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
                <div className="relative z-10 flex flex-col items-start gap-3">
                  <CheckIcon id={`corporate-benefit-check-${index}`} />
                  <h3 className="text-[20px] font-medium tracking-[-0.8px] text-ink">
                    {benefit.title}
                  </h3>
                  <p className="text-[15px] leading-[23px] text-grey-600">{benefit.text}</p>
                </div>
              </article>
            ))}
          </div>

          {/* Industries */}
          <div className="flex flex-col items-center gap-4 pt-6">
            <p className="text-[14px] font-semibold text-blue">{t.idealFor}</p>
            <ul className="flex flex-wrap justify-center gap-2.5">
              {t.industries.map((name: string) => (
                <li
                  key={name}
                  className="flex items-center rounded-[20px] bg-white px-4 py-[7px] shadow-[0_0_7px_rgba(0,0,0,0.09)]"
                >
                  <span className="text-[14px] font-medium tracking-[-0.4px] text-ink">
                    {name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
