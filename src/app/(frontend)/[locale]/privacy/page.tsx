import type { Metadata } from 'next'

import { LegalSections } from '@/components/legal/LegalContent'
import LegalPageLayout from '@/components/legal/LegalPage'
import { privacyEn } from '@/components/legal/content/privacy-en'
import { privacyRo } from '@/components/legal/content/privacy-ro'
import { getDictionary, resolveLocale } from '@/lib/i18n'
import { getLegalDoc } from '@/lib/legal/getLegalDoc'

type Args = { params: Promise<{ locale: string }> }

/**
 * Conținutul vine din CMS (colecția `legalPages`, editabilă din dashboard — owner
 * 2026-08-07). Textele din `@/components/legal/content/` rămân ca PLASĂ DE SIGURANȚĂ, pentru
 * cazul în care baza de date nu răspunde sau documentul lipsește: o pagină legală albă e mai
 * rea decât una ușor învechită. Ele au fost sursa importului, deci sunt identice cu ce e în
 * CMS la momentul mutării.
 */
const load = async (locale: 'en' | 'ro') =>
  (await getLegalDoc('privacy', locale)) ?? (locale === 'ro' ? privacyRo : privacyEn)

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const content = await load(locale)
  return {
    title: content.metaTitle,
    description: getDictionary(locale).legal.privacyMetaDescription,
  }
}

export default async function Page({ params }: Args) {
  const locale = resolveLocale((await params).locale)
  const content = await load(locale)
  return (
    <LegalPageLayout
      titlePlain={content.titlePlain}
      titleGradient={content.titleGradient}
      lastUpdated={content.lastUpdated}
    >
      <LegalSections sections={content.sections} />
    </LegalPageLayout>
  )
}
