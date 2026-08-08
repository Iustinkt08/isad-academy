import type { Metadata } from 'next'

import AboutCta from '@/components/about/AboutCta'
import AboutHero from '@/components/about/AboutHero'
import BeliefsPath from '@/components/about/BeliefsPath'
import ValuesSection from '@/components/about/ValuesSection'
import { Reveal } from '@/components/ui/Reveal'
import { getDictionary, localePath, resolveLocale } from '@/lib/i18n'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const dict = getDictionary(locale)
  return { title: dict.about.metaTitle, description: dict.about.metaDescription }
}

/**
 * /about — v3 RESPONSIVE (owner, Figma 3977-571 pentru mobil; 3873-94 desktop).
 * Desktop (≥lg): Hero → Beliefs (traseu orizontal) → Our Values (carduri) → CTA.
 * Mobil (<lg): Hero (fără linia ISAD) → Beliefs (traseu VERTICAL cu valorile
 * integrate la puncte + reveal la scroll) → CTA. ValuesSection se ascunde singură
 * pe mobil (hidden lg:flex) — rămâne în DOM; ordinea e una singură. Distanța
 * dintre secțiuni pe mobil (32px) e dată de gap-8 + padding-urile secțiunilor.
 * Header-ul și footer-ul globale vin din layout, care randează deja
 * <main id="main-content">.
 */
export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = resolveLocale((await params).locale)

  return (
    <div className="flex flex-col gap-8 bg-[#f8f9fa] lg:gap-0">
      {/* Fade-in on scroll per secțiune (owner 2026-07-25) — același Reveal ca pe homepage */}
      <Reveal>
        <AboutHero locale={locale} />
      </Reveal>
      <Reveal>
        <BeliefsPath locale={locale} />
      </Reveal>
      <Reveal>
        <ValuesSection locale={locale} />
      </Reveal>
      <Reveal>
        <AboutCta locale={locale} ctaHref={localePath(locale, '/courses')} />
      </Reveal>
    </div>
  )
}
