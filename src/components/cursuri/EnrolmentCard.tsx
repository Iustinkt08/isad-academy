'use client'

import Link from 'next/link'
import { useState } from 'react'

import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries'
import { localePath, type Locale } from '@/lib/i18n/config'

import { NewsletterForm } from '../layout/NewsletterForm'

/**
 * EnrolmentCard — the course page's sticky right column: edition selector, EB/Standard
 * price windows, quantity stepper, Enrol CTA + the trainer mini-card.
 * Redesign from the owner's Figma extract (node 3805:69, v3 2026-07-14). STYLE RULES
 * (owner):
 * — NO blue stroke ANYWHERE. Borders stay grey (`border-line`/`border-line-soft`).
 *   The selected edition shows through a DROP SHADOW + subtle gray-blue background
 *   (#f0f5f9), never a colored border. Blue only as text accents and gradient fills.
 * — The Early Bird price is GREEN (#2e8c57). VAT: none (isad.academy not VAT registered).
 * — "Only X seats left" is a FLOATING CHIP at the card's TOP-RIGHT, sticking OUT of the
 *   card (-top-[18px] -right-4 — exact owner position; nothing up the tree may clip it
 *   with overflow-hidden). White bg + drop shadow, dark-red dot, red gradient ANIMATED
 *   text (`text-seats-alert`, src/styles/tokens.css). Shown only for the SELECTED
 *   edition, below the threshold (siteSettings.seatsThreshold).
 *
 * §6/§8 states kept from the previous integration: sold-out row → disabled + "Sold out";
 * ALL upcoming sold out → the CTA is replaced by the notify-me newsletter block;
 * selected edition without an active price window → disabled "Enrolment coming soon".
 * Windows are display-only and date-driven (server-computed).
 *
 * CTA contract (owner 2026-07-14; the checkout page accepts these params):
 *   /checkout?edition=<sessionId>&qty=<qty>
 */

export type Edition = {
  id: number
  dateRange: string // "28.07 – 29.07.2026"
  seatsLeft: number
  seatsThreshold: number // siteSettings.seatsThreshold (default 5)
  soldOut: boolean
  /** True when a price window (EB or Standard) is active right now (§8). */
  hasActiveWindow: boolean
  /** Present only while the Early Bird window is the one active now. */
  earlyBird?: { price: string; until: string } | null
  standard?: { price: string; from?: string | null } | null
}

const MAX_SEATS = 8
const EB_GREEN = 'text-[#2e8c57]'

function editionSummary(e: Edition, t: Dictionary['courseDetail']) {
  if (e.earlyBird) {
    return (
      <>
        <span className={`font-medium ${EB_GREEN}`}>
          {t.summaryEarlyBird(e.earlyBird.price, e.earlyBird.until)}
        </span>
        {e.standard ? ` · ${t.summaryStandard(e.standard.price)}` : ''}
      </>
    )
  }
  if (e.standard && e.hasActiveWindow) return t.summaryStandard(e.standard.price)
  return t.opensLater
}

