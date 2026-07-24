/**
 * CourseQuiz — wizard-ul „Ce curs mi se potrivește?", v2 RESPONSIVE.
 * ÎNLOCUIEȘTE versiunea desktop-only.
 * Desktop (≥lg): 1:1 cu Figma 3920-115 (card 760, titlu 54).
 * Mobil (<lg):  1:1 cu Figma 3922-115 (card 350, titlu 28/34, întrebare 18/26,
 *               opțiuni 14/20 cu padding 13/16, navigare compactă).
 *
 * O ÎNTREBARE PE PAS (12 pași): progres cu bară gradient, opțiuni radio cu
 * stare selectată prin DROP SHADOW (fără bordură colorată — decizie owner).
 * Client component. TOATE valorile sunt EXPLICITE (px/hex).
 * Întrebările + logica de recomandare vin din quiz-data.ts.
 */

'use client';

import { useState } from 'react';
import { QUIZ_QUESTIONS, recommend, type QuizResultType } from './quiz-data';
import QuizResult from './QuizResult';

/** Pill cu inel gradient — construcția PillTag (inel 3px, interior alb) */
export function GradientPill({ label }: { label: string }) {
  return (
    <span className="w-fit shrink-0 rounded-[26px] bg-[linear-gradient(90deg,#1c5d99_0%,#46d3f6_25%,#1c5d99_50%,#46d3f6_75%,#1c5d99_100%)] p-[3px]">
      <span className="flex items-center whitespace-nowrap rounded-[23px] bg-white px-4 py-[2px] text-[15px] font-medium leading-[23px] text-black">
        {label}
      </span>
    </span>
  );
}

/** Radio 20px — gol (bordură gri) / selectat (inel gradient + punct gradient) */
function Radio({ selected }: { selected: boolean }) {
  if (!selected) {
    return (
      <span className="size-5 shrink-0 rounded-full border-[1.5px] border-[#d1d1d1] bg-white" />
    );
  }
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(90deg,#1c5d99_0%,#46d3f6_25%,#1c5d99_50%,#46d3f6_75%,#1c5d99_100%)] p-[2px]">
      <span className="flex size-full items-center justify-center rounded-full bg-white">
        <span className="size-2 rounded-full bg-[linear-gradient(90deg,#407ea2_0%,#1c5d99_100%)]" />
      </span>
    </span>
  );
}

export default function CourseQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    Array(QUIZ_QUESTIONS.length).fill(null),
  );
  const [result, setResult] = useState<QuizResultType | null>(null);

  const total = QUIZ_QUESTIONS.length;
  // step e mereu în [0, total-1] prin construcție (noUncheckedIndexedAccess)
  const q = QUIZ_QUESTIONS[step]!;
  const answered = answers[step] !== null;
  const isLast = step === total - 1;

  function choose(i: number) {
    const next = [...answers];
    next[step] = i;
    setAnswers(next);
  }

  function onNext() {
    if (!answered) return;
    if (isLast) setResult(recommend(answers));
    else setStep(step + 1);
  }

  function onRestart() {
    setAnswers(Array(total).fill(null));
    setStep(0);
    setResult(null);
  }

  if (result) return <QuizResult type={result} onRestart={onRestart} />;

  return (
    <section className="flex flex-col items-center gap-7 bg-[#f8f9fa] pb-16 pt-16 lg:gap-9 lg:pb-[120px] lg:pt-[130px]">
      {/* Header */}
      <div className="flex flex-col items-center gap-3.5">
        <GradientPill label="Course quiz" />
        <h1 className="max-w-[348px] text-center text-[28px] font-semibold leading-[34px] tracking-[-1px] text-[#222222] lg:max-w-none lg:text-[54px] lg:leading-[59.4px] lg:tracking-[-1.5px]">
          Ce curs mi se{' '}
          <span className="bg-[linear-gradient(90deg,#407ea2_0%,#1c5d99_100%)] bg-clip-text text-transparent">
            potrivește?
          </span>
        </h1>
        <p className="max-w-[350px] text-center text-[14px] leading-[21px] text-[#959595] lg:max-w-[640px] lg:text-[16px] lg:leading-[26px]">
          12 întrebări scurte — îți recomandăm cursul sau parcursul potrivit, în mai puțin
          de două minute.
        </p>
      </div>

      {/* Cardul de quiz — 350 pe mobil, 760 pe desktop */}
      <div className="flex w-[350px] flex-col gap-5 rounded-[24px] border-[6px] border-[#f6f6f6] bg-white p-5 shadow-[24px_80px_50px_rgba(77,77,77,0.02),10px_36px_37px_rgba(77,77,77,0.03),3px_9px_20px_rgba(77,77,77,0.03)] lg:w-[760px] lg:gap-7 lg:p-[34px]">
        {/* Progres */}
        <div className="flex flex-col gap-2 lg:gap-2.5">
          <p className="text-[12px] font-medium tracking-[-0.3px] text-[#959595] lg:text-[13px]">
            Întrebarea {step + 1} din {total}
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#ececec]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#407ea2_0%,#1c5d99_100%)] transition-[width] duration-300 ease-out"
              style={{ width: `${((step + 1) / total) * 100}%` }}
            />
          </div>
        </div>

        {/* Întrebarea */}
        <h2 className="text-[18px] font-medium leading-[26px] tracking-[-0.5px] text-[#222222] lg:text-[24px] lg:leading-8 lg:tracking-[-0.8px]">
          {q.id}. {q.question}
        </h2>

        {/* Opțiunile — selectată = DROP SHADOW, fără bordură colorată */}
        <div
          className="flex flex-col gap-2.5 lg:gap-3"
          role="radiogroup"
          aria-label={q.question}
        >
          {q.options.map((label, i) => {
            const selected = answers[step] === i;
            return (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => choose(i)}
                className={`flex w-full items-center gap-3 rounded-[16px] bg-white px-4 py-[13px] text-left transition-shadow lg:gap-3.5 lg:px-5 lg:py-4 ${
                  selected
                    ? 'shadow-[3px_9px_20px_rgba(77,77,77,0.10)]'
                    : 'border border-[#e6e6e6] hover:border-[#bdbdbd]'
                }`}
              >
                <Radio selected={selected} />
                <span
                  className={`text-[14px] leading-5 text-[#222222] lg:text-[15px] lg:leading-[22px] ${
                    selected ? 'font-medium' : ''
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Navigare */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => step > 0 && setStep(step - 1)}
            disabled={step === 0}
            className={`text-[14px] font-medium transition-colors lg:text-[15px] ${
              step === 0 ? 'cursor-default text-[#bdbdbd]' : 'text-[#959595] hover:text-[#595959]'
            }`}
          >
            ← Înapoi
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!answered}
            className="rounded-[999px] bg-gradient-to-b from-[#407ea2] to-[#1c5d99] to-[80%] px-5 pb-[11px] pt-2.5 text-[15px] font-medium leading-normal text-white shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-all hover:scale-[1.03] disabled:cursor-default disabled:opacity-50 disabled:hover:scale-100 lg:px-[22px] lg:pb-3 lg:pt-[11px] lg:text-[16px]"
          >
            {isLast ? 'Vezi rezultatul →' : 'Continuă →'}
          </button>
        </div>
      </div>
    </section>
  );
}
