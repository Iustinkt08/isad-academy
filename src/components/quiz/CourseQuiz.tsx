/**
 * CourseQuiz — wizard-ul „Ce curs mi se potrivește?", v3 RESPONSIVE + LOADER.
 * ÎNLOCUIEȘTE versiunea anterioară.
 * Desktop (≥lg): 1:1 cu Figma 3920-115 (card 760, padding 40, titlu 54).
 * Mobil (<lg):  1:1 cu Figma 3922-115 (card 350, padding 26, titlu 28/34,
 *               întrebare 18/26, opțiuni 14/20 cu padding 13/16).
 *
 * O ÎNTREBARE PE PAS (12 pași): progres cu bară gradient, opțiuni radio cu
 * stare selectată prin DROP SHADOW (fără bordură colorată — decizie owner).
 *
 * v3 NOU — LOADER-ul de după finalizare (cerința owner-ului): la „Vezi
 * rezultatul →" cardul intră ~1.8s într-o stare de „analizăm răspunsurile",
 * cu un inel gradient care se rotește (limbajul inelului de brand), apoi
 * apare recomandarea. `prefers-reduced-motion` → inelul stă pe loc.
 *
 * Client component. TOATE valorile sunt EXPLICITE (px/hex).
 * Întrebările + logica de recomandare vin din quiz-data.ts.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import {
  getQuizQuestions,
  QUIZ_UI,
  recommend,
  type QuizCourseProfile,
  type QuizLocale,
  type QuizRecommendation,
} from './quiz-data';
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

/** Durata loader-ului (ms) — suficient să se simtă „calculul", nu să enerveze */
const LOADER_MS = 1800;

/** Cheia de progres din sessionStorage — comuna ambelor limbi (owner 2026-07-26) */
const QUIZ_STORAGE_KEY = 'isad-quiz-progress';

