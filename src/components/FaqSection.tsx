'use client'

import Link from 'next/link'
import { useState } from 'react'

import { getDictionary } from '../lib/i18n/dictionaries'
import { localePath, type Locale } from '../lib/i18n/config'
import { Reveal } from './ui/Reveal'

/**
 * FAQ Section — "Frequently asked questions."
 * 1:1 from the owner's Figma extract (node 3742:22). Mounted on the homepage AFTER
 * TestimonialsSection. Client component: category tabs + single-open accordion.
 *
 * Content = CMS-driven via the Payload `faqItems` collection (passed in as `items`), with
 * the dictionary Q&A as fallback. Category tabs (owner 2026-07-25): Discover / Learn /
 * Validate / Access — the same keys as the collection's `category` select.
 *
 * Tokens mapped to globals.css (blue/steel/ink/grey-600/ice/line-soft/surface-subtle,
 * rounded-full, text-gradient-brand) — no new hex values; the title clamps below desktop
 * and the tabs/contact strip wrap (quality floor, CLAUDE.md §15).
 */

export type FaqEntry = { q: string; a: string; category: string }

export default function FaqSection({ items, locale }: { items?: FaqEntry[]; locale: Locale }) {
  const dict = getDictionary(locale)
  const t = dict.faqSection
  const categoryLabels = dict.home.faqCategories
  // The fallback Q&A live in the dictionary (RO/EN site); category keys map to the same
  // tab labels the page uses for CMS items, so filtering stays consistent either way.
  const fallback: FaqEntry[] = t.items.map((item: { q: string; a: string; category: string }) => ({
    q: item.q,
    a: item.a,
    category:
      categoryLabels[item.category as keyof typeof categoryLabels] ?? categoryLabels.discover,
  }))
  // Journey-shaped tabs (owner 2026-07-25): Discover → Learn → Validate → Access.
  const categories = [
    t.allQuestions,
    categoryLabels.discover,
    categoryLabels.learn,
    categoryLabels.validate,
    categoryLabels.access,
  ]

  const list = items && items.length > 0 ? items : fallback
  const [category, setCategory] = useState(categories[0])
  const [openIndex, setOpenIndex] = useState(0)

  const visible =
    category === t.allQuestions ? list : list.filter((item) => item.category === category)

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="bg-surface-subtle px-4 py-20 sm:py-[110px]"
    >
      {/* Reveal = scroll-triggered fade + blur (owner 2026-07-13) */}
      <Reveal className="flex flex-col items-center gap-7">
      {/* Two-tone title — 48 SemiBold */}
      <h2
        id="faq-heading"
        className="text-center text-[clamp(32px,4vw,48px)] font-semibold leading-normal tracking-[-1.4px] text-ink"
      >
        {t.headingLead} <span className="text-gradient-brand">{t.headingHighlight}</span>{'.'}
      </h2>
      <p className="text-center text-[16px] text-grey-600">{t.sub}</p>

      {/* Category tabs */}
      <div className="flex flex-wrap justify-center gap-2.5 pt-1">
        {categories.map((name) => {
          const active = name === category
          return (
            <button
              key={name}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setCategory(name)
                setOpenIndex(0)
              }}
              className={`rounded-full px-[18px] py-[9px] text-[14px] font-medium tracking-[-0.3px] transition-colors ${
                active
                  ? 'border border-blue bg-gradient-to-b from-steel to-blue to-[80%] text-white'
                  : 'border border-line bg-white text-ink hover:border-steel'
              }`}
            >
              {name}
            </button>
          )
        })}
      </div>

      {/* Accordion — 800px, one item open at a time. `key={category}` remontează lista la
          schimbarea tabului, iar animate-rise (fade + ridicare) îndulcește tranziția
          (owner 2026-07-26); reduced-motion e tratat global în tokens.css. */}
      <div key={category} className="animate-rise flex w-[800px] max-w-full flex-col gap-3 pt-3">
        {visible.map((item, index) => {
          const open = index === openIndex
          return (
            <div
              key={item.q}
              className={`ease-brand rounded-2xl bg-white transition-all duration-300 ${
                open
                  ? 'border-[1.2px] border-blue px-7 pb-6 pt-5 shadow-[3px_9px_20px_rgba(77,77,77,0.05)]'
                  : 'border-4 border-line-soft px-7 py-[18px]'
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(open ? -1 : index)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-4 text-left"
              >
                <span className="text-[17px] font-medium tracking-[-0.5px] text-ink">
                  {item.q}
                </span>
                <span
                  aria-hidden="true"
                  className={`ease-brand flex size-[30px] shrink-0 items-center justify-center rounded-full text-[16px] font-medium transition-colors duration-300 ${
                    open
                      ? 'bg-gradient-to-b from-steel to-blue to-[80%] text-white'
                      : 'bg-line-soft text-ink'
                  }`}
                >
                  {open ? '−' : '+'}
                </span>
              </button>
              {/* Animated expansion (owner 2026-07-13): the answer wrapper eases between
                  0fr and 1fr grid rows, so the box GROWS smoothly instead of snapping. */}
              <div
                className={`ease-brand grid transition-[grid-template-rows,opacity] duration-300 ${
                  open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
                aria-hidden={!open || undefined}
              >
                <div className="min-h-0 overflow-hidden">
                  <hr className="my-3.5 border-ice" />
                  <p className="text-[14.5px] leading-[23px] text-grey-600">{item.a}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Contact strip */}
      <div className="flex w-[800px] max-w-full flex-wrap items-center justify-between gap-4 rounded-2xl bg-line-soft py-[18px] pl-7 pr-5">
        <div>
          <p className="text-[16px] font-medium tracking-[-0.5px] text-ink">
            {t.stillQuestions}
          </p>
          {/* No response-time promise (§6) */}
          <p className="text-[13.5px] text-grey-600">{t.contactSub}</p>
        </div>
        <Link
          href={localePath(locale, '/contact')}
          className="rounded-full border border-blue bg-gradient-to-b from-steel to-blue to-[80%] px-[18px] pb-[11px] pt-2.5 text-[14px] font-medium text-white transition-transform hover:scale-[1.03]"
        >
          {t.contactCta}
        </Link>
      </div>
      </Reveal>
    </section>
  )
}
