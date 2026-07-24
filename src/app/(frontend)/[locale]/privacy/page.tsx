import type { Metadata } from 'next'

import { getLegalDoc, LegalDocSections } from '@/components/legal/LegalCms'
import { LegalPage } from '@/components/legal/LegalPage'
import { getDictionary, resolveLocale } from '@/lib/i18n'

type Args = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const dict = getDictionary(locale)
  return {
    title: dict.legal.privacyTitle,
    description: dict.legal.privacyMetaDescription,
  }
}

/** Content is fully CMS-driven (legalPages collection) — editable from the dashboard. */
export default async function Page({ params }: Args) {
  const locale = resolveLocale((await params).locale)
  const dict = getDictionary(locale)
  const doc = await getLegalDoc('privacy', locale)

  return (
    <LegalPage
      title={doc?.title || dict.legal.privacyTitle}
      intro={doc?.intro || ''}
      updatedAt={doc?.updatedAt}
      locale={locale}
    >
      <LegalDocSections doc={doc} locale={locale} />
    </LegalPage>
  )
}
