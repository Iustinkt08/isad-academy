'use client'

import { useCallback, useEffect, useState, type RefObject } from 'react'

/**
 * Snap geometry of the Home mobile carousels (Figma 3784-26): 21px strip padding, mirrored
 * by the scroll-detection math below and the `scroll-pl-[21px]` utility on the scroller.
 * Keep them in sync.
 */
export const SNAP_STRIP_PAD = 21

/**
 * Tracks the snapped card of a horizontal snap carousel and jumps to a given card.
 * Cards are marked with `data-carousel-card` inside the scroller. Shared by the courses
 * and testimonials carousels (owner 2026-09-22) so dots and geometry behave identically.
 *
 * The snapped card is found by measuring each card's left edge against the strip's start
 * (the `pad` inset) — robust to any card width / device pixel ratio, rAF-throttled so scroll
 * stays smooth. Degrades gracefully without JS: the strip is a plain scroll container and the
 * dots simply won't track.
 */
export type SnapAlign = 'start' | 'center'

/** Where a card rests when snapped: its left edge `pad` px into the strip, or its centre on
 *  the strip's centre (owner 2026-09-22: the Home carousels are CENTRED on mobile). */
const anchor = (rect: DOMRect, align: SnapAlign, pad: number) =>
  align === 'center' ? rect.left + rect.width / 2 : rect.left + pad

export function useSnapCarousel(
  scrollerRef: RefObject<HTMLDivElement | null>,
  itemCount: number,
  { pad = SNAP_STRIP_PAD, align = 'start' }: { pad?: number; align?: SnapAlign } = {},
) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    let raf = 0
    const sync = () => {
      raf = 0
      const cards = scroller.querySelectorAll<HTMLElement>('[data-carousel-card]')
      if (cards.length === 0) return
      const target = anchor(scroller.getBoundingClientRect(), align, pad)
      let best = 0
      let bestDist = Infinity
      cards.forEach((card, i) => {
        const dist = Math.abs(anchor(card.getBoundingClientRect(), align, 0) - target)
        if (dist < bestDist) {
          bestDist = dist
          best = i
        }
      })
      setActiveIndex(best)
    }
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(sync)
    }

    sync()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [scrollerRef, itemCount, pad, align])

  const scrollToIndex = useCallback(
    (i: number) => {
      const scroller = scrollerRef.current
      if (!scroller) return
      const card = scroller.querySelectorAll<HTMLElement>('[data-carousel-card]')[i]
      if (!card) return
      const left =
        scroller.scrollLeft +
        anchor(card.getBoundingClientRect(), align, 0) -
        anchor(scroller.getBoundingClientRect(), align, pad)
      const reduce =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      scroller.scrollTo({ left, behavior: reduce ? 'auto' : 'smooth' })
    },
    [scrollerRef, pad, align],
  )

  return { activeIndex, scrollToIndex }
}
