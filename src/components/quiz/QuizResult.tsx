/**
 * QuizResult — ecranul de recomandare al quiz-ului, v3 RESPONSIVE.
 * ÎNLOCUIEȘTE versiunea anterioară.
 * Desktop (≥lg): 1:1 cu starea CURENTĂ din Figma 3920-153 — badge
 *   „Recomandarea principală", cardul recomandării (760, padding 40) și banda
 *   de echipe (905). ALTERNATIVELE AU FOST SCOASE din design (nu le adăuga).
 * Mobil (<lg):  1:1 cu Figma 3922-153 — FĂRĂ badge; header + cardul
 *   recomandării (350, padding 26, icon 48, titlu 17/24) + banda de echipe cu
 *   textul și linkul stivuite.
 *
 * Slotul de icon afișează INIȚIALA cursului recomandat (SemiBold #1C5D99),
 * ca în design — fără asset-uri de imagine.
 * Client (butonul „Reia quiz-ul" vine din CourseQuiz prin onRestart).
 * TOATE valorile sunt EXPLICITE (px/hex).
 */

'use client';

import Link from 'next/link';

import { QUIZ_UI, resultView, type QuizLocale, type QuizRecommendation } from './quiz-data';
import { GradientPill } from './CourseQuiz';

export default function QuizResult({
  recommendation,
  locale = 'ro',
  onRestart,
}: {
  recommendation: QuizRecommendation;
  locale?: QuizLocale;
  onRestart: () => void;
}) {
  const ui = QUIZ_UI[locale];
  const r = resultView(recommendation, locale);

  return (
    <section className="flex flex-col items-center gap-5 bg-[#f8f9fa] pb-16 pt-16 lg:gap-7 lg:pb-[120px] lg:pt-20">
      {/* Header */}
      <div className="flex flex-col items-center gap-3.5">
        <GradientPill label={ui.resultPill} />
        <h1 className="max-w-[348px] text-center text-[28px] font-semibold leading-[34px] tracking-[-1px] text-[#222222] lg:max-w-none lg:text-[54px] lg:leading-[59.4px] lg:tracking-[-1.5px]">
          {ui.resultTitlePlain}
          <span className="bg-[linear-gradient(90deg,#407ea2_0%,#1c5d99_100%)] bg-clip-text text-transparent">
            {ui.resultTitleGradient}
          </span>
          {/* Semnul final rămâne NEGRU (convenția titlurilor — owner 2026-07-26) */}
          {ui.resultTitlePunctuation}
        </h1>
        <p className="max-w-[350px] text-center text-[14px] leading-[21px] text-[#959595] lg:max-w-[640px] lg:text-[16px] lg:leading-[26px]">
          {ui.resultSub}
        </p>
      </div>

      {/* Recomandarea principală — 350/26 pe mobil (fără badge), 760/40 pe desktop */}
      <div className="flex w-[350px] flex-col gap-3.5 rounded-[24px] border-[6px] border-[#f6f6f6] bg-white p-[26px] shadow-[24px_80px_50px_rgba(77,77,77,0.02),10px_36px_37px_rgba(77,77,77,0.03),3px_9px_20px_rgba(77,77,77,0.03)] lg:w-[760px] lg:gap-4 lg:p-10">
        {/* Badge — DOAR pe desktop (nu există în designul mobil) */}
        <span className="hidden w-fit rounded-[20px] bg-[#f6f6f6] px-3 py-[5px] text-[12px] font-medium tracking-[-0.3px] text-[#1c5d99] lg:block">
          {ui.mainBadge}
        </span>

        <div className="flex items-center gap-3 lg:gap-4">
          {/* Slotul de icon — inițiala cursului, ca în design */}
          <span className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-[#f6f6f6] text-[18px] font-semibold text-[#1c5d99] lg:size-14 lg:text-[22px]">
            {r.courseTitle.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-medium leading-6 tracking-[-0.5px] text-[#222222] lg:text-[24px] lg:leading-normal lg:tracking-[-0.8px]">
              {r.courseTitle}
            </h2>
            <p className="text-[13px] text-[#959595] lg:text-[15px]">{r.courseSub}</p>
          </div>
        </div>

        <p className="text-[13px] leading-5 text-[#959595] lg:text-[15px] lg:leading-6">
          {r.reason}
        </p>

        <div className="flex items-center gap-3.5 lg:gap-4">
          <Link
            href={r.href}
            className="rounded-[999px] bg-gradient-to-b from-[#407ea2] to-[#1c5d99] to-[80%] px-5 pb-[11px] pt-2.5 text-[15px] font-medium leading-normal text-white shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-transform hover:scale-[1.03] lg:px-[22px] lg:pb-3 lg:pt-[11px] lg:text-[16px]"
          >
            {r.ctaLabel}
          </Link>
          <button
            type="button"
            onClick={onRestart}
            className="text-[14px] font-medium text-[#959595] transition-colors hover:text-[#595959] lg:text-[15px]"
          >
            {ui.retake}
          </button>
        </div>
      </div>

      {/* Banda pentru echipe — stivuită pe mobil (350), pe orizontală pe desktop (905) */}
      <div className="flex w-[350px] flex-col items-start gap-2 rounded-[16px] bg-[#f6f6f6] px-[22px] py-[18px] lg:w-[905px] lg:flex-row lg:items-center lg:gap-3 lg:px-6 lg:py-5">
        <p className="text-[13px] leading-[19px] text-[#595959] lg:flex-1 lg:text-[14px] lg:leading-[21px]">
          {ui.corporateBand}
        </p>
        <Link
          href="/corporate"
          className="shrink-0 text-[13px] font-medium text-[#1c5d99] transition-colors hover:text-[#407ea2] lg:text-[14px]"
        >
          {ui.corporateBandCta}
        </Link>
      </div>
    </section>
  );
}
