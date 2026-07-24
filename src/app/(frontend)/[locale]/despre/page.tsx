import type { Metadata } from 'next'

import AboutCta from '@/components/about/AboutCta'
import AboutHero from '@/components/about/AboutHero'
import BeliefsPath from '@/components/about/BeliefsPath'
import ValuesSection from '@/components/about/ValuesSection'
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
 * /despre — 1:1 cu Figma 3873-94 „Page / About · DESKTOP" (redesign owner, 2026-07-23).
 * Ordinea secțiunilor e fixă; fundalul #F8F9FA e pe fiecare secțiune. Header-ul și
 * footer-ul globale vin din layout, care randează deja <main id="main-content">.
 */
export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = resolveLocale((await params).locale)

  return (
    <div className="bg-[#f8f9fa]">
      <AboutHero />
      <BeliefsPath />
      <ValuesSection />
      <AboutCta ctaHref={localePath(locale, '/cursuri')} />
    </div>
  )
}
