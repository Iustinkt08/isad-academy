/**
 * Catalog / Header — "Explore our courses." + quiz CTA, v2 RESPONSIVE.
 * ÎNLOCUIEȘTE vechiul CatalogHeader.tsx.
 * Desktop (≥lg): 1:1 cu Figma 3732-7. Mobil (<lg): 1:1 cu Figma 3908-107
 * (titlu 28/34, subtitlu 14/21, quiz CTA identic).
 * Quiz-ul e BUTONUL PRINCIPAL al catalogului — înlocuiește filtrele (decizie E4).
 * TOATE valorile sunt EXPLICITE (px/hex).
 * Copy din dicționar (site bilingv EN/RO) — punctul final și săgeata rămân în JSX.
 */

import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

export default function CatalogHeader({
  locale,
  quizHref = '#quiz', // quiz-ul se definește într-o rundă separată (CLAUDE.md §11)
}: {
  locale: Locale;
  quizHref?: string;
}) {
  const t = getDictionary(locale).catalog;
  return (
    <header className="flex flex-col items-center gap-3.5 bg-[#f8f9fa] px-4 pb-8 pt-16 lg:gap-5 lg:pb-[50px] lg:pt-20">
      <h1 className="max-w-[348px] text-center text-[28px] font-semibold leading-[34px] tracking-[-1px] text-[#222222] lg:max-w-none lg:text-[54px] lg:leading-normal lg:tracking-[-1.5px]">
        {t.titlePlain}
        <span className="bg-[linear-gradient(90deg,#407ea2_0%,#1c5d99_100%)] bg-clip-text tracking-[-1.2px] text-transparent lg:tracking-[-2.16px]">
          {t.titleGradient}
        </span>
        {'.'}
      </h1>
      <p className="max-w-[350px] text-center text-[14px] leading-[21px] text-[#959595] lg:max-w-none lg:text-[17px] lg:leading-normal">
        {t.subtitle}
      </p>

      {/* Quiz CTA — butonul principal al paginii */}
      <div className="flex flex-col items-center gap-3.5 lg:gap-2 lg:pt-2.5">
        <p className="text-[14px] text-[#959595]">{t.notSure}</p>
        <a
          href={quizHref}
          className="rounded-[999px] border border-[#1c5d99] bg-gradient-to-b from-[#407ea2] to-[#1c5d99] to-[80%] px-[22px] pb-3 pt-[11px] text-[16px] font-medium leading-normal text-white shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-transform hover:scale-[1.03]"
        >
          {t.quizCta}
        </a>
      </div>
    </header>
  );
}
