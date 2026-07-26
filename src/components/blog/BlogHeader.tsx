import { getDictionary } from '@/lib/i18n/dictionaries'
import type { Locale } from '@/lib/i18n/config'

/**
 * Blog list header — Figma 3802:39: centered two-tone title ("Articles & insights.",
 * the second word carrying the brand gradient) over a single muted intro line.
 */
export default function BlogHeader({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).blog

  return (
    <header className="flex flex-col items-center gap-5 px-4 pb-12 pt-20 text-center">
      <h1 className="text-[clamp(34px,4.2vw,56px)] font-semibold leading-tight tracking-[-1.7px] text-ink">
        {t.headerTitlePlain}{' '}
        <span className="text-gradient-brand tracking-[-2px]">{t.headerTitleGradient}</span>
        <span className="text-ink">.</span>
      </h1>
      <p className="max-w-[640px] text-[16px] leading-relaxed text-grey-600">{t.headerSub}</p>
    </header>
  )
}
