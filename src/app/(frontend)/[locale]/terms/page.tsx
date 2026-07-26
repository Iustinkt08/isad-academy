import type { Metadata } from 'next'

import { LegalSections } from '@/components/legal/LegalContent'
import LegalPageLayout from '@/components/legal/LegalPage'
import { termsEn } from '@/components/legal/content/terms-en'
import { termsRo } from '@/components/legal/content/terms-ro'
import { getDictionary, resolveLocale } from '@/lib/i18n'

type Args = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const content = locale === 'ro' ? termsRo : termsEn
  return {
    title: content.metaTitle,
    description: getDictionary(locale).legal.termsMetaDescription,
  }
}

/** Content transcribed 1:1 from the owner's "terms and conditions EN/RO.docx" (repo root). */
export default async function Page({ params }: Args) {
  const locale = resolveLocale((await params).locale)
  const content = locale === 'ro' ? termsRo : termsEn
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
