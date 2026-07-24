import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { LOCALE_COOKIE } from './lib/i18n/config'

/**
 * Locale routing (owner decision 2026-07-13: bilingual site, EN canonical without a
 * prefix, RO under /ro — separate URLs keep pages statically cacheable + hreflang-able):
 *  - /ro, /ro/...            → pass through ([locale] segment receives 'ro')
 *  - /en/...                 → 308 to the unprefixed canonical URL
 *  - anything else           → rewrite to /en/... (URL stays clean); EXCEPT when the
 *    visitor's `locale` cookie says 'ro' — then redirect to the /ro twin (307, a
 *    preference, not permanent). Crawlers carry no cookie, so they always index EN
 *    at the canonical URLs and RO under /ro.
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl

  if (pathname === '/ro' || pathname.startsWith('/ro/')) {
    return NextResponse.next()
  }

  if (pathname === '/en' || pathname.startsWith('/en/')) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.slice(3) || '/'
    return NextResponse.redirect(url, 308)
  }

  if (request.cookies.get(LOCALE_COOKIE)?.value === 'ro') {
    const url = request.nextUrl.clone()
    url.pathname = pathname === '/' ? '/ro' : `/ro${pathname}`
    return NextResponse.redirect(url, 307)
  }

  const url = request.nextUrl.clone()
  url.pathname = pathname === '/' ? '/en' : `/en${pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  // Everything except Payload admin/API, Next internals, preview routes and files.
  matcher: ['/((?!api|admin|_next|next/|.*\\..*).*)'],
}
