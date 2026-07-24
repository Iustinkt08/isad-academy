import type { Metadata } from 'next'
import { getPayload } from 'payload'

import config from '@payload-config'
import BlogCard from '@/components/blog/BlogCard'
import BlogHeader from '@/components/blog/BlogHeader'
import BlogNewsletterCta from '@/components/blog/BlogNewsletterCta'
import { getDictionary, resolveLocale } from '@/lib/i18n'

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

  return (
    <section className="bg-surface-subtle pb-[100px]">
      <div className="mx-auto w-full max-w-[1290px] px-4">
        <BlogHeader locale={locale} />

        {posts.docs.length > 0 ? (
          <div className="grid grid-cols-1 gap-[30px] sm:grid-cols-2 lg:grid-cols-3">
            {posts.docs.map((post, index) => (
              <BlogCard
                key={post.id}
                post={post}
                locale={locale}
                isNew={index === 0 && newestIsNew}
              />
            ))}
          </div>
        ) : (
          <div className="mx-auto flex max-w-[560px] flex-col items-center gap-2 rounded-[24px] bg-white px-8 py-10 text-center shadow-[0_12px_30px_rgba(77,77,77,0.08)]">
            <h2 className="text-[22px] font-semibold tracking-[-0.6px] text-ink">
              {dict.blog.emptyTitle}
            </h2>
            <p className="text-[15px] text-grey-600">{dict.blog.emptySubtitle}</p>
          </div>
        )}

        <div className="pt-[30px]">
          <BlogNewsletterCta locale={locale} />
        </div>
      </div>
    </section>
  )
}
