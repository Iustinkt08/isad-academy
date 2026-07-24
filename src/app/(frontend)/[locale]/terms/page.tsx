import type { Metadata } from 'next'

import { getLegalDoc, LegalDocSections } from '@/components/legal/LegalCms'
import { LegalPage } from '@/components/legal/LegalPage'
import { getDictionary, resolveLocale } from '@/lib/i18n'

type Args = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const dict = getDictionary(locale)
  return {
    title: dict.legal.termsTitle,
    description: dict.legal.termsMetaDescription,
  }
}

/** Content is fully CMS-driven (legalPages collection) — editable from the dashboard. */
export default async function Page({ params }: Args) {
  const locale = resolveLocale((await params).locale)
  const dict = getDictionary(locale)
  const doc = await getLegalDoc('terms', locale)

  return (
    <LegalPage
      title={doc?.title || dict.legal.termsTitle}
      intro={doc?.intro || ''}
      updatedAt={doc?.updatedAt}
      locale={locale}
    >
      <LegalDocSections doc={doc} locale={locale} />
    </LegalPage>
  )
}
