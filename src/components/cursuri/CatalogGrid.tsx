/**
 * Catalog / Grid — toolbar (count + sort) + cardurile de curs, v2 RESPONSIVE.
 * ÎNLOCUIEȘTE vechiul CatalogGrid.tsx.
 *
 * Desktop (≥lg): 1:1 cu Figma 3732-7 — toolbar pe max 1490 + grid wrap gap 30;
 *   chip-ul de sort arată direcția (↓/↑).
 * Mobil (<lg): 1:1 cu Figma 3908-107 — STRIP cu SLIDE (snap-scroll orizontal,
 *   padding stânga 21, gap 12, peek ~9px) + DOTS sincronizate cu scroll-ul
 *   (activ = pilulă gradient 22×8); chip-ul de sort FĂRĂ săgeată („Sort: Start
 *   date" — modificarea owner-ului); glow-ul albastru apare pe cardul ACTIV.
 *
 * Client component: sort toggle + dots. Sortează după nextStartDate (nu se
 * afișează pe card). FĂRĂ filtre/search (CLAUDE.md §6).
 * TOATE valorile sunt EXPLICITE (px/hex).
 */

'use client';

import { useRef, useState } from 'react';
import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import CourseCard, { type CatalogCourse } from './CourseCard';

const LAUNCH_COURSES: CatalogCourse[] = [
  {
    title: 'AI Governance & Responsible AI',
    subtitle: 'ISAD Academy',
    description:
      'Turn AI ethics, risk and accountability into practices you can apply from day one.',
    href: '/cursuri/ai-governance-responsible-ai',
    nextStartDate: '2026-07-28',
  },
  {
    title: 'Artificial Intelligence Management System',
    subtitle: 'PECB ISO/IEC 42001',
    description:
      'Grasp the core concepts and requirements of an AI Management System based on ISO/IEC 42001.',
    href: '/cursuri/iso-iec-42001-foundation',
    nextStartDate: '2026-07-28',
  },
  {
    title: 'Lead Implementer',
    subtitle: 'PECB ISO/IEC 42001',
    description:
      'Gain the skills to plan, implement and manage a 42001-compliant AI Management System end to end.',
    href: '/cursuri/iso-iec-42001-lead-implementer',
    nextStartDate: '2026-08-10',
  },
  {
    title: 'Lead Auditor',
    subtitle: 'PECB ISO/IEC 42001',
    description:
      'Learn to audit an AI Management System against ISO/IEC 42001 — planning, conducting and reporting.',
    href: '/cursuri/iso-iec-42001-lead-auditor',
    nextStartDate: '2026-09-14',
  },
];

/** Lățimea cardului + gap-ul mobil — pentru calculul dot-ului activ */
const CARD_W = 347.52;
const MOBILE_GAP = 12;

export default function CatalogGrid({
  locale,
  courses = LAUNCH_COURSES,
}: {
  locale: Locale;
  courses?: CatalogCourse[];
}) {
  const t = getDictionary(locale).catalog;
  const [asc, setAsc] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const sorted = [...courses].sort((a, b) =>
    asc
      ? a.nextStartDate.localeCompare(b.nextStartDate)
      : b.nextStartDate.localeCompare(a.nextStartDate),
  );

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / (CARD_W + MOBILE_GAP));
    setActiveIndex(Math.max(0, Math.min(sorted.length - 1, idx)));
  }

  function scrollTo(idx: number) {
    scrollerRef.current?.scrollTo({
      left: idx * (CARD_W + MOBILE_GAP),
      behavior: 'smooth',
    });
  }

  return (
    <section className="flex flex-col items-center bg-[#f8f9fa] pb-[30px]">
      {/* Toolbar — 350 pe mobil; pe desktop aliniat la containerul standard al
          site-ului (max-w-6xl + px-8 = linia navbar/landing) */}
      <div className="flex w-full max-w-[350px] items-center justify-between pb-8 lg:max-w-6xl lg:px-8 lg:pb-5">
        <p className="text-[14px] font-medium tracking-[-0.3px] text-[#959595]">
          {t.upcomingCount(courses.length)}
        </p>
        <button
          onClick={() => setAsc(!asc)}
          className="rounded-[999px] border border-[#e6e6e6] bg-white px-4 py-2 text-[14px] font-medium tracking-[-0.3px] text-[#222222] transition-colors hover:border-[#bdbdbd]"
        >
          {/* pe mobil fără săgeată (designul owner-ului); pe desktop cu direcție */}
          {t.sortLabel}<span className="hidden lg:inline"> {asc ? '↓' : '↑'}</span>
        </button>
      </div>

      {/* Mobil: strip cu snap-scroll; Desktop: wrap centrat gap 30 */}
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="w-full snap-x snap-mandatory overflow-x-auto pb-2 pt-2 [scrollbar-width:none] lg:snap-none lg:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        {/* Desktop: max 3 carduri fixe/rând (3×347.52 + 2×30 = 1102.56) — aliniat
            vizual cu linia containerului standard (1152 − 2×32 padding) */}
        <div className="flex w-max gap-3 pl-[21px] pr-[10px] lg:mx-auto lg:w-auto lg:max-w-[1103px] lg:flex-wrap lg:justify-center lg:gap-[30px] lg:p-0">
          {sorted.map((course, i) => (
            <CourseCard
              key={course.title}
              locale={locale}
              course={course}
              active={i === activeIndex}
            />
          ))}
        </div>
      </div>

      {/* Dots — doar pe mobil; activ = pilulă gradient 22×8, inactive = 8px gri */}
      <div
        className="mt-4 flex items-center justify-center gap-[7px] lg:hidden"
        role="tablist"
        aria-label={t.dotsAria}
      >
        {sorted.map((course, i) => (
          <button
            key={course.title}
            role="tab"
            aria-selected={i === activeIndex}
            aria-label={course.title}
            onClick={() => scrollTo(i)}
            className={`relative h-2 overflow-hidden rounded-full bg-[#d1d1d1] transition-[width] duration-300 ease-out ${
              i === activeIndex ? 'w-[22px]' : 'w-2 hover:bg-[#b5b5b5]'
            }`}
          >
            {/* Crossfade-ul gradientului — strat interior cu opacity animat (smooth) */}
            <span
              aria-hidden="true"
              className={`absolute inset-0 rounded-full bg-gradient-to-r from-[#407ea2] to-[#1c5d99] transition-opacity duration-300 ${
                i === activeIndex ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
