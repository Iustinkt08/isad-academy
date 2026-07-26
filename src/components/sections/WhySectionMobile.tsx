/**
 * WhySectionMobile — „Why isad.academy?", DOAR PENTRU MOBIL (lg:hidden).
 * Secțiunea de desktop (WhyIsadShowcase, hidden lg:block) rămâne neatinsă.
 *
 * Comportament (owner, revizuit):
 *  — UN SINGUR card, pe aceeași poziție. Fundal ALB.
 *  — Conținutul e ALINIAT SUS: pill-ul (titlul) stă mereu în aceeași poziție, în
 *    partea de sus a cardului, indiferent de slide.
 *  — Cardul ÎȘI ANIMEAZĂ ÎNĂLȚIMEA spre conținutul slide-ului activ (se face mai
 *    mic pentru slide-urile cu mai puțin text), declanșat de swipe
 *    (transition-[height]). Notch-ul urcă/coboară lipit de marginea de jos.
 *  — La swipe, conținutul următorului slide intră din DREAPTA cu BLUR, sincron cu
 *    gestul (scroll nativ orizontal, blur scrubat). Doar primul slide are poza +
 *    numele Dr. Gresoi; restul sunt doar text; pill-ul își schimbă titlul.
 *  — NOTCH pe shell (stil identic cardurilor de cursuri: notched into the bottom
 *    edge, umbră simetrică 0 0 2px, culoarea bordurii #f6f6f6, fără stroke). Arată
 *    statistica slide-ului activ și se rotește la câteva secunde (fade `starting:`).
 *  — Respectă prefers-reduced-motion (fără blur, fără animație de înălțime/rotație).
 *
 * TOATE valorile sunt EXPLICITE (px/hex) — nu depind de override-uri @theme.
 * Client component (scroll → blur + înălțime + dots + rotația din notch).
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

type WhyCardData = {
  pill: string;
  /** doar primul slide are foto + nume */
  photo?: string;
  name?: string;
  body: string;
};

type Stat = { value: string; label: string };

/** Blur maxim aplicat conținutului complet decalat (cel centrat = 0). */
const MAX_BLUR = 6;
/** Aer vertical în jurul conținutului: pt-5 (20) sus + zonă notch (48) jos. */
const CARD_PAD = 68;
/** Intervalul de rotație a statisticii din notch */
const NOTCH_ROTATE_MS = 3200;

/**
 * Pill cu inel gradient — 1:1 cu instanța PillTag h33: inel gradient orizontal
 * #1C5D99→#46D3F6 (alternat), grosime 3px, interior alb radius 23,
 * text Poppins Medium 15/23 negru, pe UN SINGUR RÂND (nu se rupe).
 */
function GradientPill({ label }: { label: string }) {
  return (
    <span className="w-fit shrink-0 rounded-[26px] bg-[linear-gradient(90deg,#1c5d99_0%,#46d3f6_25%,#1c5d99_50%,#46d3f6_75%,#1c5d99_100%)] p-[3px]">
      <span className="flex items-center whitespace-nowrap rounded-[23px] bg-white px-4 py-[2px] text-[15px] font-medium leading-[23px] text-black">
        {label}
      </span>
    </span>
  );
}

