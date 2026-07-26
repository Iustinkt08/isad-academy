import type { Metadata } from 'next'

import { CookiePreferencesButton } from '@/components/consent/CookiePreferencesButton'
import { LegalSections } from '@/components/legal/LegalContent'
import LegalPageLayout from '@/components/legal/LegalPage'
import { cookiesEn } from '@/components/legal/content/cookies-en'
import { cookiesRo } from '@/components/legal/content/cookies-ro'
import { getDictionary, resolveLocale } from '@/lib/i18n'

type Args = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const content = locale === 'ro' ? cookiesRo : cookiesEn
  return {
    title: content.metaTitle,
    description: getDictionary(locale).legal.cookiesMetaDescription,
  }
}

/** Content transcribed 1:1 from the owner's "cookies EN.docx" / "cookies RO.docx" (repo root). */
export default async function Page({ params }: Args) {
  const locale = resolveLocale((await params).locale)
  const dict = getDictionary(locale)
  const content = locale === 'ro' ? cookiesRo : cookiesEn
  return (
    <LegalPageLayout
      titlePlain={content.titlePlain}
      titleGradient={content.titleGradient}
      lastUpdated={content.lastUpdated}
    >
      <LegalSections sections={content.sections} />

      {/* Fixed UI control (re-opens the consent banner, doc §8) — stays outside the transcribed content */}
      <div>
        <CookiePreferencesButton
          label={dict.consent.preferences}
          className="inline-flex items-center justify-center rounded-full bg-[#f6f6f6] px-6 py-2.5 text-[13px] font-medium text-[#1c5d99] transition-colors duration-200 hover:bg-[#eef2f7] lg:text-[14px]"
        />
      </div>
    </LegalPageLayout>
  )
}
