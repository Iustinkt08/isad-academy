'use client'

import { useEffect, useRef } from 'react'

/**
 * Site scroll progressbar (owner 2026-07-13): a subtle vertical track on the RIGHT edge of
 * the viewport — grey by default (`line` token, NO stroke/border of any kind), filled from
 * the top with the brand gradient as the page scrolls. Decorative (aria-hidden,
 * pointer-events-none); hidden while the page has nothing to scroll. rAF-throttled writes
 * straight to the fill's style so scrolling never re-renders React.
 */
export function ScrollProgress() {
  const fillRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf: number | null = null

    const update = () => {
      raf = null
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      const track = trackRef.current
      const fill = fillRef.current
      if (!track || !fill) return
      if (max <= 0) {
        track.style.opacity = '0'
        return
      }
      track.style.opacity = '1'
      const progress = Math.min(1, Math.max(0, window.scrollY / max))
      fill.style.height = `${(progress * 100).toFixed(2)}%`
    }

    const onScroll = () => {
      if (raf == null) raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      if (raf != null) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <div
      ref={trackRef}
      aria-hidden="true"
      className="pointer-events-none fixed right-[10px] top-1/2 z-40 h-[22vh] w-[4px] -translate-y-1/2 rounded-full bg-line/70 transition-opacity duration-300 max-md:hidden"
    >
      <div
        ref={fillRef}
        className="w-full rounded-full bg-gradient-to-b from-steel via-blue to-steel"
        style={{ height: '0%' }}
      />
    </div>
  )
}
