import type { Metadata } from 'next'

import { LegalSections } from '@/components/legal/LegalContent'
import LegalPageLayout from '@/components/legal/LegalPage'
import { privacyEn } from '@/components/legal/content/privacy-en'
import { privacyRo } from '@/components/legal/content/privacy-ro'
import { getDictionary, resolveLocale } from '@/lib/i18n'

type Args = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const content = locale === 'ro' ? privacyRo : privacyEn
  return {
    title: content.metaTitle,
    description: getDictionary(locale).legal.privacyMetaDescription,
  }
}

/** Content transcribed 1:1 from the owner's "privacy EN.docx" / "privacy RO.docx" (repo root). */
export default async function Page({ params }: Args) {
  const locale = resolveLocale((await params).locale)
  const content = locale === 'ro' ? privacyRo : privacyEn
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
