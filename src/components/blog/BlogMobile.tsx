/**
 * Blog / MOBILE (<lg) — 1:1 cu Figma 3977-612. DESKTOPUL RĂMÂNE NESCHIMBAT
 * (e deja implementat) — blocurile de aici se montează cu `lg:hidden`, iar
 * blocurile de desktop existente primesc `hidden lg:...` în blog/page.tsx.
 *
 * Structura pe mobil: Header centrat → „Latest article" (cel mai RECENT
 * articol, card mare) → „More articles — swipe" (slider cu snap + dots) →
 * Newsletter. ACEEAȘI logică de imagini ca pe desktop: articolele cu poză
 * afișează poza; cele fără poză afișează ACELAȘI placeholder existent —
 * monograma Figma `/brand/blog-monogram.svg` (fade alb + grain incluse în
 * asset), geometria exactă din BlogCard (167×148, top 42, -right-2).
 *
 * Adaptări de integrare față de fișierul livrat (vizual identic):
 *  — linkurile vin gata construite prin `post.href` (locale-aware, din pagină);
 *  — stringurile UI vin din dicționar (site bilingv EN/RO);
 *  — newsletter-ul folosește CONTRACTUL existent Brevo double opt-in:
 *    POST /api/newsletter { email } → { ok } (același ca BlogNewsletterCta).
 *
 * TOATE valorile sunt EXPLICITE (px/hex).
 */

'use client';

import { useRef, useState } from 'react';