export default function CourseQuiz({
  courses = [],
  locale = 'ro',
}: {
  courses?: QuizCourseProfile[];
  locale?: QuizLocale;
}) {
  // Bilingv (owner 2026-07-26): întrebările + UI-ul urmează limba selectată; ordinea
  // opțiunilor e identică EN/RO, deci `recommend()` (pe indexuri) rămâne neatins.
  const ui = QUIZ_UI[locale];
  const questions = getQuizQuestions(locale);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    Array(questions.length).fill(null),
  );
  const [phase, setPhase] = useState<'quiz' | 'loading' | 'result'>('quiz');
  const [result, setResult] = useState<QuizRecommendation | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  /* Progresul supraviețuiește schimbării de limbă (owner 2026-07-26): răspunsurile sunt
   * INDEXURI de opțiuni (identice EN/RO), deci starea se restaurează 1:1 pe cealaltă rută.
   * sessionStorage = per tab, se golește singur la închidere (fără cookies/localStorage). */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(QUIZ_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { step?: number; answers?: unknown; phase?: string };
      if (
        !Array.isArray(saved.answers) ||
        saved.answers.length !== questions.length ||
        !saved.answers.every((a) => a === null || (typeof a === 'number' && Number.isInteger(a)))
      )
        return;
      const restored = saved.answers as (number | null)[];
      setAnswers(restored);
      setStep(Math.min(Math.max(0, saved.step ?? 0), questions.length - 1));
      if (saved.phase === 'result') {
        setResult(recommend(restored, courses));
        setPhase('result');
      }
    } catch {
      /* stare coruptă → quiz de la zero */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Persistăm DOAR din handlerele de acțiune (niciodată la montare) — un efect pe state
   * ar suprascrie progresul salvat cu starea inițială înainte de restaurare (StrictMode
   * dublează efectele în dev și garanta clobbering-ul). */
  function saveProgress(next: {
    step: number;
    answers: (number | null)[];
    phase: 'quiz' | 'result';
  }) {
    try {
      sessionStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage indisponibil (privat/quota) → quiz-ul merge fără persistență */
    }
  }

  const total = questions.length;
  // `step` e mereu în [0, total-1] — assertion cerută de `noUncheckedIndexedAccess`.
  const q = questions[step]!;
  const answered = answers[step] !== null;
  const isLast = step === total - 1;

  function choose(i: number) {
    const next = [...answers];
    next[step] = i;
    setAnswers(next);
    saveProgress({ step, answers: next, phase: 'quiz' });
  }

  function onNext() {
    if (!answered) return;
    if (isLast) {
      /* LOADER: „încărcăm răspunsurile" → apoi rezultatul */
      setPhase('loading');
      timerRef.current = setTimeout(() => {
        setResult(recommend(answers, courses));
        setPhase('result');
        saveProgress({ step, answers, phase: 'result' });
      }, LOADER_MS);
    } else {
      setStep(step + 1);
      saveProgress({ step: step + 1, answers, phase: 'quiz' });
    }
  }

  function onBack() {
    if (step === 0) return;
    setStep(step - 1);
    saveProgress({ step: step - 1, answers, phase: 'quiz' });
  }

  function onRestart() {
    try {
      sessionStorage.removeItem(QUIZ_STORAGE_KEY);
    } catch {
      /* noop */
    }
    setAnswers(Array(total).fill(null));
    setStep(0);
    setResult(null);
    setPhase('quiz');
  }

  if (phase === 'result' && result)
    return <QuizResult recommendation={result} locale={locale} onRestart={onRestart} />;

  return (
    <section className="flex flex-col items-center gap-7 bg-[#f8f9fa] pb-16 pt-16 lg:gap-9 lg:pb-[120px] lg:pt-20">
      {/* Header */}
      <div className="flex flex-col items-center gap-3.5">
        <GradientPill label={ui.pill} />
        <h1 className="max-w-[348px] text-center text-[28px] font-semibold leading-[34px] tracking-[-1px] text-[#222222] lg:max-w-none lg:text-[54px] lg:leading-[59.4px] lg:tracking-[-1.5px]">
          {ui.titlePlain}
          <span className="bg-[linear-gradient(90deg,#407ea2_0%,#1c5d99_100%)] bg-clip-text text-transparent">
            {ui.titleGradient}
          </span>
          {/* Semnul final rămâne NEGRU (convenția titlurilor — owner 2026-07-26) */}
          {ui.titlePunctuation}
        </h1>
        <p className="max-w-[350px] text-center text-[14px] leading-[21px] text-[#959595] lg:max-w-[640px] lg:text-[16px] lg:leading-[26px]">
          {ui.sub}
        </p>
      </div>

      {/* Cardul — 350/26 pe mobil, 760/40 pe desktop */}
      <div className="flex w-[350px] flex-col gap-5 rounded-[24px] border-[6px] border-[#f6f6f6] bg-white p-[26px] shadow-[24px_80px_50px_rgba(77,77,77,0.02),10px_36px_37px_rgba(77,77,77,0.03),3px_9px_20px_rgba(77,77,77,0.03)] lg:w-[760px] lg:gap-7 lg:p-10">
        {phase === 'loading' ? (
          /* ============ LOADER — analizăm răspunsurile ============ */
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center gap-4 py-14 lg:gap-5 lg:py-24"
          >
            {/* Inelul de brand, rotit — gradient + interior alb */}
            <span className="flex size-11 animate-spin items-center justify-center rounded-full bg-[conic-gradient(from_0deg,#1c5d99_0%,#46d3f6_30%,#1c5d99_55%,#46d3f6_80%,#1c5d99_100%)] p-[3px] [animation-duration:0.9s] motion-reduce:animate-none lg:size-12">
              <span className="size-full rounded-full bg-white" />
            </span>
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-[16px] font-medium tracking-[-0.4px] text-[#222222] lg:text-[18px]">
                {ui.loaderTitle}
              </p>
              <p className="text-[13px] leading-[19px] text-[#959595] lg:text-[14px]">
                {ui.loaderSub}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Progres */}
            <div className="flex flex-col gap-2 lg:gap-2.5">
              <p className="text-[12px] font-medium tracking-[-0.3px] text-[#959595] lg:text-[13px]">
                {ui.progress(step + 1, total)}
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
                onClick={onBack}
                disabled={step === 0}
                className={`text-[14px] font-medium transition-colors lg:text-[15px] ${
                  step === 0
                    ? 'cursor-default text-[#bdbdbd]'
                    : 'text-[#959595] hover:text-[#595959]'
                }`}
              >
                {ui.back}
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={!answered}
                className="rounded-[999px] bg-gradient-to-b from-[#407ea2] to-[#1c5d99] to-[80%] px-5 pb-[11px] pt-2.5 text-[15px] font-medium leading-normal text-white shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-all hover:scale-[1.03] disabled:cursor-default disabled:opacity-50 disabled:hover:scale-100 lg:px-[22px] lg:pb-3 lg:pt-[11px] lg:text-[16px]"
              >
                {isLast ? ui.seeResult : ui.next}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
