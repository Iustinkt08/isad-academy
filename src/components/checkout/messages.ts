import type { CheckoutFailureBody } from '@/lib/checkout'
import { getDictionary } from '../../lib/i18n/dictionaries'
import type { Locale } from '../../lib/i18n/config'

/**
 * Pure mapping from the T6/T10 API error contract (`POST /api/checkout` and
 * `POST /api/checkout/quote` share one failure shape — `{ error, detail?, soldOut? }`)
 * to the friendly copy the checkout UI renders. Kept free of React so it is directly
 * unit-testable (tests/unit/checkout-ui/messages.test.ts).
 *
 * Bilingual site (RO under /ro): copy comes from the `checkout` dictionary section; the
 * `locale` parameter defaults to 'en' so existing callers/tests keep their contract.
 *
 * `ApiFailureBody` IS the server's own `CheckoutFailureBody` (type-only import — nothing
 * from the server module lands in the client bundle), re-exported under the name the
 * checkout UI has used since T10 so the two sides can never drift (T16).
 */
export type ApiFailureBody = CheckoutFailureBody

/** Inline message attached to the discount-code field for each invalid-code `detail`. */
export const codeDetailMessage = (
  detail: NonNullable<ApiFailureBody['detail']>,
  locale: Locale = 'en',
): string => {
  const t = getDictionary(locale).checkout
  switch (detail) {
    case 'notFound':
      return t.codeNotFound
    case 'expired':
      return t.codeExpired
    case 'inactive':
      return t.codeInactive
    case 'usageLimitReached':
      return t.codeUsageLimitReached
    case 'duplicate':
      return t.codeDuplicate
  }
}

export type CheckoutSubmitError =
  /** Attach to the discount-code field (400 with a code `detail`). */
  | { kind: 'code'; message: string }
  /** This edition just sold out mid-checkout (409 soldOut) — offer the course page link. */
  | { kind: 'soldOut'; message: string }
  /** Everything else — general error panel above the submit button. */
  | { kind: 'general'; message: string }

/**
 * Maps EVERY `POST /api/checkout` failure (status + body) to how the form surfaces it.
 * Statuses per T6's table: 400 validation / invalid code (with `detail`), 402 payment
 * failed, 404 session not found, 409 past / no-window / sold-out (with `soldOut` flag).
 */
export const checkoutSubmitError = (
  status: number,
  body: ApiFailureBody | null,
  locale: Locale = 'en',
): CheckoutSubmitError => {
  const t = getDictionary(locale).checkout
  if (status === 400 && body?.detail) {
    return { kind: 'code', message: codeDetailMessage(body.detail, locale) }
  }
  if (status === 400) {
    return {
      kind: 'general',
      message: body?.error ?? t.errorCheckDetails,
    }
  }
  if (status === 402) {
    return { kind: 'general', message: t.errorPaymentDeclined }
  }
  if (status === 404) {
    return {
      kind: 'general',
      message: t.errorEditionNotFound,
    }
  }
  if (status === 409 && body?.soldOut) {
    return { kind: 'soldOut', message: t.errorJustSoldOut }
  }
  if (status === 409) {
    return {
      kind: 'general',
      message: body?.error ?? t.errorEnrolmentNotOpen,
    }
  }
  return { kind: 'general', message: t.errorGeneric }
}
