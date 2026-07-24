import Link from 'next/link'

import { getDictionary } from '@/lib/i18n/dictionaries'
import { localePath, type Locale } from '@/lib/i18n/config'
import { asMedia } from '../courses/helpers'
import { MediaImage } from '../media/MediaImage'
import type { BlogPost } from '@/payload-types'

export type { BlogPost }

/**
 * Locale-aware long date for the ARTICLE page ("19 Aug 2026" / "19 aug. 2026").
 * The list cards below use the numeric dd.mm.yyyy stamp from the Figma mock instead.
 */
export const formatBlogDate = (
  value: string | null | undefined,
  locale: Locale,
): string | null => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(locale === 'ro' ? 'ro-RO' : 'en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
}

/**
 * Date stamp — dd.mm.yyyy (Figma 3802:39 cards + 3838:64 article author row),
 * language-neutral. Exported for the article page redesign (ArticleHeader).
 */
export const formatDotStamp = (value: string | null | undefined): string | null => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${date.getFullYear()}`
}

/** Banner height is FIXED for both variants so the grid rows always align (core rule). */
const BANNER_H = 'h-[190px]'

/**
 * Blog list card — 1:1 from Figma 3802:39. MEDIA LOGIC (core requirement):
 *   - post HAS a coverImage → the 190px banner is the REAL image (object-cover),
 *     no logo overlay;
 *   - post has NO coverImage → the 190px branded panel: "isad.academy · blog" label,
 *     the big category name and the gradient monogram bleeding off the right edge.
 * Card is BORDERLESS (drop shadow only, rounded 24px — explicit px per owner rule).
 * Title and the black "Read article" pill are two separate links to the article
 * (never nested interactives).
 */
export default function BlogCard({
  post,
  locale,
  isNew = false,
}: {
  post: BlogPost
  locale: Locale
  isNew?: boolean
}) {
  const dict = getDictionary(locale)
  const cover = asMedia(post.coverImage)
  const category = post.category ? dict.blog.categories[post.category] : null
  const href = localePath(locale, `/blog/${post.slug}`)

  return (
    <article
      data-testid="blog-post-card"
      className="flex h-full flex-col overflow-hidden rounded-[24px] bg-white shadow-[3px_9px_20px_rgba(77,77,77,0.04)] transition-shadow duration-200 hover:shadow-[3px_12px_28px_rgba(77,77,77,0.10)]"
    >
      {cover ? (
        // Real cover — image only, NO logo overlay (core rule).
        <div className={`relative ${BANNER_H} w-full shrink-0 overflow-hidden`}>
          <MediaImage
            media={cover}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        </div>
      ) : (
        // Default branded panel — exact geometry from Figma node 3802:58: label at
        // 28/30, category at 28/96, monogram 167×148 at top 42 bleeding 8px off the
        // right edge. The monogram is the Figma-rendered asset itself
        // (/brand/blog-monogram.svg) with the white-fade gradient + grain baked in.
        <div className={`relative ${BANNER_H} w-full shrink-0 overflow-hidden`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/blog-monogram.svg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -right-2 top-[42px] h-[148px] w-[167px] select-none"
          />
          <p className="absolute left-7 top-[30px] whitespace-nowrap text-[12px] font-medium text-ink">
            {dict.blog.brandLabel}
          </p>
          <p className="absolute left-7 top-[96px] max-w-[300px] text-[26px] font-semibold leading-[32px] tracking-[-0.8px] text-ink">
            {category ?? dict.blog.listTitle}
          </p>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 px-7 pb-6 pt-[22px]">
        {isNew && (
          <span className="flex w-fit items-center gap-2 rounded-full bg-white px-3.5 py-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.10)]">
            <span aria-hidden="true" className="size-2 rounded-full bg-blue" />
            <span className="text-[13px] font-medium text-blue">{dict.blog.newBadge}</span>
          </span>
        )}

        <h2 className="text-[20px] font-medium leading-[27px] tracking-[-0.7px] text-ink">
          <Link href={href} className="transition-colors hover:text-blue">
            {post.title}
          </Link>
        </h2>
        {post.excerpt && (
          <p className="text-[14px] leading-[22px] text-[#959595]">{post.excerpt}</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-[13px] text-[#959595]">{formatDotStamp(post.createdAt)}</span>
          <Link
            href={href}
            className="rounded-[20px] bg-black px-4 py-2 text-[14px] font-semibold text-white transition-transform hover:scale-[1.03]"
          >
            {dict.blog.readArticle}
          </Link>
        </div>
      </div>
    </article>
  )
}
