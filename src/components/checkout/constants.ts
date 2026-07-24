import type { Locale } from '@/lib/i18n/config'

/**
 * sessionStorage key for the confirmation hand-off (T10). `orders` has NO public read
 * access (CLAUDE.md §4) — the `POST /api/checkout` 200 response payload IS the recap, so
 * the form stores that full response here and `/checkout/confirmare` renders from it.
 * sessionStorage (not localStorage) on purpose: the recap is buyer/participant PII and
 * should not outlive the browser tab.
 */
export const CONFIRMATION_STORAGE_KEY = 'isad-checkout-confirmation'

/** UI seat cap — mirrors the course detail page's EnrolForm selector (1–8). The server
 * accepts more; this is a UX bound, not a business rule. */
export const MAX_SEATS = 8

/** Stable DOM id for the discount-code input so the form can move focus to it when a
 * submit-time 400 attaches a code error (a11y: focus the first invalid field). */
export const CODE_INPUT_ID = 'checkout-discount-code'

/** Locale-aware date label, e.g. "19 Aug 2026" / "19 aug. 2026" (bilingual site, RO under
 * /ro). Checkout-local so the checkout UI follows the page locale. */
export const formatDateLocale = (
  value: string | null | undefined,
  locale: Locale,
): string | null => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(locale === 'ro' ? 'ro-RO' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}