export default function EnrolmentCard({
  locale,
  editions,
}: {
  locale: Locale
  editions: Edition[]
}) {
  const t = getDictionary(locale).courseDetail
  const firstOpen = editions.find((e) => !e.soldOut) ?? editions[0]
  const [selectedId, setSelectedId] = useState<number | undefined>(firstOpen?.id)
  const [qty, setQty] = useState(1)

  const selected = editions.find((e) => e.id === selectedId) ?? firstOpen
  const allSoldOut = editions.length > 0 && editions.every((e) => e.soldOut)
  // Floating scarcity chip — SELECTED edition only, strictly below the threshold (§4/§6).
  const showChip = !!selected && !selected.soldOut && selected.seatsLeft < selected.seatsThreshold

  return (
    <div className="relative flex w-full flex-col gap-4 rounded-[24px] border-[6px] border-line-soft bg-white p-6 shadow-[3px_9px_24px_rgba(77,77,77,0.05)] lg:px-9 lg:py-8">
      {/* Floating chip — "Only X seats left", overlapping the top-right corner */}
      {showChip && (
        <div className="absolute -right-4 -top-[18px] z-20 flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-[0_6px_18px_rgba(0,0,0,0.12)]">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-[#8b1a1a]" />
          <span className="text-seats-alert text-[13px] font-semibold">
            {t.onlySeatsLeft(selected.seatsLeft)}
          </span>
        </div>
      )}

      <h2 className="text-[20px] font-medium tracking-[-0.8px] text-ink">{t.chooseEdition}</h2>

      {editions.map((e) => {
        const active = e.id === selected?.id && !e.soldOut
        return (
          <button
            key={e.id}
            type="button"
            onClick={() => !e.soldOut && setSelectedId(e.id)}
            disabled={e.soldOut}
            aria-pressed={active}
            data-testid="edition"
            className={`flex w-full flex-col gap-1.5 rounded-2xl border border-line px-5 py-4 text-left transition-shadow ${
              e.soldOut
                ? 'cursor-not-allowed bg-line-soft/60 opacity-60'
                : active
                  ? 'bg-[#f0f5f9] shadow-[0_8px_24px_rgba(77,77,77,0.10)]'
                  : 'bg-white hover:shadow-[0_4px_14px_rgba(77,77,77,0.06)]'
            }`}
          >
            <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span
                className={`text-[16px] tracking-[-0.4px] text-ink ${
                  active ? 'font-semibold' : 'font-medium'
                }`}
              >
                {e.dateRange}
              </span>
              {e.soldOut && (
                <span className="text-[12.5px] font-medium text-grey-600">{t.soldOut}</span>
              )}
            </span>
            {active && e.earlyBird ? (
              <>
                <span className="flex flex-wrap items-center gap-3">
                  <span className={`text-[26px] font-semibold tracking-[-0.8px] ${EB_GREEN}`}>
                    {e.earlyBird.price}
                  </span>
                  <span
                    className={`rounded-[20px] bg-white px-2.5 py-1 text-[11.5px] font-medium shadow-[0_1px_4px_rgba(0,0,0,0.08)] ${EB_GREEN}`}
                  >
                    {t.ebBadge(e.earlyBird.until)}
                  </span>
                </span>
                {e.standard && (
                  <span className="text-[13px] text-grey-600">
                    {t.summaryStandard(e.standard.price)}
                    {e.standard.from ? ` · ${t.fromDate(e.standard.from)}` : ''}
                  </span>
                )}
              </>
            ) : active && e.hasActiveWindow && e.standard ? (
              <span className="flex items-center gap-3">
                <span className="text-[26px] font-semibold tracking-[-0.8px] text-blue">
                  {e.standard.price}
                </span>
                <span className="rounded-[20px] bg-white px-2.5 py-1 text-[11.5px] font-medium text-blue shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
                  {t.standardLabel}
                </span>
              </span>
            ) : (
              <span className="text-[13px] text-grey-600">{editionSummary(e, t)}</span>
            )}
          </button>
        )
      })}

      {/* Discounts note — stacking policy is stackAll (B3, seeded) */}
      <p className="rounded-xl bg-line-soft px-3.5 py-2.5 text-[12.5px] leading-[18px] text-grey-600">
        {t.discountsNote}
      </p>

      {allSoldOut ? (
        /* Every upcoming edition is sold out → notify-me (§6), same newsletter pattern */
        <div>
          <p className="text-[15px] font-semibold text-ink">{t.notifyTitle}</p>
          <p className="mb-3 mt-1 text-[13px] text-grey-600">{t.notifyBody}</p>
          <NewsletterForm tone="light" locale={locale} />
        </div>
      ) : (
        <>
          {/* Quantity + CTA */}
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-full bg-line-soft p-1.5">
              <button
                type="button"
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="flex size-[34px] items-center justify-center rounded-full text-[15px] font-medium text-grey-600"
                aria-label={t.fewerSeats}
              >
                −
              </button>
              <span
                aria-live="polite"
                className="flex size-[34px] items-center justify-center rounded-full bg-white text-[15px] font-semibold text-ink shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
              >
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty(Math.min(MAX_SEATS, qty + 1))}
                className="flex size-[34px] items-center justify-center rounded-full text-[15px] font-medium text-grey-600"
                aria-label={t.moreSeats}
              >
                +
              </button>
            </div>
            {selected && selected.hasActiveWindow && !selected.soldOut ? (
              <Link
                href={`${localePath(locale, '/checkout')}?edition=${selected.id}&qty=${qty}`}
                className="flex-1 rounded-full bg-gradient-to-b from-steel to-blue to-[80%] pb-[13px] pt-3 text-center text-[16px] font-medium text-white shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-transform hover:scale-[1.02]"
              >
                {t.enrolNow} →
              </Link>
            ) : (
              /* Selected edition has no active price window (§8) → not purchasable */
              <span
                aria-disabled="true"
                className="flex-1 cursor-not-allowed rounded-full bg-line-soft pb-[13px] pt-3 text-center text-[16px] font-medium text-grey-600"
              >
                {t.comingSoonTitle}
              </span>
            )}
          </div>

          <p className="text-[12px] leading-[18px] text-grey-600">
            {t.vatNote}
            <br />
            {t.refundNote}
          </p>
        </>
      )}
    </div>
  )
}

/**
 * The trainer mini-card under the EnrolmentCard (Figma: Card / Expert Mini).
 * Photo: the Figma drop pointed at /images/expert/silviu-gresoi.jpg, which does not
 * exist in public/ — we keep the existing site asset /silviu-gresoi.png.
 */
export function ExpertMiniCard({
  locale,
  photo = '/silviu-gresoi.png',
}: {
  locale: Locale
  photo?: string
}) {
  const t = getDictionary(locale).courseDetail
  return (
    <div className="flex w-full items-center gap-3.5 rounded-[24px] bg-line-soft px-6 py-5 lg:px-7 lg:py-[22px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo} alt="Dr. Silviu Gresoi" className="size-14 rounded-full object-cover" />
      <div className="min-w-0">
        <p className="text-[15px] font-medium tracking-[-0.3px] text-ink">
          Dr. Silviu Gresoi, PhD, CFE
        </p>
        <p className="text-[12.5px] text-grey-600">{t.expertRole}</p>
      </div>
    </div>
  )
}
