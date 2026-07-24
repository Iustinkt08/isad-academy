import type { Metadata } from 'next'
import { getPayload } from 'payload'

import config from '@payload-config'
import CorporateBenefits from '@/components/corporate/CorporateBenefits'
import CorporateHero from '@/components/corporate/CorporateHero'
import CorporateLeadForm, {
  type CorporateTopicOption,
} from '@/components/corporate/CorporateLeadForm'
import { getDictionary, resolveLocale, type Locale } from '@/lib/i18n'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const dict = getDictionary(locale)
  return { title: dict.corporate.metaTitle, description: dict.corporate.metaDescription }
}

type CorporateData = {
  courses: CorporateTopicOption[]
  contactEmail?: string
}

/** Public queries via the Local API with access control on — drafts never leak into topics. */
async function getCorporateData(locale: Locale): Promise<CorporateData> {
  try {
    const payload = await getPayload({ config })
    const [coursesResult, settings] = await Promise.all([
      payload.find({
        collection: 'courses',
        pagination: false,
        depth: 0,
        overrideAccess: false,
        locale,
        fallbackLocale: 'en',
      }),
      payload.findGlobal({
        slug: 'siteSettings',
        depth: 0,
        overrideAccess: false,
        locale,
        fallbackLocale: 'en',
      }),
    ])
    return {
      courses: coursesResult.docs.map((course) => ({ id: course.id, title: course.title })),
      contactEmail: settings?.contact?.email ?? undefined,
    }
  } catch {
    return { courses: [] }
  }
}

/**
 * /corporate (§6, owner Figma redesign 2026-07-14, node 3790:3624): lead-gen only —
 * Hero (PillTag + two-tone title + dual CTA, NO client-logo strip) → Benefits with gradient
 * checkmarks (+ industries, `id="topics"`) → Lead form (+ side column). The former "Topics
 * we deliver" section stays REMOVED; the catalog courses still feed the form's Topic select.
 * Deliberately NO prices and NO buy buttons anywhere on this page.
 *
 * The subtle background wraps the whole page (redesign assembly); the <main> landmark
 * itself lives in the shared [locale] layout, so this is a plain div.
 */
export default async function CorporatePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = resolveLocale((await params).locale)
  const { courses, contactEmail } = await getCorporateData(locale)

  return (
    <div className="bg-surface-subtle">
      <CorporateHero locale={locale} />
      <CorporateBenefits locale={locale} />
      <CorporateLeadForm locale={locale} courses={courses} contactEmail={contactEmail} />
    </div>
  )
}
