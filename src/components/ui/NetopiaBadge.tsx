import Image from 'next/image'

/*
 * NETOPIA Payments — însemnul de plată acceptată (HANDOFF.md TODO #3).
 *
 * Netopia CERE afișarea logo-ului lor + siglele cardurilor pe site-ul comerciantului;
 * fără el nu aprobă trecerea POS-ului pe producție. Regulile vin din „Manual de
 * identitate NETOPIA Payments_parteneri" (ed. 04.11.2022), rezumate în
 * public/netopia/NOTICE.txt — citește-l înainte să atingi randarea de mai jos.
 *
 * Trei lucruri care par detalii de stil, dar sunt reguli de marcă:
 *
 * 1. VARIANTA se alege după fundal, nu după gust: wordmark albastru pe alb/gri,
 *    wordmark alb pe orice fundal colorat sau închis. De aceea `tone` nu are default —
 *    cine montează badge-ul e obligat să se uite la suprafața pe care îl pune.
 * 2. NIMIC nu se modifică: fără recolorare, rotire, înclinare, decupare, filtre CSS sau
 *    opacitate. Singura transformare permisă e scalarea proporțională, de unde
 *    `width: auto` și raportul fix 1852×349 al pânzei.
 * 3. `unoptimized` e intenționat, ca la badge-urile ANPC: pipeline-ul de imagini al
 *    Next ar recomprima o marcă înregistrată. 26 KB nu justifică riscul.
 *
 * Aria de siguranță cerută de manual e deja în pânza PNG-ului (65 px sus/jos,
 * 153 px stânga/dreapta în jurul conținutului opac) — nu mai adăuga padding „ca să
 * respire", ar dubla degeaba spațiul.
 */

/** Pânza oficială — raportul e fix; înălțimea o determină pe lățime. */
const CANVAS = { width: 1852, height: 349 } as const

/** Site-ul procesatorului. Ținta linkului când `linked` e activ. */
export const NETOPIA_URL = 'https://netopia-payments.com/'

export function NetopiaBadge({
  tone,
  height = 44,
  linked = false,
  className = '',
}: {
  /** Fundalul pe care stă badge-ul. `light` = alb/gri, `dark` = colorat/închis. */
  tone: 'light' | 'dark'
  /** Înălțimea pânzei în px (conținutul vizibil ocupă ~63% din ea — restul e aria de siguranță). */
  height?: number
  /**
   * Face însemnul clickabil către site-ul Netopia, în tab nou. Manualul lor nu cere
   * linkul, dar nici nu-l interzice — iar tab-ul nou e obligatoriu: în checkout, o
   * navigare în aceeași fereastră ar arunca cumpărătorul afară din formularul completat.
   * Numele accesibil al linkului vine din `alt`-ul imaginii.
   */
  linked?: boolean
  className?: string
}) {
  const image = (
    <Image
      src={tone === 'light' ? '/netopia/netopia-cards-light.png' : '/netopia/netopia-cards-dark.png'}
      // Informativ, nu decorativ: spune ce mijloace de plată sunt acceptate. Numele mărcilor
      // rămân ca atare — sunt denumiri comerciale, nu text de UI de tradus.
      alt="NETOPIA Payments: Visa, Mastercard"
      width={CANVAS.width}
      height={CANVAS.height}
      unoptimized
      style={{ height, width: 'auto' }}
      className={`max-w-full object-contain ${className}`}
    />
  )

  if (!linked) return image

  return (
    <a
      href={NETOPIA_URL}
      target="_blank"
      rel="noopener noreferrer"
      // `inline-flex` ca ancora să se strângă exact pe imagine: un <a> block ar căpăta
      // lățimea containerului, iar clickul ar prinde și spațiul gol din jur.
      className="inline-flex"
    >
      {image}
    </a>
  )
}
