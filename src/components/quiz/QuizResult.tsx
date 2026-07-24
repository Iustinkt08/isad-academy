/**
 * QuizResult — ecranul de recomandare al quiz-ului, v2 RESPONSIVE.
 * Desktop (≥lg): Figma 3920-153, cu modificările owner-ului din 2026-07-23:
 *   FĂRĂ badge „Recomandarea principală", FĂRĂ alternative, „Corporate training"
 *   fără săgeată, banda aliniată cu cardul (justify-between).
 * Mobil (<lg): 1:1 cu Figma 3922-153 — header + cardul recomandării (350,
 *   icon 48, titlu 17/24) + banda de echipe cu textul și linkul stivuite.
 *
 * Client (butonul „Reia quiz-ul" vine din CourseQuiz prin onRestart).
 * TOATE valorile sunt EXPLICITE (px/hex).
 */

'use client';

import Link from 'next/link';

import { QUIZ_RESULTS, type QuizResultType } from './quiz-data';
import { GradientPill } from './CourseQuiz';

export default function QuizResult({
  type,
  onRestart,
}: {
  type: QuizResultType;
  onRestart: () => void;
}) {
  const r = QUIZ_RESULTS[type];

  return (
    <section className="flex flex-col items-center gap-5 bg-[#f8f9fa] pb-16 pt-16 lg:gap-7 lg:pb-[120px] lg:pt-[130px]">
      {/* Header */}
      <div className="flex flex-col items-center gap-3.5">
        <GradientPill label="Rezultatul tău" />
        <h1 className="max-w-[348px] text-center text-[28px] font-semibold leading-[34px] tracking-[-1px] text-[#222222] lg:max-w-none lg:text-[54px] lg:leading-[59.4px] lg:tracking-[-1.5px]">
          Cursul potrivit{' '}
          <span className="bg-[linear-gradient(90deg,#407ea2_0%,#1c5d99_100%)] bg-clip-text text-transparent">
            pentru tine.
          </span>
        </h1>
        <p className="max-w-[350px] text-center text-[14px] leading-[21px] text-[#959595] lg:max-w-[640px] lg:text-[16px] lg:leading-[26px]">
          Pe baza răspunsurilor tale, îți recomandăm:
        </p>
      </div>

      {/* Recomandarea — 350 pe mobil, 760 pe desktop; fără badge (decizie owner) */}
      <div className="flex w-[350px] flex-col gap-3.5 rounded-[24px] border-[6px] border-[#f6f6f6] bg-white p-5 shadow-[24px_80px_50px_rgba(77,77,77,0.02),10px_36px_37px_rgba(77,77,77,0.03),3px_9px_20px_rgba(77,77,77,0.03)] lg:w-[760px] lg:gap-4 lg:p-[34px]">
        <div className="flex items-center gap-3 lg:gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-[#f6f6f6] lg:size-14">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/icon-black.svg"
              alt=""
              className="h-[22px] w-5 object-contain lg:h-[26px] lg:w-6"
            />
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
            Vezi cursul →
          </Link>
          <button
            type="button"
            onClick={onRestart}
            className="text-[14px] font-medium text-[#959595] transition-colors hover:text-[#595959] lg:text-[15px]"
          >
            Reia quiz-ul
          </button>
        </div>
      </div>

      {/* Alternative — SCOASE peste tot (decizie owner 2026-07-23); datele rămân în quiz-data.ts */}

      {/* Banda pentru echipe — stivuită pe mobil, pe orizontală (aliniată cu cardul) pe desktop */}
      <div className="flex w-[350px] flex-col items-start gap-2 rounded-[16px] bg-[#f6f6f6] px-[22px] py-[18px] lg:w-[760px] lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:px-6 lg:py-5">
        <p className="text-[13px] leading-[19px] text-[#595959] lg:max-w-[520px] lg:text-[14px] lg:leading-[21px]">
          Cauți un curs pentru o echipă sau pentru întreaga organizație? Îți construim o
          soluție personalizată.
        </p>
        <Link
          href="/corporate"
          className="shrink-0 text-[13px] font-medium text-[#1c5d99] transition-colors hover:text-[#407ea2] lg:text-[14px]"
        >
          Corporate training
        </Link>
      </div>
    </section>
  );
}
