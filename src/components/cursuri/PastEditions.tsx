/**
 * Catalog / Past Editions — edițiile deja livrate, v2 RESPONSIVE.
 * ÎNLOCUIEȘTE vechiul PastEditions.tsx.
 *
 * Desktop (≥lg): 1:1 cu Figma 3732-7 — titlu 26, carduri 410 în wrap gap 24.
 * Mobil (<lg): 1:1 cu Figma 3908-107 — titlu 22/28 + subtitlu 12/18 la 20px de
 *   margine, apoi STRIP cu SLIDE orizontal (padding stânga 20, gap 12, carduri
 *   350, peek ~8px) — fără dots (conținut secundar).
 *
 * Carduri estompate: #F6F6F6, radius 24, opacity 85%, tag alb „Completed".
 * Datele SAMPLE — în producție: courseSessions cu startDate în trecut.
 * TOATE valorile sunt EXPLICITE (px/hex).
 */

import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

export type PastEdition = {
  title: string;
  subtitle: string;
  meta: string; // ex. "Edition 02.03.2026 · 14 participants"
};

const SAMPLE_PAST: PastEdition[] = [
  {
    title: 'Lead Implementer',
    subtitle: 'PECB ISO/IEC 42001',
    meta: 'Edition 02.03.2026 · 14 participants',
  },
  {
    title: '42001 Foundation',
    subtitle: 'PECB ISO/IEC 42001',
    meta: 'Edition 12.01.2026 · 18 participants',
  },
  {
    title: 'AI Governance & Responsible AI',
    subtitle: 'ISAD Academy',
    meta: 'Edition 24.11.2025 · 12 participants',
  },
];

function PastCard({ edition, completedLabel }: { edition: PastEdition; completedLabel: string }) {
  return (
    <article className="flex w-[350px] shrink-0 snap-start scroll-ml-5 flex-col gap-1.5 rounded-[24px] bg-[#f6f6f6] px-7 py-6 opacity-85 lg:w-[410px]">
      <h3 className="text-[17px] font-medium tracking-[-0.5px] text-[#737373]">
        {edition.title}
      </h3>
      <p className="text-[13px] text-[#959595]">{edition.subtitle}</p>
      <p className="text-[12.5px] text-[#959595]">{edition.meta}</p>
      <span className="mt-1 w-fit rounded-[20px] bg-white px-[11px] py-1 text-[12px] font-medium text-[#959595]">
        {completedLabel}
      </span>
    </article>
  );
}

export default function PastEditions({
  locale,
  editions = SAMPLE_PAST,
}: {
  locale: Locale;
  editions?: PastEdition[];
}) {
  const t = getDictionary(locale).catalog;
  if (!editions.length) return null;

  return (
    <section className="bg-[#f8f9fa] pb-16 pt-8 lg:pb-[110px] lg:pt-10">
      {/* Desktop: aliniat la containerul standard al site-ului (linia landing-ului) */}
      <div className="lg:mx-auto lg:w-full lg:max-w-6xl lg:px-8">
        {/* Header — la 20px de margine pe mobil */}
        <div className="px-5 lg:px-0">
          <h2 className="text-[22px] font-medium leading-[28px] tracking-[-0.9px] text-[#222222] lg:text-[26px] lg:leading-normal">
            {t.pastTitle}
          </h2>
          <p className="pt-1 text-[12px] leading-[18px] text-[#959595] lg:text-[14px] lg:leading-normal">
            {t.pastSubtitle}
          </p>
        </div>

        {/* Mobil: strip cu slide; Desktop: wrap gap 24 */}
        <div className="mt-3 w-full snap-x snap-mandatory overflow-x-auto pb-1 [scrollbar-width:none] lg:snap-none lg:overflow-visible [&::-webkit-scrollbar]:hidden lg:mt-5">
          <div className="flex w-max gap-3 pl-5 pr-[10px] lg:w-auto lg:flex-wrap lg:gap-6 lg:p-0">
            {editions.map((e) => (
              <PastCard key={e.meta} edition={e} completedLabel={t.completed} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