import type { ApiOkEnvelope } from '@/lib/api/envelope';
import { getDictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/i18n/config';

export type BlogPostCard = {
  slug: string;
  /** Link locale-aware către articol (construit în pagină cu localePath). */
  href: string;
  title: string;
  excerpt: string;
  date: string; // ex. „05.07.2026" (formatDotStamp, ca pe desktop)
  category: string; // eticheta localizată — apare pe placeholder
  cover?: string | null;
  isNew?: boolean; // chip-ul „New" — doar pe cardul featured
};

/* ---------- Header (centrat) ---------- */
export function BlogHeaderMobile({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).blog;
  return (
    <header className="flex flex-col items-center gap-3 px-7 pt-16 lg:hidden">
      <h1 className="text-center text-[min(7.18vw,28px)] font-semibold leading-[1.22] tracking-[-1px] text-[#222222]">
        {t.headerTitlePlain}{' '}
        <span className="bg-[linear-gradient(90deg,#407ea2_0%,#1c5d99_100%)] bg-clip-text text-transparent">
          {t.headerTitleGradient}
        </span>
        {/* Punctul final rămâne NEGRU (convenția titlurilor site-ului — owner 2026-07-26) */}
        <span className="text-[#222222]">.</span>
      </h1>
      <p className="max-w-[min(350px,calc(100vw_-_40px))] text-center text-[14px] leading-[21px] text-[#959595]">
        {t.headerSub}
      </p>
    </header>
  );
}

/* ---------- Coperta / placeholder-ul de brand (ACELAȘI asset ca pe desktop) ---------- */
function CardCover({ post, brandLabel }: { post: BlogPostCard; brandLabel: string }) {
  if (post.cover) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={post.cover} alt="" className="h-[190px] w-full shrink-0 object-cover" />
    );
  }
  return (
    <div className="relative h-[190px] w-full shrink-0 overflow-hidden bg-white">
      {/* Monograma „A" — asset-ul EXISTENT al desktopului (fade alb + grain incluse) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/blog-monogram.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -right-2 top-[42px] h-[148px] w-[167px] select-none"
      />
      <span className="absolute left-7 top-[30px] whitespace-nowrap text-[12px] font-medium text-[#000000]">
        {brandLabel}
      </span>
      <span className="absolute left-7 top-24 line-clamp-2 max-w-[240px] text-[26px] font-semibold leading-8 tracking-[-0.8px] text-[#000000]">
        {post.category}
      </span>
    </div>
  );
}

/* ---------- Butonul negru „Read article" (limbajul existent al site-ului) ---------- */
function ReadArticleBtn({ label }: { label: string }) {
  return (
    <span className="shrink-0 rounded-[20px] bg-black px-4 py-2 text-[14px] font-semibold text-white transition-transform group-hover:scale-[1.03]">
      {label}
    </span>
  );
}

/* ---------- Chip „New" — pill alb + dot și text albastru #1C5D99 ---------- */
function NewChip({ label }: { label: string }) {
  return (
    <span className="flex w-fit items-center gap-2 rounded-[999px] bg-white px-3.5 py-[9px] shadow-[0_4px_14px_rgba(0,0,0,0.12)]">
      <span aria-hidden className="size-2.5 rounded-full bg-[#1c5d99]" />
      <span className="text-[12.5px] font-medium text-[#1c5d99]">{label}</span>
    </span>
  );
}

/* ---------- Cardul featured — „Latest article" (350, înălțime naturală) ---------- */
export function FeaturedArticleCard({
  post,
  locale,
}: {
  post: BlogPostCard;
  locale: Locale;
}) {
  const t = getDictionary(locale).blog;
  return (
    <a
      href={post.href}
      className="group flex w-full flex-col overflow-hidden rounded-[24px] bg-white shadow-[3px_9px_20px_rgba(77,77,77,0.04)]"
    >
      <CardCover post={post} brandLabel={t.brandLabel} />
      <div className="flex flex-col gap-3 px-7 pb-6 pt-[22px]">
        {post.isNew && <NewChip label={t.newBadge} />}
        <h2 className="line-clamp-2 text-[20px] font-medium leading-[27px] tracking-[-0.7px] text-[#222222]">
          {post.title}
        </h2>
        <p className="line-clamp-3 text-[14px] leading-[22px] text-[#959595]">{post.excerpt}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-[13px] text-[#959595]">{post.date}</span>
          <ReadArticleBtn label={t.readArticle} />
        </div>
      </div>
    </a>
  );
}

/* ---------- Cardul din slider (300×458, footer-ul PINAT jos) ---------- */
function SliderCard({ post, locale }: { post: BlogPostCard; locale: Locale }) {
  const t = getDictionary(locale).blog;
  return (
    <a
      href={post.href}
      className="group flex h-[458px] w-[min(300px,calc(100vw_-_40px))] shrink-0 snap-start flex-col overflow-hidden rounded-[24px] bg-white shadow-[3px_9px_20px_rgba(77,77,77,0.04)]"
    >
      <CardCover post={post} brandLabel={t.brandLabel} />
      <div className="flex min-h-0 flex-1 flex-col justify-between px-7 pb-6 pt-[22px]">
        <div className="flex flex-col gap-3">
          {/* Clamp-uri: cardul are 458px ficși — textul lung din CMS s-ar tăia brut */}
          <h3 className="line-clamp-2 text-[20px] font-medium leading-[27px] tracking-[-0.7px] text-[#222222]">
            {post.title}
          </h3>
          <p className="line-clamp-3 text-[14px] leading-[22px] text-[#959595]">{post.excerpt}</p>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-[13px] text-[#959595]">{post.date}</span>
          <ReadArticleBtn label={t.readArticle} />
        </div>
      </div>
    </a>
  );
}

/* ---------- Sliderul „More articles" + dots sincronizate ---------- */
const CARD_W = 300;
const GAP = 12;

export function BlogSliderMobile({
  posts,
  locale,
}: {
  posts: BlogPostCard[];
  locale: Locale;
}) {
  const t = getDictionary(locale).blog;
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function onScroll() {
    const el = trackRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / (CARD_W + GAP));
    setActive(Math.max(0, Math.min(posts.length - 1, idx)));
  }

  return (
    <div className="flex flex-col gap-6 lg:hidden">
      <p className="px-7 text-[16px] font-medium tracking-[-0.3px] text-[#222222]">
        {t.swipeLabel}
      </p>

      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-7 pl-7 pr-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {posts.map((p) => (
          <SliderCard key={p.slug} post={p} locale={locale} />
        ))}
      </div>

      {/* Dots — activ 22×8 pill gradient, inactive 8px #d1d1d1, gap 7. Tranziție SMOOTH
          (owner 2026-07-26): lățimea se animă, gradientul face crossfade prin stratul
          interior cu opacity animat (un singur element per dot → animabil). */}
      <div className="flex items-center justify-center gap-[7px]" aria-hidden>
        {posts.map((p, i) => (
          <span
            key={p.slug}
            className={`relative h-2 overflow-hidden rounded-[999px] bg-[#d1d1d1] transition-[width] duration-300 ease-out ${
              i === active ? 'w-[22px]' : 'w-2'
            }`}
          >
            <span
              className={`absolute inset-0 rounded-[999px] bg-[linear-gradient(90deg,#407ea2_0%,#1c5d99_100%)] transition-opacity duration-300 ${
                i === active ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Newsletter (350, pill cu buton gradient — contractul Brevo existent) ---------- */
export function NewsletterMobile({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).blog;
  const f = getDictionary(locale).newsletterForm;
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get('email') ?? '').trim();
    if (!email) return;

    setStatus('loading');
    setMessage('');
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json().catch(() => null)) as ApiOkEnvelope | null;
      if (response.ok && data?.ok) {
        setStatus('success');
        setMessage(f.success);
        form.reset();
      } else {
        setStatus('error');
        setMessage(data && !data.ok ? data.error : f.genericError);
      }
    } catch {
      setStatus('error');
      setMessage(f.genericError);
    }
  }

  return (
    <form
      className="mx-5 flex flex-col gap-2.5 rounded-[24px] border-[6px] border-[#f6f6f6] bg-white p-6 shadow-[3px_9px_20px_rgba(77,77,77,0.04)] lg:hidden"
      onSubmit={handleSubmit}
    >
      <p className="text-[16px] font-medium tracking-[-0.3px] text-[#222222]">
        {t.mobileNewsTitle}
      </p>
      <p className="text-[12px] leading-[18px] text-[#959595]">{t.mobileNewsSub}</p>
      <div className="mt-2 flex items-center justify-between gap-2 rounded-[999px] border border-[#e6e6e6] bg-white p-[5px] pl-4">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          aria-label={f.emailLabel}
          placeholder={t.emailPlaceholder}
          disabled={status === 'loading'}
          className="min-w-0 flex-1 bg-transparent text-[13px] leading-[19px] text-[#222222] placeholder:text-[#959595] focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="shrink-0 rounded-[999px] bg-gradient-to-b from-[#407ea2] to-[#1c5d99] to-[80%] px-4 pb-[9px] pt-2 text-[14px] font-medium text-white transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'loading' ? f.sending : f.subscribe}
        </button>
      </div>
      {message && (
        <p role="status" aria-live="polite" className="text-[12px] leading-[18px] text-[#595959]">
          {message}
        </p>
      )}
    </form>
  );
}
