/**
 * About / Beliefs — „What guides us". v3 RESPONSIVE. ÎNLOCUIEȘTE BeliefsPath.tsx.
 *
 * Desktop (≥lg): 1:1 cu Figma 3873-94 — traseul ORIZONTAL: subtitlu 24 #407EA2,
 *   3 waypoints (cerc 44 cu inel gradient + număr) pe linia gradient 800×3,
 *   crezurile sub puncte; linia se termină la waypoint-ul 3, fără cerc gol
 *   la capăt (owner 2026-08-03).
 *
 * Mobil (<lg): 1:1 cu Figma 3977-571 — traseul VERTICAL cu INFORMAȚIA LA PUNCTE:
 *   subtitlu 20 aliniat stânga; linia gradient verticală prin centrul cercurilor;
 *   fiecare punct = crezul (17/26, finalul în gradient) + paragraful valorii
 *   (titlul valorii Medium #222 + restul #595959, 13.5/20); waypoint gol jos.
 *   REVEAL LA SCROLL (owner 2026-07-28, v2): linia se „umple" progresiv cu
 *   scroll-ul, iar fiecare punct (cerc + text) se aprinde EXACT când frontul
 *   liniei ajunge la cercul lui — nu independent, pe viewport. Traseul e
 *   alungit (gap 64) ca reveal-ul să se întindă pe mai mult scroll; punctul
 *   gol se aprinde ultimul; prefers-reduced-motion → totul static la 100%.
 *
 * Client component (progresul liniei conduce tot reveal-ul).
 * TOATE valorile sunt EXPLICITE (px/hex). NIMIC adăugat față de design.
 */

'use client';

import { useEffect, useRef, useState } from 'react';

import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

/** Inelul gradient al brandului, în formă de cerc (construcția PillTag).
 * `color` înlocuiește gradientul cu o culoare solidă — cerculețul de la CAPĂTUL
 * traseului preia culoarea de final a liniei (owner 2026-07-28). */
