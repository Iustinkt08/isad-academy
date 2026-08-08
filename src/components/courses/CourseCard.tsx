import Link from 'next/link';

import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

/**
 * CourseCard — cardul de curs din catalog, v2 RESPONSIVE.
 * ÎNLOCUIEȘTE vechiul CourseCard.tsx. 1:1 cu Figma 3732-7 (desktop) și
 * 3908-107 (mobil) — cardul e IDENTIC pe ambele (347.52×460).
 *
 * Schimbări față de v1 (designul nou al owner-ului):
 *  — conținutul la (46,46) — era (34,34);
 *  — FĂRĂ chips (durata + „Early Bird open" au fost scoase de pe card);
 *  — subtitlul e NEGRU (#000), nu gri-închis;
 *  — GLOW albastru blurat la bază (gradient #1C5D99→#407EA2, blur mare):
 *    apare la :hover pe desktop și pe cardul ACTIV (snapped) pe mobil;
 *  — umbre suplimentare pe butonul „View course".
 *
 * Reguli de catalog (CLAUDE.md §6): teaser la nivel de CURS — fără dată, preț
 * sau locuri pe card. Singura zonă clickabilă = butonul „View course".
 * TOATE valorile sunt EXPLICITE (px/hex).
 */

export type CatalogCourse = {
  title: string;
  subtitle: string;
  description: string;
  href: string;
  icon?: string;
  /** Folosit doar pentru sortare (nu se afișează pe card) */
  nextStartDate: string; // ISO, ex. "2026-07-28"
};

export default function CourseCard({
  locale,
  course,
  active = false,
}: {
  locale: Locale;
  course: CatalogCourse;
  /** true pe mobil pentru cardul snapped — aprinde glow-ul (echivalentul hover-ului) */
  active?: boolean;
}) {
  const t = getDictionary(locale).catalog;
  return (
    <article
      data-testid="course-card"
      className="group relative h-[460px] w-[min(347.52px,calc(100vw_-_42px))] shrink-0 snap-start scroll-ml-[21px] overflow-hidden rounded-[24px] border-[6px] border-[#f6f6f6] bg-white shadow-[24px_80px_50px_rgba(77,77,77,0.02),10px_36px_37px_rgba(77,77,77,0.03),3px_9px_20px_rgba(77,77,77,0.03)]"
    >
      {/* Glow albastru la bază — hover (desktop) / card activ (mobil, doar sub lg) */}
      <div
        aria-hidden
        className={`pointer-events-none absolute bottom-[-38px] left-2 right-2 h-[89px] rounded-full bg-[linear-gradient(90deg,#1c5d99_24%,#407ea2_83%)] opacity-0 blur-[55px] transition-opacity duration-300 group-hover:opacity-100 ${
          active ? 'max-lg:opacity-100' : ''
        }`}
      />

      {/* Content stack — 255px @ (46,46), gap 12; fără chips în v2 */}
      <div className="absolute left-[40px] top-[40px] flex w-[min(255px,calc(100%_-_68px))] flex-col items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={course.icon ?? '/brand/icon-black.svg'}
          alt=""
          className="h-[52.5px] w-12 object-contain"
        />
        {/* Clamp-uri: conținutul vine din CMS — limitele țin stack-ul deasupra
            butonului „View course" (pinned la 348px) indiferent cât text se introduce */}
        <h3 className="line-clamp-2 text-[20px] font-medium leading-normal tracking-[-0.8px] text-[#000000]">
          {course.title}
        </h3>
        <p className="line-clamp-1 text-[16px] leading-6 text-[#000000]">{course.subtitle}</p>
        <p className="line-clamp-4 text-[16px] leading-6 text-[#959595]">{course.description}</p>
      </div>

      {/* Singura zonă clickabilă — pinned la aceeași înălțime pe toate cardurile */}
      <Link
        href={course.href}
        className="absolute left-[40px] top-[348px] rounded-[20px] bg-black px-4 py-2 text-[14px] font-semibold leading-normal text-white shadow-[0_0_0_1px_rgba(255,255,255,0.2),4px_6px_25px_rgba(0,0,0,0.25),8px_10px_45px_rgba(0,0,0,0.2),12px_15px_70px_rgba(0,0,0,0.15)] transition-transform hover:scale-[1.03]"
      >
        {t.viewCourse}
      </Link>
    </article>
  );
}
