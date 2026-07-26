import type { Metadata } from 'next'
import { getPayload } from 'payload'

import config from '@payload-config'
import BlogCard from '@/components/blog/BlogCard'
import BlogHeader from '@/components/blog/BlogHeader'
import {
  BlogHeaderMobile,
  BlogSliderMobile,
  FeaturedArticleCard,
  type BlogPostCard as BlogPostCardData,
} from '@/components/blog/BlogMobile'
import { formatDotStamp } from '@/components/blog/BlogCard'
import { asMedia } from '@/components/courses/helpers'
import { Reveal } from '@/components/ui/Reveal'
import { getDictionary, localePath, resolveLocale } from '@/lib/i18n'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const dict = getDictionary(locale)
  return {
    title: dict.blog.listTitle,
    description: dict.blog.metaDescription,
  }
}

/** The newest post wears the "New" pill (Figma 3802:39) while it is under 30 days old. */
const NEW_BADGE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Blog list — Figma 3802:39 (§6): header → plain chronological grid (3-up desktop,
 * 30px gap, NO featured, NO filters, NO search) → newsletter strip. Public visibility
 * enforced by the Local API itself (`overrideAccess: false`, no user) — drafts never
 * appear. Empty state keeps the page in the menu and pitches the newsletter instead.
 */
export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = resolveLocale((await params).locale)
  const dict = getDictionary(locale)
  const payload = await getPayload({ config })
  const posts = await payload.find({
    collection: 'blogPosts',
    sort: '-createdAt',
    pagination: false,
    depth: 1,
    overrideAccess: false,
    locale,
    fallbackLocale: 'en',
  })

  const newest = posts.docs[0]
  const newestIsNew =
    newest != null && Date.now() - new Date(newest.createdAt).getTime() < NEW_BADGE_MAX_AGE_MS

  // MOBIL (Figma 3977-612): aceleași posturi, mapate pe forma cardurilor mobile —
  // posts[0] = „Latest article" (cu chip „New"), restul intră în slider.
  const mobileCards: BlogPostCardData[] = posts.docs.map((post, index) => ({
    slug: post.slug ?? String(post.id),
    href: localePath(locale, `/blog/${post.slug}`),
    title: post.title,
    excerpt: post.excerpt ?? '',
    date: formatDotStamp(post.createdAt) ?? '',
    category: post.category ? dict.blog.categories[post.category] : dict.blog.listTitle,
    cover: asMedia(post.coverImage)?.url ?? null,
    isNew: index === 0 && newestIsNew,
  }))
  const [mobileLatest, ...mobileRest] = mobileCards

  return (
    <section className="bg-surface-subtle pb-16 lg:pb-[100px]">
      {/* ======= DESKTOP (≥lg) — EXISTENT, neatins; doar ascuns sub lg ======= */}
      <div className="mx-auto hidden w-full max-w-[1290px] px-4 lg:block">
        {/* Fade-in on scroll per secțiune (owner 2026-07-25) — Reveal, ca pe homepage */}
        <Reveal>
          <BlogHeader locale={locale} />
        </Reveal>

        {posts.docs.length > 0 ? (
          <Reveal className="grid grid-cols-1 gap-[30px] sm:grid-cols-2 lg:grid-cols-3">
            {posts.docs.map((post, index) => (
              <BlogCard
                key={post.id}
                post={post}
                locale={locale}
                isNew={index === 0 && newestIsNew}
              />
            ))}
          </Reveal>
        ) : (
          <Reveal className="mx-auto flex max-w-[560px] flex-col items-center gap-2 rounded-[24px] bg-white px-8 py-10 text-center shadow-[0_12px_30px_rgba(77,77,77,0.08)]">
            <h2 className="text-[22px] font-semibold tracking-[-0.6px] text-ink">
              {dict.blog.emptyTitle}
            </h2>
            <p className="text-[15px] text-grey-600">{dict.blog.emptySubtitle}</p>
          </Reveal>
        )}

        {/* Newsletter-ul listei a fost SCOS (owner 2026-07-26) — există în footerul global */}
      </div>

      {/* ======= MOBIL (<lg) — Figma 3977-612: header → Latest → slider → newsletter ======= */}
      <div className="flex flex-col gap-6 lg:hidden">
        <Reveal>
          <BlogHeaderMobile locale={locale} />
        </Reveal>

        {mobileLatest ? (
          <>
            {/* px-7: mai mult aer lateral pe telefon (owner 2026-07-26) */}
            <Reveal className="flex flex-col gap-2.5 px-7">
              <p className="text-[16px] font-medium tracking-[-0.3px] text-[#222222]">
                {dict.blog.latestLabel}
              </p>
              <FeaturedArticleCard post={mobileLatest} locale={locale} />
            </Reveal>
            {mobileRest.length > 0 && (
              <Reveal>
                <BlogSliderMobile posts={mobileRest} locale={locale} />
              </Reveal>
            )}
          </>
        ) : (
          <Reveal className="mx-5 flex flex-col items-center gap-2 rounded-[24px] bg-white px-8 py-10 text-center shadow-[0_12px_30px_rgba(77,77,77,0.08)]">
            <h2 className="text-[22px] font-semibold tracking-[-0.6px] text-ink">
              {dict.blog.emptyTitle}
            </h2>
            <p className="text-[15px] text-grey-600">{dict.blog.emptySubtitle}</p>
          </Reveal>
        )}

      </div>
    </section>
  )
}
