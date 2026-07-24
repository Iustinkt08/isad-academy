import type { Metadata } from 'next'

import { getLegalDoc, LegalDocSections } from '@/components/legal/LegalCms'
import { LegalPage } from '@/components/legal/LegalPage'
import { CookiePreferencesButton } from '@/components/consent/CookiePreferencesButton'
import { getDictionary, resolveLocale } from '@/lib/i18n'

type Args = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const dict = getDictionary(locale)
  return {
    title: dict.legal.cookiesTitle,
    description: dict.legal.cookiesMetaDescription,
  }
}

/** Content is fully CMS-driven (legalPages collection) — editable from the dashboard. */
export default async function Page({ params }: Args) {
  const locale = resolveLocale((await params).locale)
  const dict = getDictionary(locale)
  const doc = await getLegalDoc('cookies', locale)

  return (
    <LegalPage
      title={doc?.title || dict.legal.cookiesTitle}
      intro={doc?.intro || ''}
      updatedAt={doc?.updatedAt}
      locale={locale}
    >
      <LegalDocSections doc={doc} locale={locale} />

      {/* Fixed UI control — stays outside the CMS content */}
      <div className="mt-8">
        <CookiePreferencesButton label={dict.consent.preferences} className="inline-flex items-center justify-center rounded-full border-2 border-blue bg-transparent px-6 py-2.5 text-sm font-semibold text-blue transition-colors duration-200 hover:bg-blue/10" />
      </div>
    </LegalPage>
  )
}
