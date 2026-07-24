import { getPayload } from 'payload'

import config from '@payload-config'
import { RichTextContent } from '@/components/richtext/RichTextContent'
import { getDictionary } from '@/lib/i18n/dictionaries'
import type { Locale } from '@/lib/i18n/config'
import type { LegalPage as LegalPageDoc } from '@/payload-types'

import { LegalPlaceholder, LegalSection } from './LegalPage'

/**
 * CMS plumbing for the legal routes (owner request 2026-07-12): every legal page is
 * editable from the dashboard (`legalPages` collection); the routes only fetch and render.
 */
export async function getLegalDoc(
  page: 'privacy' | 'cookies' | 'delivery' | 'terms',
  locale: Locale,
) {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'legalPages',
      where: { page: { equals: page } },
      limit: 1,
      overrideAccess: false,
      locale,
      fallbackLocale: 'en',
    })
    return result.docs[0] ?? null
  } catch {
    return null
  }
}

export function LegalDocSections({ doc, locale }: { doc: LegalPageDoc | null; locale: Locale }) {
  if (!doc || !doc.sections?.length) {
    return (
      <LegalPlaceholder>
        <p>{getDictionary(locale).legal.pendingBody}</p>
      </LegalPlaceholder>
    )
  }
  return (
    <>
      {doc.sections.map((section, index) => (
        <LegalSection key={section.id ?? index} heading={section.heading}>
          {section.body ? <RichTextContent data={section.body} locale={locale} /> : null}
        </LegalSection>
      ))}
    </>
  )
}
