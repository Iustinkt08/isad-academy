import type { ReactNode } from 'react'

/**
 * Page-transition wrapper (owner 2026-07-13): Next re-mounts a route-group template on
 * EVERY navigation, so the `page-enter` animation (fade-in + un-blur, globals.css) plays
 * each time the user switches pages. Only page content animates — the sticky header,
 * footer and overlays live in layout.tsx, outside this wrapper. Reduced motion is handled
 * globally (animations collapse to 0.01ms).
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="animate-page-enter">{children}</div>
}
