import type { ReactNode } from 'react'

/**
 * Legal / Policy — modelul REFOLOSIT de toate cele 3 pagini legale
 * (Privacy, Terms and Conditions, Cookies), în ambele limbi (EN + RO).
 * RESPONSIVE. Desktop (≥lg): 1:1 cu Figma 3977-765 — header centrat + un
 * singur card de conținut de 760 (padding 34/40, spațieri 24).
 * Mobil (<lg): 1:1 cu Figma 3977-800 — card 350 (padding 24, spațieri 18).
 *
 * CONȚINUTUL vine EXCLUSIV din documentele .docx din rădăcina proiectului
 * (vezi src/components/legal/content/) — nimic inventat.
 * TOATE valorile sunt EXPLICITE (px/hex). Server components.
 *
 * Adaptare la arhitectura existentă: wrapper `div` (nu `main`) — layout-ul
 * global montează deja <main id="main-content"> în jurul paginilor.
 */

/** Pill cu inel gradient — text 13 pe mobil, 15 pe desktop */
function GradientPill({ label }: { label: string }) {
  return (
    <span className="w-fit shrink-0 rounded-[26px] bg-[linear-gradient(90deg,#1c5d99_0%,#46d3f6_25%,#1c5d99_50%,#46d3f6_75%,#1c5d99_100%)] p-[3px]">
      <span className="flex items-center whitespace-nowrap rounded-[23px] bg-white px-4 py-[2px] text-[min(3.33vw,13px)] font-medium leading-[1.6] text-black lg:text-[15px] lg:leading-[23px]">
        {label}
      </span>
    </span>
  )
}

/** Învelișul paginii: header centrat + cardul de conținut */
export default function LegalPageLayout({
  pillLabel = 'Legal',
  titlePlain, // ex. „Privacy " / „Terms and " / „Cookie "
  titleGradient, // ex. „Policy." / „Conditions." — segmentul gradient
  lastUpdated, // EXACT din document: „Last updated: …" / „Ultima actualizare: …"
  children,
}: {
  pillLabel?: string
  titlePlain: string
  titleGradient: string
  lastUpdated: string
  children: ReactNode
}) {
  // Punctul final rămâne NEGRU (convenția titlurilor site-ului — owner 2026-07-26):
  // segmentul gradient vine cu „." în valoare, îl separăm aici pentru toate cele 6 variante.
  const gradientWord = titleGradient.replace(/\.$/, '')
  return (
    <div className="flex flex-col items-center gap-6 bg-[#f8f9fa] px-5 pb-16 pt-16 lg:gap-9 lg:px-4 lg:pb-[120px] lg:pt-20">
      <header className="flex flex-col items-center gap-3 lg:gap-3.5">
        <GradientPill label={pillLabel} />
        <h1 className="text-center text-[min(7.18vw,28px)] font-semibold leading-[1.22] tracking-[-1px] text-[#222222] lg:text-[54px] lg:leading-[59.4px] lg:tracking-[-1.5px]">
          {titlePlain}
          <span className="bg-[linear-gradient(90deg,#407ea2_0%,#1c5d99_100%)] bg-clip-text text-transparent">
            {gradientWord}
          </span>
          {'.'}
        </h1>
        <p className="text-center text-[12px] leading-[18px] text-[#959595] lg:text-[14px] lg:leading-[21px]">
          {lastUpdated}
        </p>
        {/* Switcher-ul de limbă a fost SCOS (owner 2026-07-26) — există deja în navbar */}
      </header>

      <article className="flex w-full max-w-[min(350px,calc(100vw_-_40px))] flex-col gap-[18px] rounded-[24px] border-[6px] border-[#f6f6f6] bg-white p-6 shadow-[3px_9px_20px_rgba(77,77,77,0.03)] lg:max-w-[760px] lg:gap-6 lg:px-10 lg:pb-10 lg:pt-[34px]">
        {children}
      </article>
    </div>
  )
}

/** Titlu de secțiune — „1. Who we are": 17/25 mobil, 24/32 (−0.8) desktop */
export function LegalH2({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[17px] font-medium leading-[25px] text-[#222222] lg:text-[24px] lg:leading-8 lg:tracking-[-0.8px]">
      {children}
    </h2>
  )
}

/** Sub-titlu de secțiune (ex. „3.1. Provider", „Identification data") — derivat din LegalH2, o treaptă mai mic */
export function LegalH3({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[15px] font-medium leading-[22px] text-[#222222] lg:text-[18px] lg:leading-[26px] lg:tracking-[-0.4px]">
      {children}
    </h3>
  )
}

/** Paragraf — 13.5/21 mobil, 15.5/26 desktop, #595959 */
export function LegalP({ children }: { children: ReactNode }) {
  return (
    <p className="text-[13.5px] leading-[21px] text-[#595959] lg:text-[15.5px] lg:leading-[26px]">
      {children}
    </p>
  )
}

/** Bifă mică gradient — stroke #1C5D99→#407EA2, 2px, capete rotunde */
function CheckIcon() {
  return (
    <svg
      aria-hidden
      width="11"
      height="11"
      viewBox="0 0 11 11"
      fill="none"
      className="mt-[5px] shrink-0 lg:mt-[7px]"
    >
      <path
        d="M1.6 5.8L4.1 8.3L9.4 2"
        stroke="url(#lg-chk)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="lg-chk" x1="1.6" y1="2" x2="9.4" y2="8.3" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1C5D99" />
          <stop offset="1" stopColor="#407EA2" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/** Listă cu bife gradient — 13/20 mobil, 15/24 desktop */
export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2 lg:gap-2.5">
      {items.map((item, index) => (
        <li key={index} className="flex gap-[9px] lg:gap-2.5">
          <CheckIcon />
          <span className="flex-1 text-[13px] leading-5 text-[#595959] lg:text-[15px] lg:leading-6">
            {item}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Tabel pe două coloane (privacy §20) — stilurile listei/paragrafului, borduri #f6f6f6 */
export function LegalTable({ head, rows }: { head: [string, string]; rows: [string, string][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            {head.map((cell) => (
              <th
                key={cell}
                className="border-b-2 border-[#f6f6f6] pb-2 pr-4 align-top text-[13px] font-medium leading-5 text-[#222222] lg:text-[15px] lg:leading-6"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([category, period], index) => (
            <tr key={index}>
              <td className="border-b border-[#f6f6f6] py-2 pr-4 align-top text-[13px] leading-5 text-[#595959] lg:text-[15px] lg:leading-6">
                {category}
              </td>
              <td className="border-b border-[#f6f6f6] py-2 align-top text-[13px] leading-5 text-[#595959] lg:text-[15px] lg:leading-6">
                {period}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Nota de entitate de la finalul cardului — panou #F6F6F6 */
export function LegalEntityNote({
  line1, // ex. „INTERNATIONAL SECURITY AND DEFENCE S.R.L."
  line2, // ex. „Website: https://isad.academy · Email: support@isad.academy"
}: {
  line1: ReactNode
  line2: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[14px] bg-[#f6f6f6] px-[18px] py-4 lg:rounded-[16px] lg:px-[22px] lg:py-[18px]">
      <p className="text-[12.5px] font-medium leading-[19px] text-[#222222] lg:text-[13.5px] lg:leading-5">
        {line1}
      </p>
      <p className="text-[12px] leading-[18px] text-[#959595] lg:text-[12.5px] lg:leading-[19px]">
        {line2}
      </p>
    </div>
  )
}
