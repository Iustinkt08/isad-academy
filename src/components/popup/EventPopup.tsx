/**
 * EventPopup — popup-ul de eveniment afișat la intrarea pe site („jumătate de
 * ecran"). RESPONSIVE + 3 STĂRI.
 * Desktop (≥lg): 1:1 cu Figma 4033-156 (info) / 4034-156 (form) — modal 720.
 * Mobil (<lg):  1:1 cu Figma 4035-156 / 4035-201 — modal 350 centrat.
 *
 * Stări: INFO (timer până la event, titlu, descriere, speakeri, CTA „Secure
 * your spot") → FORM (First name, Last name, Email, Occupation — dropdown SAU
 * scriere liberă) → SUCCESS (scurt mesaj).
 *
 * TOT CONȚINUTUL VINE DIN BACKEND (Payload — globalul `eventPopup`): titlu,
 * segmentul gradient, descriere, data evenimentului, speakeri, opțiunile de
 * ocupație, etichetele CTA. UI microcopy vine din dicționar (site bilingv)
 * prin `labels`. NIMIC hardcodat aici.
 * (Chip-ul „Only X seats left" a fost SCOS — decizie owner 2026-07-28.)
 *
 * Comportament (owner 2026-08-08): închiderea manuală ascunde pop-up-ul doar pe
 * SESIUNEA curentă (sessionStorage) — la o vizită ulterioară reapare; înscrierea
 * îl oprește definitiv (localStorage). Apare după ~2.5s de la intrare; se
 * închide cu X, cu „Maybe later", cu Escape sau cu click pe overlay; blochează
 * scroll-ul paginii și ține focusul în modal cât e deschis. Cheia
 * `isad-event-popup-off` = kill-switch (folosită de suita e2e / QA).
 *
 * Timerul e REAL — numără invers până la `eventDate`, actualizat la secundă.
 * TOATE valorile sunt EXPLICITE (px/hex). Client component.
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  decideVisibility,
  isKillSwitchOn,
  markDismissed,
  markRegistered,
  readPopupState,
} from '@/lib/events/popupStorage'
import { HONEYPOT_FIELD } from '@/lib/events/honeypot'
import type { Locale } from '@/lib/i18n/config'

export type EventSpeaker = { name: string; role: string; photo?: string | null }

export type EventPopupData = {
  slug: string //           cheia din localStorage și din URL-ul de înscriere
  displayVersion: number // crescut de „Force re-show" — reafișează celor care l-au închis
  showDelaySeconds: number
  titlePlain: string //     ex. „AI Governance "
  titleGradient: string //  ex. „in Practice."
  description: string
  eventDate: string //      ISO — ținta timerului
  metaLine: string //       ex. „Thu 14 Aug 2026 · 18:00 (EEST) · Live on Zoom"
  speakers: EventSpeaker[]
  ctaLabel?: string | null //  default labels.ctaDefault
  joinLabel?: string | null // default labels.joinDefault
  occupations: string[] //  opțiunile din dropdown
  newsletterOptInEnabled: boolean
  newsletterConsentText: string
}

/** UI microcopy (dicționarul `eventPopup` — EN/RO). Conținutul de EVENIMENT nu e aici. */
export type EventPopupLabels = {
  livePill: string
  close: string
  timer: { days: string; hours: string; min: string; sec: string }
  speakers: string
  ctaDefault: string
  maybeLater: string
  formTitlePlain: string
  formTitleGradient: string
  formIntroSuffix: string
  firstName: string
  lastName: string
  emailPlaceholder: string
  occupationPlaceholder: string
  joinDefault: string
  sending: string
  privacyNote: string
  back: string
  successTitle: string
  successBody: string
  done: string
  errorGeneric: string
}

function useCountdown(target: string, labels: EventPopupLabels['timer']) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  return useMemo(() => {
    const diff = Math.max(0, new Date(target).getTime() - now)
    const d = Math.floor(diff / 86_400_000)
    const h = Math.floor((diff % 86_400_000) / 3_600_000)
    const m = Math.floor((diff % 3_600_000) / 60_000)
    const s = Math.floor((diff % 60_000) / 1000)
    const pad = (n: number) => String(n).padStart(2, '0')
    return [
      { value: pad(d), label: labels.days },
      { value: pad(h), label: labels.hours },
      { value: pad(m), label: labels.min },
      { value: pad(s), label: labels.sec },
    ]
  }, [target, now, labels])
}