function RingCircle({
  size,
  ring,
  color,
  children,
}: {
  size: number;
  ring: number;
  color?: string;
  children?: React.ReactNode;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full ${
        color
          ? ''
          : 'bg-[linear-gradient(90deg,#1c5d99_0%,#46d3f6_25%,#1c5d99_50%,#46d3f6_75%,#1c5d99_100%)]'
      }`}
      style={{ width: size, height: size, padding: ring, ...(color ? { backgroundColor: color } : {}) }}
    >
      <span className="flex size-full items-center justify-center rounded-full bg-white">
        {children}
      </span>
    </span>
  );
}

const GRAD_TEXT =
  'bg-[linear-gradient(90deg,#407ea2_0%,#1c5d99_100%)] bg-clip-text text-transparent';

export default function BeliefsPath({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).about;
  // Crezurile vin din dicționar (site bilingv EN/RO); numărul waypoint-ului = indexul.
  const beliefs = t.beliefs;
  const pathRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>(
    Array(beliefs.length + 1).fill(false), // +1 = waypoint-ul gol
  );
  const [lineProgress, setLineProgress] = useState(0);

  /* Linia se umple progresiv cu scroll-ul, iar punctele se aprind (o singură
   * dată) când frontul liniei ajunge la centrul cercului lor — reveal-ul
   * textului e astfel sincronizat cu linia, nu cu viewport-ul. */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealed(Array(beliefs.length + 1).fill(true));
      setLineProgress(1);
      return;
    }

    let raf = 0;
    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = pathRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const trigger = window.innerHeight * 0.6;
        const progress = Math.max(0, Math.min(1, (trigger - rect.top) / rect.height));
        setLineProgress(progress);

        // Frontul liniei, în coordonatele containerului (linia începe la 22px
        // — centrul primului cerc — și are înălțimea container - 30).
        const frontY = 22 + (el.offsetHeight - 30) * progress;
        setRevealed((prev) => {
          let changed = false;
          const next = [...prev];
          itemRefs.current.forEach((item, idx) => {
            if (!item || next[idx]) return;
            // centrul cercului: 22 la waypoint-urile numerotate (44px), 8 la cel gol (16px)
            const centerY = item.offsetTop + (idx === beliefs.length ? 8 : 22);
            if (frontY >= centerY - 1) {
              next[idx] = true;
              changed = true;
            }
          });
          return changed ? next : prev;
        });
      });
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [beliefs.length]);

  return (
    <section className="bg-[#f8f9fa]">
      {/* ============ DESKTOP (≥lg) — traseul ORIZONTAL, neschimbat ============ */}
      <div className="hidden flex-col items-center gap-9 pb-11 pt-10 lg:flex">
        <h2 className="text-center text-[24px] font-semibold leading-9 text-[#407ea2]">
          {t.beliefsHeading}
        </h2>
        <div className="relative flex w-[1160px] gap-10">
          <div
            aria-hidden
            className="absolute left-[180px] top-[20.5px] h-[3px] w-[800px] rounded-[2px] bg-[linear-gradient(90deg,#407ea2_0%,#1c5d99_55%,#46d3f6_100%)]"
          />
          {beliefs.map((b, i) => (
            <div
              key={b.tail}
              className="relative flex w-[360px] flex-col items-center gap-[18px]"
            >
              <RingCircle size={44} ring={3}>
                <span className={`text-[15px] font-semibold ${GRAD_TEXT}`}>{i + 1}</span>
              </RingCircle>
              <p className="text-center text-[21px] font-medium leading-[30px] tracking-[-0.6px] text-[#222222]">
                {b.lead}
                <span className={GRAD_TEXT}>{b.tail}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ============ MOBIL (<lg) — traseul VERTICAL cu informația la puncte ============ */}
      <div className="mx-auto flex w-[min(350px,calc(100vw_-_40px))] flex-col gap-7 pb-0 pt-0 lg:hidden">
        <h2 className="text-[20px] font-semibold leading-[28px] text-[#407ea2]">
          {t.beliefsHeading}
        </h2>

        {/* gap 128 — distanță mare între puncte, reveal întins pe mult scroll */}
        <div ref={pathRef} className="relative flex flex-col gap-32">
          {/* Șina liniei (statică, estompată) + umplerea progresivă */}
          <div
            aria-hidden
            className="absolute left-[20.5px] top-[22px] w-[3px] rounded-[2px] bg-[linear-gradient(180deg,#407ea2_0%,#1c5d99_55%,#46d3f6_100%)] opacity-[0.15]"
            style={{ height: 'calc(100% - 30px)' }}
          />
          <div
            aria-hidden
            className="absolute left-[20.5px] top-[22px] w-[3px] origin-top rounded-[2px] bg-[linear-gradient(180deg,#407ea2_0%,#1c5d99_55%,#46d3f6_100%)] transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{ height: 'calc(100% - 30px)', transform: `scaleY(${lineProgress})` }}
          />

          {/* Cercul e STRATIFICAT (nu se estompează ca întreg): discul de fundal +
              interiorul alb rămân mereu OPACE — linia nu se vede niciodată PRIN
              cerc — iar inelul gradient, cifra și textul fac fade la reveal. */}
          {beliefs.map((b, i) => (
            <div
              key={b.tail}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              className="relative flex items-start gap-4"
            >
              <span className="relative size-11 shrink-0" aria-hidden>
                {/* discul opac de fundal — blochează linia pe toată aria cercului */}
                <span className="absolute inset-0 rounded-full bg-[#f8f9fa]" />
                {/* inelul gradient — face fade */}
                <span
                  className={`absolute inset-0 rounded-full bg-[linear-gradient(90deg,#1c5d99_0%,#46d3f6_25%,#1c5d99_50%,#46d3f6_75%,#1c5d99_100%)] transition-opacity duration-700 ease-out motion-reduce:transition-none ${
                    revealed[i] ? 'opacity-100' : 'opacity-[0.15]'
                  }`}
                />
                {/* interiorul alb — mereu opac */}
                <span className="absolute inset-[3px] flex items-center justify-center rounded-full bg-white">
                  <span
                    className={`text-[15px] font-semibold ${GRAD_TEXT} transition-opacity duration-700 ease-out motion-reduce:transition-none ${
                      revealed[i] ? 'opacity-100' : 'opacity-[0.15]'
                    }`}
                  >
                    {i + 1}
                  </span>
                </span>
              </span>
              <div
                className={`flex min-w-0 flex-1 flex-col gap-2 transition-opacity duration-700 ease-out motion-reduce:transition-none ${
                  revealed[i] ? 'opacity-100' : 'opacity-[0.15]'
                }`}
              >
                <p className="text-[17px] font-medium leading-[26px] tracking-[-0.5px] text-[#222222]">
                  {b.lead}
                  <span className={GRAD_TEXT}>{b.tail}</span>
                </p>
                <p className="text-[13.5px] leading-5 text-[#595959]">
                  <span className="font-medium text-[#222222]">{b.infoTitle}</span>
                  {b.infoBody}
                </p>
              </div>
            </div>
          ))}

          {/* Waypoint-ul GOL de la capăt — aceeași stratificare, se aprinde ultimul */}
          <div
            ref={(el) => {
              itemRefs.current[beliefs.length] = el;
            }}
            className="relative flex pl-3.5"
          >
            <span className="relative size-4 shrink-0" aria-hidden>
              <span className="absolute inset-0 rounded-full bg-[#f8f9fa]" />
              <span
                className={`absolute inset-0 rounded-full bg-[#46d3f6] transition-opacity duration-700 ease-out motion-reduce:transition-none ${
                  revealed[beliefs.length] ? 'opacity-100' : 'opacity-[0.15]'
                }`}
              />
              <span className="absolute inset-[3px] rounded-full bg-white" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
