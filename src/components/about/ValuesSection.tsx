/**
 * About / Our Values — v3. ÎNLOCUIEȘTE vechiul ValuesSection.tsx.
 * DOAR PE DESKTOP (hidden lg:flex): în designul mobil (Figma 3977-571)
 * secțiunea de valori NU există separat — conținutul valorilor e integrat la
 * punctele traseului din BeliefsPath. Pe desktop rămâne 1:1 cu Figma 3873-94:
 * titlu „Our values." + 3 carduri 346.67×260 cu checkmark gradient, body
 * Poppins Light și glow albastru pe hover.
 * TOATE valorile sunt EXPLICITE (px/hex). Server component.
 */

import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

/** Checkmark 16×16 — stroke gradient #1C5D99→#407EA2, 3px, capete rotunde */
function GradientCheck() {
  return (
    <svg
      aria-hidden
      width="17"
      height="17"
      viewBox="0 0 17 17"
      fill="none"
      className="relative ml-[5px]"
    >
      <path
        d="M2.5 9L6.5 13L14.5 4"
        stroke="url(#vc-grad)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id="vc-grad"
          x1="2.5"
          y1="13"
          x2="14.5"
          y2="4"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1C5D99" />
          <stop offset="1" stopColor="#407EA2" />
        </linearGradient>
      </defs>
    </svg>
  );
}

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
            className="group relative h-[260px] w-[346.67px] overflow-hidden rounded-[24px] border-[6px] border-[#f6f6f6] bg-white pl-9 pr-4 pt-[41px] shadow-[3px_9px_20px_rgba(77,77,77,0.03)]"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-[-38px] left-[6px] right-[6px] h-[89px] rounded-full bg-[linear-gradient(90deg,#1c5d99_24%,#407ea2_83%)] opacity-0 blur-[55px] transition-opacity duration-300 group-hover:opacity-100"
            />
            <GradientCheck />
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
