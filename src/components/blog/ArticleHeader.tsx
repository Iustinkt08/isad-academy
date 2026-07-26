import Link from 'next/link'

import { getDictionary } from '@/lib/i18n/dictionaries'
import { localePath, type Locale } from '@/lib/i18n/config'
import { asMedia } from '../courses/helpers'
import { MediaImage } from '../media/MediaImage'
import { formatDotStamp } from './BlogCard'
import type { BlogPost } from '@/payload-types'

/**
 * Article header — Figma 3977-687 (desktop ≥lg) / 3977-718 (mobile <lg), single DOM with
 * responsive classes: title with the LAST word in the brand gradient → author row (44px
 * round avatar on white with a diffuse shadow + name 14 Medium + "date · category" meta
 * 12.5 #959595) → cover. The cover is ALWAYS rendered: the real image when the post has
 * one (166px mobile / 360px desktop, radius 24, object-cover), otherwise the branded
 * placeholder panel — #BBCDE5 → #407EA2 gradient with the brand "A" watermark
 * (public/brand/icon-black.svg, fill #222222) centered at 76×70 mobile / 120×110 desktop.
 * All values are explicit px/hex from the delivered redesign files. Server component.
 */

/** "Dr. Silviu Gresoi" → "SG" — fallback avatar when no expert photo matches the author. */
const initials = (name: string): string => {
  const parts = name
    .split(/\s+/)
    .filter((part) => /[\p{L}\p{N}]/u.test(part))
    .map((part) => [...part][0]!.toUpperCase())
  return parts.slice(-2).join('') || parts.join('')
}

/** Last word gets the gradient (delivered spec); whitespace is preserved for the a11y name. */
function GradientTitle({ title }: { title: string }) {
  const words = title.trim().split(/\s+/)
  const last = words.at(-1) ?? ''
  const head = words.slice(0, -1).join(' ')
  return (
    <h1 className="w-full text-[24px] font-semibold leading-8 tracking-[-0.8px] text-[#222222] [word-break:break-word] lg:text-[40px] lg:leading-[50px] lg:tracking-[-1px]">
      {head && <>{head} </>}
      <span className="bg-[linear-gradient(90deg,#407ea2_0%,#1c5d99_100%)] bg-clip-text text-transparent">
        {last}
      </span>
    </h1>
  )
}

/** Cover — real image, or the gradient placeholder with the brand "A" watermark centered. */
function ArticleCover({ post }: { post: BlogPost }) {
  const cover = asMedia(post.coverImage)
  if (cover) {
    return (
      <div className="relative h-[166px] w-full overflow-hidden rounded-[24px] lg:h-[360px]">
        <MediaImage media={cover} fill sizes="(min-width: 1024px) 760px, 100vw" priority />
      </div>
    )
  }
  return (
    <div className="flex h-[166px] w-full items-center justify-center overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#bbcde5_0%,#407ea2_100%)] lg:h-[360px]">
      {/* Brand "A" watermark — the EXISTING mark asset, fill #222222 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/icon-black.svg"
        alt=""
        aria-hidden="true"
        className="h-[70px] w-[76px] select-none object-contain lg:h-[110px] lg:w-[120px]"
      />
    </div>
  )
}

export function ArticleHeader({
  post,
  locale,
  authorPhotoUrl,
}: {
  post: BlogPost
  locale: Locale
  /** Expert photo URL (resolved by the page from the expertBio global, name-matched). */
  authorPhotoUrl?: string | null
}) {
  const dict = getDictionary(locale)
  const category = post.category ? dict.blog.categories[post.category] : null
  const dateStamp = formatDotStamp(post.createdAt)

  return (
    <>
      {/* ——— Back către listă (owner 2026-07-26) — navigare mai ușoară decât breadcrumb ——— */}
      <Link
        href={localePath(locale, '/blog')}
        className="w-fit text-[12px] tracking-[0.2px] text-[#959595] transition-colors hover:text-[#1c5d99] lg:text-[13px]"
      >
        ← {dict.blog.backToBlog}
      </Link>

      {/* ——— Title (last word in the brand gradient) ——— */}
      <GradientTitle title={post.title} />

      {/* ——— Author row: 44px avatar (photo on white / initials fallback) + name + meta ——— */}
      {(post.author || dateStamp || category) && (
        <div className="flex items-center gap-3">
          {post.author &&
            (authorPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={authorPhotoUrl}
                alt={post.author}
                className="size-11 shrink-0 rounded-full bg-white object-cover shadow-[0_0_5.3px_rgba(0,0,0,0.28)]"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#407ea2] to-[#1c5d99] text-[15px] font-semibold text-white shadow-[0_0_5.3px_rgba(0,0,0,0.28)]"
              >
                {initials(post.author)}
              </span>
            ))}
          <div className="flex min-w-0 flex-col gap-[1px]">
            {post.author && (
              <p className="text-[14px] font-medium text-[#222222]">{post.author}</p>
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
      )}

      {/* ——— Cover (image, or the branded gradient placeholder) ——— */}
      <ArticleCover post={post} />
    </>
  )
}
