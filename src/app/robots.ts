import type { MetadataRoute } from 'next'

import { getSiteUrl } from '@/lib/seo/site'

/**
 * /robots.txt (T14, CLAUDE.md §7). Blocks the non-indexable surfaces: the Payload admin,
 * the transactional checkout, draft-preview activation, tokenized review links and the
 * API. Everything else is crawlable; the sitemap lists what SHOULD be indexed.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/checkout', '/next/preview', '/review/', '/api/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
