export const LOCALES = ['en', 'ro'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'
/** Language preference cookie — read by the middleware to route returning visitors
 * to their language (EN lives unprefixed, RO under /ro — owner decision 2026-07-13). */
export const LOCALE_COOKIE = 'locale'

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value)

/** Prefix an internal path for a locale: EN stays unprefixed, RO gets /ro. */
export const localePath = (locale: Locale, path: string): string => {
  if (locale === DEFAULT_LOCALE) return path
  return path === '/' ? `/${locale}` : `/${locale}${path}`
}

/** Remove a locale prefix from a pathname (→ the EN-canonical path). */
export const stripLocalePrefix = (pathname: string): string => {
  for (const locale of LOCALES) {
    if (pathname === `/${locale}`) return '/'
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1)
  }
  return pathname
}
