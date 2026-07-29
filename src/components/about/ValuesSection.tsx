/**
 * About / Our Values — v4 (Figma 3873-110 / card 3891-3089, owner 2026-07-29).
 * DOAR PE DESKTOP (hidden lg:flex): în designul mobil (Figma 3977-571)
 * secțiunea de valori NU există separat — conținutul valorilor e integrat la
 * punctele traseului din BeliefsPath.
 *
 * Schimbare v4: checkmark-ul gradient DISPARE; în locul lui cardul primește
 * MONOGRAMA de brand ca filigran, ancorată în colțul din dreapta-jos (167×148,
 * ieșind 15px în dreapta și 6px sub marginea interioară — exact geometria din
 * Figma). Asset-ul e cel din proiect (/brand/blog-monogram.svg, același folosit
 * de cardurile de blog): are opacity 0.5 + granulația încorporate, deci
 * echivalează cu instanța Figma aplicată la opacity 50%.
 *
 * Titlu 20/30 (−0.8) la 56px de sus, body Poppins Light 14/23 pe 248px la 98px,
 * ambele la 36px de marginea stângă; glow albastru pe hover (patternul
 * CourseCard). TOATE valorile sunt EXPLICITE (px/hex). Server component.
 */

import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

export default function ValuesSection({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).about;
  return (
    <section className="hidden flex-col items-center gap-11 bg-[#f8f9fa] pb-[30px] pt-[70px] lg:flex">
      <h2 className="text-center text-[44px] font-semibold leading-[48.4px] tracking-[-1.5px] text-[#222222]">
        {t.valuesTitlePlain}
        <span className="bg-[linear-gradient(90deg,#407ea2_0%,#1c5d99_100%)] bg-clip-text text-transparent">
          {t.valuesTitleGradient}
        </span>
        {'.'}
      </h2>

      <div className="flex gap-[30px]">
        {t.values.map((v) => (
          <article
            key={v.title}
            className="group relative h-[260px] w-[346.67px] overflow-hidden rounded-[24px] border-[6px] border-[#f6f6f6] bg-white pl-9 pr-4 pt-[56px] shadow-[3px_9px_20px_rgba(77,77,77,0.03)]"
          >
            {/* Filigranul de brand — colț dreapta-jos, sub conținut (Figma 4067:171) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/blog-monogram.svg"
              alt=""
              aria-hidden
              className="pointer-events-none absolute -bottom-[6px] -right-[15px] h-[148px] w-[167px] select-none"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-[-38px] left-[6px] right-[6px] h-[89px] rounded-full bg-[linear-gradient(90deg,#1c5d99_24%,#407ea2_83%)] opacity-0 blur-[55px] transition-opacity duration-300 group-hover:opacity-100"
            />
            <h3 className="relative text-[20px] font-medium leading-[30px] tracking-[-0.8px] text-[#222222]">
              {v.title}
            </h3>
            <p className="relative mt-3 w-[248px] text-[14px] font-light leading-[23px] text-[#000000]">
              {v.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
