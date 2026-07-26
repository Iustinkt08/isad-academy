/**
 * About / CTA final — v3 RESPONSIVE. ÎNLOCUIEȘTE vechiul AboutCta.tsx.
 * Desktop (≥lg): 1:1 cu Figma 3873-94 — text 22, buton pill gradient.
 * Mobil (<lg): 1:1 cu Figma 3977-571 — text 16/24, buton identic, gap 16.
 * TOATE valorile sunt EXPLICITE (px/hex). Server component.
 */

import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

export default function AboutCta({
  locale,
  ctaHref = '/cursuri',
}: {
  locale: Locale;
  ctaHref?: string;
}) {
  const t = getDictionary(locale).about;
  return (
    <section className="flex flex-col items-center gap-4 bg-[#f8f9fa] px-5 pb-16 pt-0 lg:gap-[22px] lg:px-4 lg:pb-[100px] lg:pt-[30px]">
      <p className="max-w-[350px] text-center text-[16px] font-medium leading-6 tracking-[-0.5px] text-[#222222] lg:max-w-none lg:text-[22px] lg:leading-normal">
        {t.ctaLine}
      </p>
      <a
        href={ctaHref}
        className="rounded-[999px] bg-gradient-to-b from-[#407ea2] to-[#1c5d99] to-[80%] px-5 pb-3 pt-[11px] text-[16px] font-medium leading-normal text-white shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-transform hover:scale-[1.03]"
      >
        {t.ctaLabel}
      </a>
    </section>
  );
}
