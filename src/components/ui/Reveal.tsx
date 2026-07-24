'use client'

import { useEffect, useRef, type ReactNode } from 'react'

import { cn } from './cn'

/**
 * Scroll-reveal wrapper (fade + 16px rise, 500ms, --ease-brand — Redesign Spec §3 motion).
 * Progressive enhancement by construction: the hidden initial state is applied only under
 * `@media (scripting: enabled)` in globals.css, so content is never invisible without JS,
 * and `prefers-reduced-motion` disables the effect entirely (content always visible).
 * The observer reveals once and disconnects — no re-hiding while scrolling back up.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('revealed')
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add('revealed')
            observer.disconnect()
          }
        }
      },
      // threshold 0: fire the moment the block crosses the line 10% above the viewport
      // bottom — a fractional threshold is unreliable for sections taller than the viewport.
      { rootMargin: '0px 0px -10% 0px', threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} data-reveal className={cn(className)}>
      {children}
    </div>
  )
}
