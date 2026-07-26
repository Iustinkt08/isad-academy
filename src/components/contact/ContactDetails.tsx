/**
 * Contact / Details — cardul „Contact details" (email, telefon, timp de
 * răspuns). RESPONSIVE — ACELEAȘI valori pe ambele breakpointuri, doar
 * lățimea diferă: 350 pe mobil (full în container), 420 pe desktop.
 * 1:1 cu Figma 3977-489 (desktop) / 3977-531 (mobil): padding 28, gap 14,
 * titlu 20 Medium, rânduri = bifă gradient + etichetă 11 Medium #959595 +
 * valoare 14.5 (linkurile Medium #1C5D99, restul Regular #595959).
 * TOATE valorile sunt EXPLICITE (px/hex). Server component.
 *
 * Datele vin prin props (pagina le trage din siteSettings.contact cu fallback
 * pe default-urile de mai jos); titlul vine din dicționar (site bilingv).
 */

/** Bifă mică gradient — stroke #1C5D99→#407EA2, 2px, capete rotunde */
function CheckIcon() {
  return (
    <svg
      aria-hidden
      width="11"
      height="11"
      viewBox="0 0 11 11"
      fill="none"
      className="mt-1 shrink-0"
    >
      <path
        d="M1.6 5.8L4.1 8.3L9.4 2"
        stroke="url(#cd-chk)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="cd-chk" x1="1.6" y1="2" x2="9.4" y2="8.3" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1C5D99" />
          <stop offset="1" stopColor="#407EA2" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export type ContactDetail = { label: string; value: string; href?: string }

/** Default-urile din Figma — sursă unică; pagina le suprascrie din siteSettings.contact. */
export const DEFAULT_EMAIL = 'contact@isad.academy'
export const DEFAULT_PHONE = '+40 780 656 394'

export const DEFAULT_DETAILS: ContactDetail[] = [
  { label: 'Email', value: DEFAULT_EMAIL, href: `mailto:${DEFAULT_EMAIL}` },
  { label: 'Phone Number', value: DEFAULT_PHONE, href: `tel:${DEFAULT_PHONE.replace(/\s+/g, '')}` },
  { label: 'Response time', value: 'Within one business day' },
]

export default function ContactDetails({
  title = 'Contact details',
  details = DEFAULT_DETAILS,
}: {
  title?: string
  details?: ContactDetail[]
}) {
  return (
    <div className="flex w-full flex-col gap-3.5 rounded-[24px] border-[6px] border-[#f6f6f6] bg-white p-7 shadow-[24px_80px_50px_rgba(77,77,77,0.02),10px_36px_37px_rgba(77,77,77,0.03),3px_9px_20px_rgba(77,77,77,0.03)] lg:w-[420px]">
      <h2 className="text-[20px] font-medium tracking-[-0.5px] text-[#222222]">
        {title}
      </h2>

      {details.map((d) => (
        <div key={d.label} className="flex gap-2.5">
          <CheckIcon />
          <div className="flex min-w-0 flex-1 flex-col gap-[1px]">
            <span className="text-[11px] font-medium tracking-[0.2px] text-[#959595]">
              {d.label}
            </span>
            {d.href ? (
              <a
                href={d.href}
                className="truncate text-[14.5px] font-medium leading-[21px] text-[#1c5d99] transition-colors hover:text-[#407ea2]"
              >
                {d.value}
              </a>
            ) : (
              <span className="text-[14.5px] leading-[21px] text-[#595959]">{d.value}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
