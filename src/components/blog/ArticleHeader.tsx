import Link from 'next/link'

import { getDictionary } from '@/lib/i18n/dictionaries'
import { localePath, type Locale } from '@/lib/i18n/config'
import { asMedia } from '../courses/helpers'
import { MediaImage } from '../media/MediaImage'
import { formatDotStamp } from './BlogCard'
import type { BlogPost } from '@/payload-types'

/**
 * Article header — Figma 3838:64 (blog article redesign): breadcrumb (Blog → title) →
 * meta row (category chip + reading time) → 40px title with the last word in the brand
 * gradient → author row (initials avatar + name + date · category, LinkedIn share pill
 * on the right, wraps on mobile) → OPTIONAL 760×360 cover. When the post has no cover
 * the block is omitted entirely — no placeholder, the title simply sits higher (§6).
 */

/** Brand text gradient (Figma 3838:72) — Steel → Deep Blue → Steel, §12. */
const TITLE_GRADIENT =
  'linear-gradient(152deg, #407ea2 20.331%, #1c5d99 46.364%, #407ea2 76.364%)'

/** "Dr. Silviu Gresoi" → "SG" (last two initials, matching the mock's compact avatar). */
const initials = (name: string): string => {
  const parts = name
    .split(/\s+/)
    .filter((part) => /[\p{L}\p{N}]/u.test(part))
    .map((part) => [...part][0]!.toUpperCase())
  return parts.slice(-2).join('') || parts.join('')
}

/** Last word gets the gradient (Figma 3838:72); whitespace is preserved for the a11y name. */
function GradientTitle({ title }: { title: string }) {
  const words = title.trim().split(/\s+/)
  const last = words.at(-1) ?? ''
  const head = words.slice(0, -1).join(' ')
  return (
    <h1 className="w-full text-[32px] font-semibold leading-[42px] tracking-[-1.3px] text-[#222222] [word-break:break-word] sm:text-[40px] sm:leading-[50px]">
      {head && <>{head} </>}
      <span
        className="bg-clip-text tracking-[-1.6px] text-transparent"
        style={{ backgroundImage: TITLE_GRADIENT }}
      >
        {last}
      </span>
    </h1>
  )
}

export function ArticleHeader({ post, locale }: { post: BlogPost; locale: Locale }) {
  const dict = getDictionary(locale)
  const category = post.category ? dict.blog.categories[post.category] : null
  const cover = asMedia(post.coverImage)
  const dateStamp = formatDotStamp(post.createdAt)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    `${siteUrl}${localePath(locale, `/blog/${post.slug}`)}`,
  )}`

  return (
    <>
      {/* ——— Breadcrumb: Blog → title ——— */}
      <nav
        aria-label={dict.blog.breadcrumbAria}
        className="w-full text-[13px] tracking-[0.2px] text-[#959595]"
      >
        <ol className="flex items-center gap-[8px]">
          <li className="shrink-0">
            <Link
              href={localePath(locale, '/blog')}
              className="transition-colors hover:text-[#1c5d99]"
            >
              {dict.blog.listTitle}
            </Link>
          </li>
          <li aria-hidden="true" className="shrink-0">
            →
          </li>
          <li aria-current="page" className="min-w-0 truncate">
            {post.title}
          </li>
        </ol>
      </nav>

      {/* ——— Meta row: category chip + reading time ——— */}
      {(category || post.readingTime != null) && (
        <div className="flex items-center gap-[10px]">
          {category && (
            <span className="flex items-center gap-[7px] rounded-[20px] bg-white px-[11px] py-[5px] shadow-[0_0_5px_rgba(0,0,0,0.07)]">
              <span aria-hidden="true" className="size-[8px] rounded-full bg-[#1c5d99]" />
              <span className="whitespace-nowrap text-[12px] font-medium tracking-[-0.3px] text-[#222222]">
                {category}
              </span>
            </span>
          )}
          {post.readingTime != null && (
            <span className="text-[12.5px] text-[#959595]">
              {dict.blog.minRead(post.readingTime)}
            </span>
          )}
        </div>
      )}

      {/* ——— Title (last word in brand gradient) ——— */}
      <GradientTitle title={post.title} />

      {/* ——— Author row + LinkedIn share (wraps on mobile) ——— */}
      <div className="flex w-full flex-wrap items-center justify-between gap-x-[16px] gap-y-[12px]">
        <div className="flex items-center gap-[12px]">
          {post.author && (
            <span
              aria-hidden="true"
              className="flex size-[44px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#407ea2] to-[#1c5d99] text-[15px] font-semibold text-white shadow-[0_0_2.65px_rgba(0,0,0,0.28)]"
            >
              {initials(post.author)}
            </span>
          )}
          <div className="flex flex-col gap-px">
            {post.author && (
              <p className="text-[14px] font-medium tracking-[-0.3px] text-[#222222]">
                {post.author}
              </p>
            )}
            {(dateStamp || category) && (
              <p className="text-[12.5px] text-[#959595]">
                {dateStamp}
                {dateStamp && category && ' · '}
                {category}
              </p>
            )}
          </div>
        </div>
        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-[999px] bg-white px-[16px] pb-[9px] pt-[8px] text-[13px] font-medium tracking-[-0.3px] text-[#222222] shadow-[0_0_4.4px_rgba(0,0,0,0.07)] transition-transform hover:scale-[1.03] motion-reduce:transition-none"
        >
          {dict.blog.shareLinkedIn} <span aria-hidden="true">↗</span>
        </a>
      </div>

      {/* ——— Cover (optional — omitted entirely when the post has none, NO placeholder) ——— */}
      {cover && (
        <div className="relative h-[240px] w-full overflow-hidden rounded-[24px] sm:h-[360px]">
          <MediaImage media={cover} fill sizes="(min-width: 800px) 760px, 100vw" priority />
        </div>
      )}
    </>
  )
}