export default function WhySectionMobile({
  locale,
  cards: cardsProp,
}: {
  locale: Locale;
  cards?: WhyCardData[];
}) {
  // Copy din dicționar (site bilingv EN/RO) — refolosește `whyShowcase` (secțiunea
  // desktop); doar stringurile specifice mobilului stau în `whyMobile`.
  const dict = getDictionary(locale);
  const tw = dict.whyShowcase;
  const tm = dict.whyMobile;
  const cards: WhyCardData[] = cardsProp ?? [
    {
      pill: tw.cards.practitioner.title,
      photo: '/silviu-gresoi.png', // ← asset-ul existent al pozei lui Dr. Gresoi din repo
      name: 'Dr. Silviu Gresoi',
      body: tw.cards.practitioner.body,
    },
    {
      pill: tw.cards.pecb.title,
      body: tw.cards.pecb.body,
    },
    {
      pill: tm.aiPill,
      body: tw.cards.ai.body,
    },
  ];
  /** Pool de statistici pentru notch — arată statistica slide-ului activ și se rotește
      la câteva secunde. Ordinea = maparea per slide (0 → 20+, 1 → 2,000+, 2 → 100+). */
  const notchStats: Stat[] = [
    { value: tw.statsFallback.years.num, label: tw.statsFallback.years.label },
    { value: tw.statsFallback.companies.num, label: tw.statsFallback.companies.label },
    { value: tw.statsFallback.sessions.num, label: tw.statsFallback.sessions.label },
  ];
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const heightsRef = useRef<number[]>([]);
  const activeIndexRef = useRef(0);
  const reducedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const touchingRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [shellH, setShellH] = useState<number | undefined>(undefined);
  const [tick, setTick] = useState(0);

  /* Blur scrubat: fiecare slide primește blur după cât de departe e de centru (o
     „pagină" = lățimea scroller-ului). Slide-ul centrat = clar; cel care intră din
     dreapta = blurat până ajunge în centru. Scriem stilul direct pe DOM → sincron
     cu degetul, fără re-render la fiecare frame. */
  const applyBlur = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const unit = scroller.clientWidth || 1;
    const sl = scroller.scrollLeft;
    const reduced = reducedRef.current;
    contentRefs.current.forEach((el, i) => {
      if (!el) return;
      if (reduced) {
        el.style.filter = '';
        el.style.opacity = '1';
        return;
      }
      const dist = Math.min(1, Math.abs(sl - i * unit) / unit);
      el.style.filter = dist ? `blur(${(dist * MAX_BLUR).toFixed(2)}px)` : '';
      el.style.opacity = (1 - dist * 0.25).toFixed(3);
    });
  }, []);

  /* Măsoară înălțimea NATURALĂ a conținutului fiecărui slide (independent de
     înălțimea shell-ului) și fixează înălțimea cardului pe slide-ul activ. */
  const measure = useCallback(() => {
    heightsRef.current = contentRefs.current.map((el) => (el ? el.offsetHeight : 0));
    const h = heightsRef.current[activeIndexRef.current];
    if (h) setShellH(h + CARD_PAD);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = mq.matches;
    measure();
    applyBlur();

    const ro = new ResizeObserver(() => measure());
    contentRefs.current.forEach((el) => el && ro.observe(el));
    const onResize = () => {
      measure();
      applyBlur();
    };
    window.addEventListener('resize', onResize);
    const onMQ = () => {
      reducedRef.current = mq.matches;
      applyBlur();
    };
    mq.addEventListener('change', onMQ);
    document.fonts?.ready.then(() => measure()).catch(() => {});

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      mq.removeEventListener('change', onMQ);
      if (settleTimerRef.current != null) window.clearTimeout(settleTimerRef.current);
    };
  }, [measure, applyBlur]);

  /* Rotația statisticii din notch — doar dacă mișcarea e permisă. */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setTick((t) => t + 1), NOTCH_ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  /* La finalul gestului (fără evenimente de scroll ~160ms): abia ACUM animăm
     înălțimea cardului și, dacă snap-ul a rămas agățat între două pagini (bug iOS
     când layout-ul se schimbă mid-swipe), realiniem la pagina cea mai apropiată. */
  const settle = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const unit = el.clientWidth || 1;
    const idx = Math.max(0, Math.min(cards.length - 1, Math.round(el.scrollLeft / unit)));
    activeIndexRef.current = idx;
    setActiveIndex(idx);
    const h = heightsRef.current[idx];
    if (h) setShellH(h + CARD_PAD);
    if (!touchingRef.current && Math.abs(el.scrollLeft - idx * unit) > 2) {
      el.scrollTo({ left: idx * unit, behavior: 'smooth' });
    }
  }, [cards.length]);

  function onScroll() {
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        applyBlur();
        const el = scrollerRef.current;
        if (!el) return;
        const unit = el.clientWidth || 1;
        const idx = Math.max(0, Math.min(cards.length - 1, Math.round(el.scrollLeft / unit)));
        if (idx !== activeIndexRef.current) {
          activeIndexRef.current = idx;
          // Doar dots-urile se actualizează mid-swipe; înălțimea așteaptă settle()
          // — schimbarea ei în plin gest rupea scroll-snap-ul pe iOS.
          setActiveIndex(idx);
        }
      });
    }
    if (settleTimerRef.current != null) window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(settle, 160);
  }

  function scrollTo(idx: number) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
  }

  const stat = notchStats[(activeIndex + tick) % notchStats.length]!;
  const statKey = (activeIndex + tick) % notchStats.length;

  return (
    <section className="bg-white pb-14 pt-16 lg:hidden">
      {/* Titlu — Poppins SemiBold 28/34, -1px, #222222 */}
      <h2 className="text-center text-[28px] font-semibold leading-[34px] tracking-[-1px] text-[#222222]">
        {tw.heading}
      </h2>

      {/* Subtitlu — 14/21 #959595, max 350px, la 16px sub titlu; refolosește cele
          trei fragmente ale showcase-ului de desktop, îmbinate într-o singură frază */}
      <p className="mx-auto mt-4 max-w-[350px] text-center text-[14px] leading-[21px] text-[#959595]">
        {`${tw.subLead} ${tw.subHighlight}, ${tw.subTail}`}
      </p>

      {/* CARD — shell pe aceeași poziție; înălțimea se ANIMEAZĂ spre slide-ul activ.
          Conținutul e aliniat SUS (pill fix). Centrat, fără peek. */}
      <div className="mt-9 flex justify-center px-5">
        <div className="relative w-[350px] max-w-full overflow-hidden rounded-[24.7px] border-[6px] border-[#f6f6f6] bg-white shadow-[0_18px_38px_rgba(77,77,77,0.1),0_7px_15px_rgba(77,77,77,0.08),0_2px_6px_rgba(77,77,77,0.06)]">
          {/* Scroller orizontal — înălțimea (deci a cardului) se animează spre slide-ul
              activ; slide-urile sunt aliniate SUS (items-start + pt-5). */}
          <div
            ref={scrollerRef}
            onScroll={onScroll}
            onTouchStart={() => {
              touchingRef.current = true;
            }}
            onTouchEnd={() => {
              touchingRef.current = false;
            }}
            onTouchCancel={() => {
              touchingRef.current = false;
            }}
            style={{ height: shellH }}
            className="flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden transition-[height] duration-300 ease-out motion-reduce:transition-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {cards.map((card, i) => (
              <div
                key={card.pill}
                className="flex h-full w-full shrink-0 snap-start items-start justify-center px-[18px] pt-5"
              >
                <div
                  ref={(el) => {
                    contentRefs.current[i] = el;
                  }}
                  className="flex w-full flex-col items-center gap-4 will-change-[filter,opacity]"
                >
                  <GradientPill label={card.pill} />

                  {card.photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.photo}
                      alt={card.name ?? ''}
                      className="size-[72px] rounded-full object-cover"
                    />
                  )}

                  {card.name && (
                    <p className="text-center text-[14px] font-medium leading-[21px] tracking-[-0.3px] text-[#222222]">
                      {card.name}
                    </p>
                  )}

                  {/* Body — text negru (#000) */}
                  <p className="w-full text-center text-[14px] leading-[21px] text-black">
                    {card.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Stat Notch — pe shell-ul static, stilul cardurilor de cursuri: notched
              into the bottom edge, culoarea bordurii (#f6f6f6), umbră simetrică (fără
              stroke). Arată statistica slide-ului activ; la schimbare (swipe sau
              rotație) span-ul se remontează (key) și intră cu fade prin `starting:`. */}
          <div className="absolute bottom-0 left-1/2 z-10 flex h-6 -translate-x-1/2 items-center whitespace-nowrap rounded-t-[18px] bg-[#f6f6f6] px-3 drop-shadow-[0_0_2px_rgba(122,122,122,0.33)]">
            <span
              key={statKey}
              className="text-[11px] font-medium leading-[19.2px] tracking-[-0.4px] opacity-100 transition-opacity duration-500 ease-out starting:opacity-0 motion-reduce:transition-none"
            >
              <span className="text-[#1c5d99]">{stat.value} </span>
              <span className="text-black">{stat.label}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Dots — activ = pilulă gradient 22×8, inactive = 8px gri */}
      <div
        className="mt-6 flex items-center justify-center gap-[7px]"
        role="tablist"
        aria-label={tm.dotsAria}
      >
        {cards.map((card, i) => (
          <button
            key={card.pill}
            role="tab"
            aria-selected={i === activeIndex}
            aria-label={card.pill}
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
