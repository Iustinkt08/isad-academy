import Image from 'next/image'

import { toImageSrc } from '@/lib/media/imageSrc'
import { cn } from '../ui/cn'
import type { Media } from '@/payload-types'

/**
 * Renders a Payload media upload via next/image. `media.url` is ABSOLUTE whenever
 * `serverURL` is configured, and next/image rejects absolute URLs without a
 * remotePatterns entry — `toImageSrc` strips the site's own origin first.
 * Returns null when the media has no URL so callers can supply their own fallback.
 */
export function MediaImage({
  media,
  className,
  sizes,
  fill = false,
  priority = false,
  quality,
  unoptimized = false,
}: {
  media: Media | null
  className?: string
  sizes?: string
  /** Fill the parent (parent must be `relative` with a fixed aspect/size). */
  fill?: boolean
  priority?: boolean
  /** next/image re-encode quality (1–100); omit for the Next default (75). */
  quality?: number
  /**
   * Serve the uploaded file byte-for-byte (no resize, no WebP re-encode). Use for
   * flat graphics (text/logo on solid colour) where lossy re-encoding rings at the
   * edges even at quality 100. The browser downloads the full original.
   */
  unoptimized?: boolean
}) {
  if (!media?.url) return null

  const src = toImageSrc(media.url)
  const alt = media.alt || ''

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        quality={quality}
        unoptimized={unoptimized}
        className={cn('object-cover', className)}
      />
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={media.width ?? 1200}
      height={media.height ?? 675}
      sizes={sizes}
      priority={priority}
      quality={quality}
      unoptimized={unoptimized}
      className={className}
    />
  )
}
