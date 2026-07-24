import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { cache } from 'react'

import config from '@payload-config'
import { asMedia, excerpt, lexicalToPlainText } from '@/components/courses/helpers'
import { ArticleRichText } from '@/components/blog/ArticleBody'
import { ArticleNewsletterCta, RelatedCourseCard } from '@/components/blog/ArticleFooterCtas'
import { ArticleHeader } from '@/components/blog/ArticleHeader'
import { LeadMagnetCard } from '@/components/blog/LeadMagnetCard'
import { JsonLd } from '@/components/seo/JsonLd'
import { getDictionary, localePath, resolveLocale, type Locale } from '@/lib/i18n'
import { DEFAULT_OG_IMAGE, SITE_NAME, getSiteUrl } from '@/lib/seo/site'
import type { BlogPost, Course } from '@/payload-types'

/**
 * Article fetch, deduped between generateMetadata and the page. Two access modes:
 *   - public (default): `overrideAccess: false`, no user — drafts are invisible, a draft
 *     slug 404s exactly like on the public API.
 *   - draft preview: ONLY when Next draft mode is on (set by /next/preview, which requires
 *     an authenticated Payload admin) — fetches with `draft: true` + `overrideAccess: true`
 *     so the admin sees the latest draft version.
 * `depth: 2` populates coverImage/relatedCourse AND the media docs referenced inside body
 * blocks (downloadable resources) + in-text upload nodes.
 */
const getPost = cache(async (slug: string, isDraftMode: boolean, locale: Locale) => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'blogPosts',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
    draft: isDraftMode,
    overrideAccess: isDraftMode,
    locale,
    fallbackLocale: 'en',
  })
  return result.docs[0] ?? null
})

type Args = { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { locale: localeParam, slug } = await params
  const locale = resolveLocale(localeParam)
  const dict = getDictionary(locale)
  const { isEnabled } = await draftMode()
  const post = await getPost(slug, isEnabled, locale)
  if (!post) return { title: dict.blog.articleNotFound }

  // plugin-seo `meta.*` first (T14 — T12 report notes), content fallbacks after. An
  // editor-set meta.title is used verbatim (absolute); otherwise the root layout's
  // `%s | isad.academy` template brands the plain post title.
  const metaTitle = post.meta?.title?.trim()
  const description =
    post.meta?.description?.trim() ||
    post.excerpt ||
    excerpt(lexicalToPlainText(post.body)) ||
    undefined
  // OG image chain: meta.image → coverImage → site default (resolved via metadataBase).
  const ogImage =
    asMedia(post.meta?.image)?.url || asMedia(post.coverImage)?.url || DEFAULT_OG_IMAGE

  return {
    title: metaTitle ? { absolute: metaTitle } : post.title,
    description,
    alternates: { canonical: localePath(locale, `/blog/${post.slug}`) },
    openGraph: {
      title: metaTitle || `${post.title} | ${SITE_NAME}`,
      description,
      url: localePath(locale, `/blog/${post.slug}`),
      siteName: SITE_NAME,
      type: 'article',
      images: [{ url: ogImage }],
    },
  }
}

/**
 * Schema.org BlogPosting (T14 — T12 report notes): headline, datePublished (createdAt —
 * the date shown on the page), author when set, image only when the article actually has
 * one (meta.image → coverImage; no default-image padding in structured data).
 */
function buildBlogPostingJsonLd(post: BlogPost, locale: Locale): Record<string, unknown> {
  const siteUrl = getSiteUrl()
  const articleUrl = `${siteUrl}${localePath(locale, `/blog/${post.slug}`)}`
  const image = asMedia(post.meta?.image)?.url || asMedia(post.coverImage)?.url
  const description = post.meta?.description?.trim() || post.excerpt || undefined

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    url: articleUrl,
    mainEntityOfPage: articleUrl,
    datePublished: post.createdAt,
    dateModified: post.updatedAt,
    ...(description ? { description } : {}),
    ...(post.author ? { author: { '@type': 'Person', name: post.author } } : {}),
    ...(image ? { image: [`${siteUrl}${image}`] } : {}),
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: siteUrl,
    },
  }
}

/** Populated, published related course — draft/id-only values render nothing. */
const asPublishedCourse = (value: Course | number | null | undefined): Course | null =>
  value != null && typeof value === 'object' && value._status === 'published' ? value : null

/**
 * Blog article — Figma 3838:64 redesign: a single centered 760px column on the subtle
 * surface (#f8f9fa), uniform 20px gap: ArticleHeader (breadcrumb → meta → title → author
 * row → optional cover) → ArticleRichText body → LeadMagnetCard (only when enabled with a
 * file) → 1px #E6E6E6 divider → RelatedCourseCard (only when set + published) →
 * ArticleNewsletterCta (always). No comments (§4).
 */
export default async function BlogArticlePage({ params }: Args) {
  const { locale: localeParam, slug } = await params
  const locale = resolveLocale(localeParam)
  const dict = getDictionary(locale)
  const { isEnabled: isDraftMode } = await draftMode()
  const post = await getPost(slug, isDraftMode, locale)
  if (!post) notFound()

  const relatedCourse = asPublishedCourse(post.relatedCourse)
  const hasLeadMagnet = Boolean(post.leadMagnet?.enabled && post.leadMagnet?.file)

  return (
    <>
      <JsonLd data={buildBlogPostingJsonLd(post, locale)} />

      {/* ——— Draft preview banner (only when draft mode is on) ——— */}
      {isDraftMode && (
        <div className="bg-ink px-4 py-2.5 text-center text-sm text-paper">
          {dict.blog.draftBanner}{' '}
          {/* Deliberately a plain <a>: /next/exit-preview is a route handler that clears the
              draft-mode cookie and needs a full page load; a <Link> would PREFETCH the
              handler and exit preview as soon as the link scrolls into view. (The rule only
              fires since T14's [...notFound] catch-all made every path look like a page.) */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/next/exit-preview" className="font-semibold text-ice underline">
            {dict.blog.draftExit}
          </a>
        </div>
      )}

      <article className="bg-surface-subtle">
        <div className="animate-rise mx-auto flex w-full max-w-[760px] flex-col gap-[20px] px-4 pb-[90px] pt-[130px] min-[800px]:px-0">
          <ArticleHeader post={post} locale={locale} />

          {/* ——— Body (article-specific Lexical converters) ——— */}
          <ArticleRichText data={post.body} locale={locale} />

          {/* ——— Lead magnet (only when enabled AND a file is attached) ——— */}
          {hasLeadMagnet && <LeadMagnetCard slug={post.slug ?? slug} locale={locale} />}

          {/* ——— Divider — the single permitted grey line ——— */}
          <div aria-hidden="true" className="h-px w-full bg-[#e6e6e6]" />

          {/* ——— Bottom CTAs: related course when set + newsletter always (§6) ——— */}
          <section
            aria-label={dict.blog.nextStepsAria}
            className="flex w-full flex-col gap-[20px]"
          >
            {relatedCourse && <RelatedCourseCard course={relatedCourse} locale={locale} />}
            <ArticleNewsletterCta locale={locale} />
          </section>
        </div>
      </article>
    </>
  )
}
