import type { CourseSession } from '../../payload-types'

/**
 * Visitor-currency resolution (B1, discovery answers doc, iulie 2026): visitors from
 * Romania pay in RON, everyone else in EUR. Geo comes from the platform's country header
 * (Vercel sets `x-vercel-ip-country` on every prod request; Cloudflare's `cf-ipcountry`
 * is honored too). When no header is present (local dev, self-hosted without a geo proxy)
 * the fallback is the config-driven `siteSettings.currency` (§13) — and `DEV_GEO_COUNTRY`
 * lets local dev simulate any country.
 */
export type Currency = 'EUR' | 'RON'

export const resolveCurrency = (
  country: string | null | undefined,
  fallback: Currency = 'EUR',
): Currency => {
  if (!country) return fallback
  return country.trim().toUpperCase() === 'RO' ? 'RON' : 'EUR'
}

export const getVisitorCountry = (headers: Headers): string | null =>
  process.env.DEV_GEO_COUNTRY?.trim() ||
  headers.get('x-vercel-ip-country') ||
  headers.get('cf-ipcountry') ||
  null

export const getVisitorCurrency = (headers: Headers, fallback: Currency = 'EUR'): Currency =>
  resolveCurrency(getVisitorCountry(headers), fallback)

type PriceWindow = CourseSession['earlyBird']

/**
 * Maps a price-window group to the single-`price` shape the pricing engine and the UI
 * consume, for the given currency. `price` = EUR, `priceRON` = RON. A window without a
 * price in the visitor's currency resolves to `price: null` — the engine already treats
 * that as "window not configured" (src/lib/pricing/windows.ts), so a RON visitor simply
 * cannot buy a window that has no RON price (never silently billed the EUR amount).
 */
export const windowForCurrency = (window: PriceWindow, currency: Currency): PriceWindow => {
  if (!window) return window
  if (currency === 'EUR') return window
  return { ...window, price: window.priceRON ?? null }
}

/** A session clone whose windows are resolved to the visitor's currency — safe to hand to
 * the pricing engine, the price block UI and the Course JSON-LD unchanged. */
export const resolveSessionForCurrency = (
  session: CourseSession,
  currency: Currency,
): CourseSession => ({
  ...session,
  earlyBird: windowForCurrency(session.earlyBird, currency),
  standard: windowForCurrency(session.standard, currency),
})
