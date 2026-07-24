import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'

import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './config'

export {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALES,
  isLocale,
  localePath,
  stripLocalePrefix,
  type Locale,
} from './config'
export type { Dictionary } from './dictionaries'
export { getDictionary } from './dictionaries'

/**
 * Validate the `[locale]` route param (pages are statically generated per locale;
 * anything else — e.g. /fr/... — is a 404).
 */
export const resolveLocale = (value: string): Locale => {
  if (!isLocale(value)) notFound()
  return value
}

/**
 * Locale from the preference cookie — ONLY for request-time contexts without a
 * [locale] param (API routes: form handlers, newsletter, emails). Pages must use
 * `resolveLocale(params.locale)` instead, so they stay statically renderable.
 */
export const getLocale = async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value
  return isLocale(value) ? value : DEFAULT_LOCALE
}

