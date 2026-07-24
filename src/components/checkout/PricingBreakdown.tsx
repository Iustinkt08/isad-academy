import { formatPrice } from '../courses/helpers'
import { roundCurrency, type PricingSnapshot } from '@/lib/pricing'
import { getDictionary } from '@/lib/i18n/dictionaries'
import type { Locale } from '@/lib/i18n/config'

/**
 * Presentational pricing breakdown shared by the checkout order summary (live quote) and
 * the confirmation recap (order snapshot). Purely display — every number comes from a
 * server-computed `PricingSnapshot`; only the subtotal line (basePrice × quantity) is
 * derived locally, with the engine's own rounding.
 * Bilingual site (RO under /ro): copy comes from the `checkout` dictionary section.
 */
export function PricingBreakdown({
  locale,
  pricing,
  quantity,
  currency,
  vatDisplay,
  codeLabel,
  onRemoveCode,
}: {
  locale: Locale
  pricing: PricingSnapshot
  quantity: number
  currency: string
  vatDisplay: 'incl' | 'excl'
  /** Human-readable applied code (e.g. "WELCOME10") for the code-discount line. */
  codeLabel?: string | null
  /** When provided, renders a "Remove code" button next to the code-discount line. */
  onRemoveCode?: () => void
}) {
  const t = getDictionary(locale).checkout
  const subtotal = roundCurrency(pricing.basePrice * quantity)

  return (
    <dl className="divide-y divide-ice/60 text-sm" data-testid="pricing-breakdown">
      <div className="flex items-baseline justify-between gap-4 py-2.5">
        <dt className="text-ink/80">
          {t.windowPriceNames[pricing.appliedWindow]} {t.seatsSuffix(quantity)}
        </dt>
        <dd className="font-medium text-ink">{formatPrice(pricing.basePrice, currency)}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-4 py-2.5">
        <dt className="text-ink/80">{t.subtotal}</dt>
        <dd className="font-medium text-ink">{formatPrice(subtotal, currency)}</dd>
      </div>
      {pricing.groupDiscount > 0 && (
        <div className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="text-ink/80">{t.groupDiscountBreakdown}</dt>
          <dd className="font-medium text-blue">−{formatPrice(pricing.groupDiscount, currency)}</dd>
        </div>
      )}
      {pricing.memberDiscount > 0 && (
        <div className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="text-ink/80">{t.memberDiscount}</dt>
          <dd className="font-medium text-blue">−{formatPrice(pricing.memberDiscount, currency)}</dd>
        </div>
      )}
      {pricing.codeDiscount > 0 && (
        <div className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="flex items-center gap-2 text-ink/80">
            <span>
              {t.discountCode}
              {codeLabel ? ` ${codeLabel}` : ''}
            </span>
            {onRemoveCode && (
              <button
                type="button"
                onClick={onRemoveCode}
                className="text-xs font-semibold text-blue underline underline-offset-2 hover:text-navy"
              >
                {t.removeCode}
              </button>
            )}
          </dt>
          <dd className="font-medium text-blue">−{formatPrice(pricing.codeDiscount, currency)}</dd>
        </div>
      )}
      <div className="flex items-baseline justify-between gap-4 py-3">
        <dt className="text-base font-bold text-ink">{t.total}</dt>
        <dd className="text-h4 font-bold text-blue">{formatPrice(pricing.total, currency)}</dd>
      </div>
      <div className="py-2.5">
        <dt className="sr-only">{t.vatLabel}</dt>
        <dd className="text-xs text-grey-500">
          {vatDisplay === 'incl' ? t.vatIncluded : t.vatExclShown}
        </dd>
      </div>
    </dl>
  )
}
