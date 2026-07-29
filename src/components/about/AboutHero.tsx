/**
 * About / Hero — pill „About us" + titlu cu gradient + misiunea. v3 RESPONSIVE.
 * ÎNLOCUIEȘTE vechiul AboutHero.tsx.
 * Desktop (≥lg): 1:1 cu Figma 3873-94 (neschimbat — titlu 54, paragrafe 16/26,
 *   inclusiv linia „Built by ISAD…").
 * Mobil (<lg): 1:1 cu Figma 3977-571 — titlu 28/34, paragrafe 14/21, iar linia
 *   „Built by International Security and Defence…" NU există pe mobil
 *   (scoasă de owner din design) → hidden lg:block.
 * TOATE valorile sunt EXPLICITE (px/hex). Server component.
 * Copy din dicționar (`about.hero*`) — site bilingv EN/RO.
 */

import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

/** Pill cu inel gradient — construcția PillTag: inel 3px, interior alb, text 15/23 */
function GradientPill({ label }: { label: string }) {
  return (
    <span className="w-fit shrink-0 rounded-[26px] bg-[linear-gradient(90deg,#1c5d99_0%,#46d3f6_25%,#1c5d99_50%,#46d3f6_75%,#1c5d99_100%)] p-[3px]">
      <span className="flex items-center whitespace-nowrap rounded-[23px] bg-white px-4 py-[2px] text-[min(3.85vw,15px)] font-medium leading-[1.53] text-black">
        {label}
      </span>
    </span>
  );
}

export default function AboutHero({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).about;
  return (
    <section className="flex flex-col items-center gap-3.5 bg-[#f8f9fa] px-5 pb-0 pt-16 lg:gap-[26px] lg:px-4 lg:pb-[50px] lg:pt-20">
      <GradientPill label={t.heroPill} />

      {/* Titlu — mobil 28/34, desktop 54/59.4; „changing world." în gradient */}
      <h1 className="max-w-[min(350px,calc(100vw_-_40px))] text-center text-[min(7.18vw,28px)] font-semibold leading-[1.22] tracking-[-1px] text-[#222222] lg:max-w-[1000px] lg:text-[54px] lg:leading-[59.4px] lg:tracking-[-1.5px]">
        {t.heroTitlePlain}
        <span className="bg-[linear-gradient(90deg,#407ea2_0%,#1c5d99_100%)] bg-clip-text text-transparent">
          {t.heroTitleGradient}
        </span>
        {'.'}
      </h1>

      {/* Intro — 2 paragrafe; pe desktop și linia de fondare */}
      <div className="flex max-w-[min(350px,calc(100vw_-_40px))] flex-col gap-3.5 lg:max-w-[760px]">
        <p className="text-center text-[14px] leading-[21px] text-[#595959] lg:text-[16px] lg:leading-[26px]">
          {t.heroIntro1}
        </p>
        <p className="text-center text-[14px] leading-[21px] text-[#595959] lg:text-[16px] lg:leading-[26px]">
          {t.heroIntro2}
        </p>
        {/* DOAR pe desktop — scoasă de owner din designul mobil */}
        <p className="hidden text-center text-[14px] leading-[21px] text-[#959595] lg:block">
          {t.heroBuiltBy}
        </p>
      </div>
    </section>
  );
}
