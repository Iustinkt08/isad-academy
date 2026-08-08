import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'

import config from '@payload-config'
import { localePath } from '@/lib/i18n/config'
import { getSiteUrl } from '@/lib/seo/site'

export const dynamic = 'force-dynamic'

/**
 * /sitemap.xml (T14, CLAUDE.md §7): the indexable static routes plus every PUBLISHED
 * course and blog post — each listed in BOTH languages (EN at the bare URL, RO under
 * /ro) with hreflang alternates, so Google indexes the two language versions without
 * per-page <link rel="alternate"> tags. Both queries run with `overrideAccess: false`
 * and no user, so drafts are excluded exactly as on the public API. Deliberately NOT
 * listed: /checkout + /checkout/confirmare (transactional), /quiz (utility — §11),
 * /review/* (tokenized one-shot links), /newsletter/confirmed (DOI landing), /admin
 * and /api.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()

  /** One sitemap entry per language, cross-linked via hreflang alternates. */
  const bilingual = (path: string, lastModified?: string): MetadataRoute.Sitemap => {
    const languages = {
      en: `${siteUrl}${localePath('en', path)}`,
      ro: `${siteUrl}${localePath('ro', path)}`,
      'x-default': `${siteUrl}${localePath('en', path)}`,
    }
    return (['en', 'ro'] as const).map((locale) => ({
      url: `${siteUrl}${localePath(locale, path)}`,
      ...(lastModified ? { lastModified } : {}),
      alternates: { languages },
    }))
  }

  const staticRoutes = [
    '/',
    '/courses',
    '/corporate',
    '/about',
    '/contact',
    '/blog',
    // Canonical legal slugs — the old RO slugs (/termeni, /gdpr, /politica-cookie,
    // /politica-livrare) are 308 redirects and must not be listed.
    '/terms',
    '/privacy',
    '/cookies',
  ].flatMap((route) => bilingual(route))

  try {
    const payload = await getPayload({ config })
    const [courses, posts] = await Promise.all([
      payload.find({
        collection: 'courses',
        pagination: false,
        depth: 0,
        select: { slug: true, updatedAt: true },
        overrideAccess: false,
      }),
      payload.find({
        collection: 'blogPosts',
        pagination: false,
        depth: 0,
        select: { slug: true, updatedAt: true },
        overrideAccess: false,
      }),
    ])

    const courseRoutes = courses.docs
      .filter((doc) => typeof doc.slug === 'string' && doc.slug.length > 0)
      .flatMap((doc) => bilingual(`/courses/${doc.slug}`, doc.updatedAt))

    const postRoutes = posts.docs
      .filter((doc) => typeof doc.slug === 'string' && doc.slug.length > 0)
      .flatMap((doc) => bilingual(`/blog/${doc.slug}`, doc.updatedAt))

    return [...staticRoutes, ...courseRoutes, ...postRoutes]
  } catch {
    // CMS unreachable — still serve the static routes rather than a 500.
    return staticRoutes
  }
}