/** Pill cu inel gradient */
function Pill({ label }: { label: string }) {
  return (
    <span className="w-fit shrink-0 rounded-[26px] bg-[linear-gradient(90deg,#1c5d99_0%,#46d3f6_25%,#1c5d99_50%,#46d3f6_75%,#1c5d99_100%)] p-[3px]">
      <span className="flex items-center whitespace-nowrap rounded-[23px] bg-white px-3.5 py-[2px] text-[min(3.33vw,13px)] font-medium leading-[1.6] text-black lg:px-4 lg:text-[15px] lg:leading-[23px]">
        {label}
      </span>
    </span>
  )
}

const inputCls =
  'w-full rounded-[12px] border border-[#e6e6e6] bg-white px-3.5 py-3 text-[13.5px] leading-[19px] text-[#222222] placeholder:text-[#959595] focus:border-[#bdbdbd] focus:outline-none lg:rounded-[14px] lg:px-[18px] lg:py-[13px] lg:text-[15px] lg:leading-[22px]'

export default function EventPopup({
  data,
  labels,
  locale,
}: {
  data: EventPopupData
  labels: EventPopupLabels
  /** Trimis la înscriere ca emailul de confirmare la newsletter să fie în limba potrivită. */
  locale: Locale
}) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<'info' | 'form' | 'success'>('info')
  const [sending, setSending] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const countdown = useCountdown(data.eventDate, labels.timer)

  /* Regulile de afișare stau în `decideVisibility` (lib/events/popupStorage) — pure și
     testate acolo. Aici doar le aplicăm, după delay-ul configurat din dashboard.
     `?event-popup=preview` (QA/owner) forțează afișarea, ignorând tot. */
  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get('event-popup') === 'preview'
    if (!preview) {
      if (isKillSwitchOn()) return
      if (!decideVisibility(readPopupState(data.slug), data)) return
    }
    const t = setTimeout(() => setOpen(true), Math.max(0, data.showDelaySeconds) * 1000)
    return () => clearTimeout(t)
  }, [data])

  const dismiss = useCallback(() => {
    markDismissed(data.slug, data.displayVersion)
    setOpen(false)
  }, [data.slug, data.displayVersion])

  /* Escape + scroll-lock + focus în modal (a11y) cât timp e deschis */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
      if (e.key === 'Tab' && modalRef.current) {
        // focus trap minimal: Tab pe ultimul element sare pe primul (și invers)
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (!first || !last) return
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    modalRef.current?.querySelector<HTMLElement>('button')?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, dismiss])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setSending(true)
    setSubmitError(null)
    try {
      const response = await fetch(
        `/api/event-popups/${encodeURIComponent(data.slug)}/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: String(f.get('firstName') ?? ''),
            lastName: String(f.get('lastName') ?? ''),
            email: String(f.get('email') ?? ''),
            occupation: String(f.get('occupation') ?? ''),
            // Bifa lipsește din FormData când nu e bifată — de aceea comparația explicită,
            // nu o conversie truthy care ar trimite `""` ca „nu".
            newsletterOptIn: f.get('newsletterOptIn') === 'on',
            locale,
            [HONEYPOT_FIELD]: String(f.get(HONEYPOT_FIELD) ?? ''),
          }),
        },
      )
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        setSubmitError(body?.error ?? labels.errorGeneric)
        return
      }
      setPhase('success')
      // Oprire definitivă: nu-i mai arătăm pop-up-ul nimănui care s-a înscris.
      markRegistered(data.slug, data.displayVersion)
    } catch {
      setSubmitError(labels.errorGeneric)
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-5"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <button aria-label={labels.close} onClick={dismiss} className="absolute inset-0 bg-black/45" />

      {/* Modalul — 350 mobil / 720 desktop.
          `lg:max-w-[720px]` NU e redundant lângă `lg:w-[720px]`: fără el, `max-w-[350px]` de
          pe mobil rămâne în vigoare și pe desktop, iar `max-width` bate `width` — modalul
          rămânea la 350px pe ecran mare, cu ultima casetă din countdown tăiată
          (bug preexistent, raportat de owner 2026-08-07). */}
      <div
        ref={modalRef}
        className="relative max-h-[90dvh] w-full max-w-[350px] overflow-y-auto rounded-[24px] border-[6px] border-[#f6f6f6] bg-white px-5 py-6 shadow-[24px_80px_50px_rgba(77,77,77,0.02),10px_36px_37px_rgba(77,77,77,0.03),3px_9px_20px_rgba(77,77,77,0.03)] lg:w-[720px] lg:max-w-[720px] lg:p-10"
      >
        {/* Close X */}
        <button
          type="button"
          onClick={dismiss}
          aria-label={labels.close}
          className="absolute right-3.5 top-3.5 flex size-7 items-center justify-center rounded-full bg-[#f6f6f6] text-[12px] font-medium text-[#595959] transition-colors hover:bg-[#ececec] lg:right-5 lg:top-5 lg:size-8 lg:text-[13px]"
        >
          ✕
        </button>

        {/* Pe desktop conținutul se centrează (owner 2026-08-07). Pe mobil rămâne la stânga:
            la 350px lățime centrarea ar rupe rândurile de text în trepte inegale. */}
        {phase === 'info' && (
          <div className="flex flex-col gap-3.5 lg:items-center lg:gap-[18px] lg:text-center">
            <Pill label={labels.livePill} />
            <h2 className="text-[22px] font-semibold leading-7 tracking-[-0.8px] text-[#222222] lg:text-[32px] lg:leading-10 lg:tracking-[-1px]">
              {data.titlePlain}
              <span className="bg-[linear-gradient(90deg,#407ea2_0%,#1c5d99_100%)] bg-clip-text text-transparent">
                {data.titleGradient}
              </span>
            </h2>
            <p className="line-clamp-4 text-[13.5px] leading-5 text-[#595959] lg:text-[15px] lg:leading-6">
              {data.description}
            </p>

            {/* Timerul — 4 casete, actualizat la secundă */}
            <div className="flex gap-2 lg:gap-2.5">
              {countdown.map((u) => (
                <div
                  key={u.label}
                  className="flex h-14 flex-1 flex-col items-center justify-center rounded-[12px] bg-[#f6f6f6] lg:h-16 lg:w-[76px] lg:flex-none"
                >
                  <span className="text-[18px] font-semibold leading-6 tracking-[-0.5px] text-[#222222] lg:text-[22px] lg:leading-7">
                    {u.value}
                  </span>
                  <span className="text-[9.5px] font-medium tracking-[0.8px] text-[#959595] lg:text-[10.5px] lg:tracking-[1px]">
                    {u.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Speakerii — stivuiți pe mobil, pe un rând pe desktop */}
            <div className="flex flex-col gap-2 lg:gap-2.5">
              <p className="text-[11.5px] font-medium tracking-[0.2px] text-[#959595] lg:text-[12px]">
                {labels.speakers}
              </p>
              <div className="flex flex-col gap-2 lg:flex-row lg:justify-center lg:gap-7">
                {data.speakers.map((s) => (
                  <div key={s.name} className="flex items-center gap-2.5">
                    {s.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.photo}
                        alt={s.name}
                        className="size-10 shrink-0 rounded-full object-cover lg:size-11"
                      />
                    ) : (
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f6f6f6] text-[13px] font-semibold text-[#1c5d99] lg:size-11 lg:text-[14px]">
                        {s.name
                          .split(' ')
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join('')}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium leading-5 text-[#222222] lg:text-[14px] lg:leading-[21px]">
                        {s.name}
                      </p>
                      <p className="line-clamp-1 text-[12px] leading-[17px] text-[#959595] lg:text-[12.5px] lg:leading-[18px]">
                        {s.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="line-clamp-2 text-[12px] leading-[18px] text-[#959595] lg:text-[13px] lg:leading-5">
              {data.metaLine}
            </p>

            <div className="flex flex-col items-center gap-3 lg:flex-row lg:gap-4">
              <button
                type="button"
                onClick={() => setPhase('form')}
                className="w-full rounded-[999px] bg-gradient-to-b from-[#407ea2] to-[#1c5d99] to-[80%] pb-[13px] pt-3 text-[15px] font-medium text-white shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-transform hover:scale-[1.02] lg:w-auto lg:px-[22px] lg:pb-3 lg:pt-[11px] lg:text-[16px]"
              >
                {data.ctaLabel || labels.ctaDefault}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="text-[13px] font-medium text-[#959595] transition-colors hover:text-[#595959] lg:text-[14px]"
              >
                {labels.maybeLater}
              </button>
            </div>
          </div>
        )}

        {phase === 'form' && (
          <form onSubmit={onSubmit} className="flex flex-col gap-3 lg:gap-4">
            <Pill label={labels.livePill} />
            <h2 className="text-[22px] font-semibold leading-7 tracking-[-0.8px] text-[#222222] lg:text-[32px] lg:leading-10 lg:tracking-[-1px]">
              {labels.formTitlePlain}{' '}
              <span className="bg-[linear-gradient(90deg,#407ea2_0%,#1c5d99_100%)] bg-clip-text text-transparent">
                {labels.formTitleGradient}
              </span>
            </h2>
            <p className="line-clamp-2 text-[12.5px] leading-[19px] text-[#595959] lg:text-[14px] lg:leading-[22px]">
              {data.titlePlain}
              {data.titleGradient} · {data.metaLine}: {labels.formIntroSuffix}
            </p>

            <div className="flex flex-col gap-3 lg:flex-row">
              <input name="firstName" required placeholder={labels.firstName} className={inputCls} />
              <input name="lastName" required placeholder={labels.lastName} className={inputCls} />
            </div>
            <input
              name="email"
              type="email"
              required
              placeholder={labels.emailPlaceholder}
              className={inputCls}
            />
            {/* Ocupația — dropdown SAU scriere liberă (input + datalist) */}
            <input
              name="occupation"
              list="occupation-options"
              placeholder={labels.occupationPlaceholder}
              className={inputCls}
            />
            <datalist id="occupation-options">
              {data.occupations.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>

            {/* Newsletter — NEBIFAT din construcție (spec §8). O bifă pre-bifată nu e
                consimțământ, e o capcană: GDPR cere o acțiune afirmativă. Textul vine din
                CMS (localizat) și se salvează ca snapshot pe înscriere. Bifa NU abonează pe
                nimeni — declanșează doar emailul de double opt-in. */}
            {data.newsletterOptInEnabled && (
              <label className="flex cursor-pointer items-start gap-2.5 pt-0.5">
                <input
                  type="checkbox"
                  name="newsletterOptIn"
                  className="mt-[3px] h-4 w-4 shrink-0 cursor-pointer accent-[#1c5d99]"
                />
                <span className="text-[12.5px] leading-[18px] text-[#595959] lg:text-[13px]">
                  {data.newsletterConsentText}
                </span>
              </label>
            )}

            {/* Honeypot anti-spam — invizibil pentru oameni, auto-completat de boți */}
            <input
              type="text"
              name={HONEYPOT_FIELD}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />

            {submitError && (
              <p role="alert" className="text-[12.5px] font-medium text-[#8b1a1a]">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-[999px] bg-gradient-to-b from-[#407ea2] to-[#1c5d99] to-[80%] pb-[13px] pt-3 text-[15px] font-medium text-white shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-transform hover:scale-[1.02] disabled:opacity-60 lg:text-[16px]"
            >
              {sending ? labels.sending : data.joinLabel || labels.joinDefault}
            </button>

            <div className="flex flex-col items-center gap-2 lg:flex-row lg:justify-between">
              <p className="text-center text-[11.5px] leading-[17px] text-[#959595] lg:text-[12px] lg:leading-[18px]">
                {labels.privacyNote}
              </p>
              <button
                type="button"
                onClick={() => setPhase('info')}
                className="text-[12.5px] font-medium text-[#959595] transition-colors hover:text-[#595959] lg:text-[13px]"
              >
                {labels.back}
              </button>
            </div>
          </form>
        )}

        {phase === 'success' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center lg:gap-4 lg:py-10">
            <span className="flex size-12 items-center justify-center rounded-full bg-[linear-gradient(90deg,#1c5d99_0%,#46d3f6_25%,#1c5d99_50%,#46d3f6_75%,#1c5d99_100%)] p-[3px]">
              <span className="flex size-full items-center justify-center rounded-full bg-white">
                <svg aria-hidden width="20" height="16" viewBox="0 0 12 10" fill="none">
                  <path
                    d="M1.7 5.3L4.5 8.1L10.3 1.7"
                    stroke="url(#ep-chk)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <defs>
                    <linearGradient
                      id="ep-chk"
                      x1="1.7"
                      y1="1.7"
                      x2="10.3"
                      y2="8.1"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#1C5D99" />
                      <stop offset="1" stopColor="#407EA2" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </span>
            <p className="text-[18px] font-medium tracking-[-0.5px] text-[#222222] lg:text-[20px]">
              {labels.successTitle}
            </p>
            <p className="text-[13px] leading-[19px] text-[#959595] lg:text-[14px]">
              {labels.successBody}
            </p>
            <button
              type="button"
              onClick={dismiss}
              className="mt-1 rounded-[999px] bg-gradient-to-b from-[#407ea2] to-[#1c5d99] to-[80%] px-[22px] pb-3 pt-[11px] text-[15px] font-medium text-white shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-transform hover:scale-[1.03]"
            >
              {labels.done}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
