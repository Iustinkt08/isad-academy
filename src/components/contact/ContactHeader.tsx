/**
 * Contact / Header — pill „Contact" + titlu două-tonuri + subtitlu. RESPONSIVE.
 * Desktop (≥lg): 1:1 cu Figma 3977-489 — titlu 54/59.4 (−1.5), subtitlu 16.
 * Mobil (<lg):  1:1 cu Figma 3977-531 — titlu 28/34 (−1), subtitlu 14/21.
 * Totul CENTRAT pe ambele breakpointuri.
 * TOATE valorile sunt EXPLICITE (px/hex). Server component.
 *
 * Pill + titlul două-tonuri + subtitlul vin prin props (pagina le trage din
 * dicționar — site bilingv); default-urile = copy-ul EN din Figma.
 */

/** Pill cu inel gradient — construcția PillTag (inel 3px, interior alb) */
function GradientPill({ label }: { label: string }) {
  return (
    <span className="w-fit shrink-0 rounded-[26px] bg-[linear-gradient(90deg,#1c5d99_0%,#46d3f6_25%,#1c5d99_50%,#46d3f6_75%,#1c5d99_100%)] p-[3px]">
      <span className="flex items-center whitespace-nowrap rounded-[23px] bg-white px-4 py-[2px] text-[min(3.85vw,15px)] font-medium leading-[1.53] text-black">
        {label}
      </span>
    </span>
  )
}

export default function ContactHeader({
  pill = 'Contact',
  titlePlain = 'Questions?',
  titleGradient = 'Let’s talk.',
  subtitle = 'Write to us, we reply within one business day.',
}: {
  pill?: string
  titlePlain?: string
  titleGradient?: string
  subtitle?: string
}) {
  // Punctul final rămâne NEGRU (convenția titlurilor site-ului — owner 2026-07-26):
  // separat aici din segmentul gradient, pentru ambele limbi.
  const gradientWord = titleGradient.replace(/\.$/, '')
  return (
    <header className="flex flex-col items-center gap-3 px-5 pt-16 lg:gap-3.5 lg:px-4 lg:pt-20">
      <GradientPill label={pill} />
      <h1 className="max-w-[min(350px,calc(100vw_-_40px))] text-center text-[min(7.18vw,28px)] font-semibold leading-[1.22] tracking-[-1px] text-[#222222] lg:max-w-[640px] lg:text-[54px] lg:leading-[59.4px] lg:tracking-[-1.5px]">
        {titlePlain}{' '}
        <span className="bg-[linear-gradient(90deg,#407ea2_0%,#1c5d99_100%)] bg-clip-text text-transparent">
          {gradientWord}
        </span>
        {'.'}
      </h1>
      <p className="max-w-[min(350px,calc(100vw_-_40px))] text-center text-[14px] leading-[21px] text-[#959595] lg:max-w-[640px] lg:text-[16px] lg:leading-normal">
        {subtitle}
      </p>
    </header>
  )
}
