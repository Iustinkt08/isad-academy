import type { Metadata } from 'next'

import Link from 'next/link'

import { getDictionary, getLocale, localePath } from '@/lib/i18n'

/**
 * Next never passes route params to not-found files, so the [locale] segment is invisible
 * here — the language preference cookie (via `getLocale`, the documented escape hatch for
 * param-less request contexts) is the only signal. 404s are rendered on demand anyway
 * (the [...notFound] catch-all has no generateStaticParams), so reading the cookie does
 * not cost any static page.
 */
export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(await getLocale())
  return {
    title: dict.notFound.metaTitle,
    robots: { index: false },
  }
}

/**
 * Branded 404 — redesign 1:1 from Figma (desktop 4059-156, mobile 4059-169), owner
 * 2026-07-28. Renders inside the (frontend) layout — header, footer and consent banner
 * stay in place. Reached by any `notFound()` in the frontend tree AND by fully unmatched
 * URLs via the `[...notFound]` catch-all route.
 *
 * Owner decisions baked in: the "404" digits are PLAIN TEXT SemiBold #222222 (no graphic),
 * CTAs have NO arrows, "different path" wears the text gradient but the final period
 * stays black. Explicit px/hex values per the handoff; mobile sizes follow the project's
 * fluid convention (min(Nvw,Npx) at the 390px reference) so narrow phones keep margins.
 */
export default async function NotFound() {
  const locale = await getLocale()
  const t = getDictionary(locale).notFound
  return (
    <main className="flex flex-col items-center gap-7 bg-[#f8f9fa] px-5 pb-[130px] pt-[110px] lg:gap-9 lg:px-4 lg:py-[180px]">
      {/* Pill „Error 404" — inel gradient 3px, interior alb */}
      <span className="w-fit shrink-0 rounded-[26px] bg-[linear-gradient(90deg,#1c5d99_0%,#46d3f6_25%,#1c5d99_50%,#46d3f6_75%,#1c5d99_100%)] p-[3px]">
        <span className="flex items-center whitespace-nowrap rounded-[23px] bg-white px-3.5 py-[2px] text-[min(3.33vw,13px)] font-medium leading-[1.6] text-black lg:px-4 lg:text-[15px] lg:leading-[23px]">
          {t.pill}
        </span>
      </span>

      {/* Cifrele — text simplu, fără grafic (decizie owner) */}
      <p
        aria-hidden
        className="text-[min(19.5vw,76px)] font-semibold leading-none tracking-[-2.5px] text-[#222222] lg:text-[120px] lg:tracking-[-4px]"
      >
        404
      </p>

      {/* Titlu + subtitlu */}
      <div className="flex w-full max-w-[min(350px,calc(100vw_-_40px))] flex-col items-center gap-3 lg:max-w-[478px] lg:gap-3.5">
        <h1 className="text-center text-[min(5.64vw,22px)] font-semibold leading-[1.27] tracking-[-0.8px] text-[#222222] lg:text-[32px] lg:leading-10 lg:tracking-[-1px]">
          {t.titlePlain}
          <span className="bg-[linear-gradient(90deg,#407ea2_0%,#1c5d99_100%)] bg-clip-text text-transparent">
            {t.titleGradient}
          </span>
          {/* Punctul final rămâne NEGRU (convenția titlurilor — owner) */}
          {'.'}
        </h1>
        <p className="text-center text-[13.5px] leading-5 text-[#959595] lg:text-[16px] lg:leading-[26px]">
          {t.body}
        </p>
      </div>

      {/* CTA-uri — FĂRĂ săgeți; mobil: buton full-width + link dedesubt */}
      <div className="flex w-full max-w-[min(350px,calc(100vw_-_40px))] flex-col items-center gap-5 lg:w-auto lg:max-w-none lg:flex-row lg:gap-[18px]">
        <Link
          href={localePath(locale, '/')}
          className="w-full rounded-[999px] bg-gradient-to-b from-[#407ea2] to-[#1c5d99] to-[80%] pb-[13px] pt-3 text-center text-[15px] font-medium text-white shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-transform hover:scale-[1.02] lg:w-auto lg:px-[22px] lg:pb-3 lg:pt-[11px] lg:text-[16px]"
        >
          {t.backHome}
        </Link>
        <Link
          href={localePath(locale, '/courses')}
          className="text-[13.5px] font-medium text-[#1c5d99] transition-colors hover:text-[#407ea2] lg:text-[15px]"
        >
          {t.browseCourses}
        </Link>
      </div>
    </main>
  )
}
