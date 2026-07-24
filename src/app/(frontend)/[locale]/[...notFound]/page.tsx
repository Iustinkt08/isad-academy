import { notFound } from 'next/navigation'

/**
 * Catch-all for fully unmatched URLs (T14). The app has no root layout — only the
 * (frontend) and (payload) route groups — so without this, an unknown path would fall
 * through to Next's unstyled default 404 instead of the branded `not-found.tsx` inside
 * the (frontend) layout. Explicit routes (including /admin and /api) always win over a
 * catch-all, so nothing else is shadowed. Responds with a real 404 status.
 */
export default function CatchAllNotFound(): never {
  notFound()
}
