'use client'

import Link from 'next/link'

import { getDictionary } from '../../lib/i18n/dictionaries'
import { DEFAULT_LOCALE, localePath, type Locale } from '../../lib/i18n/config'
import { Button } from '../ui/Button'
import { useConsent } from './ConsentProvider'

/**
 * Privacy-first cookie banner: fixed position (no layout shift), equal-weight
 * Accept / Refuse buttons, nothing non-essential loads before an explicit accept.
 */
export function CookieConsentBanner({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const t = getDictionary(locale).consent
  const { isBannerOpen, accept, reject } = useConsent()

  if (!isBannerOpen) return null

  return (
    <div
      role="region"
      aria-label={t.aria}
      className="fixed inset-x-0 bottom-0 z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto max-w-3xl rounded-3xl border border-ice/70 bg-paper/95 p-5 shadow-2xl shadow-ink/20 backdrop-blur-md sm:p-6">
        <h2 className="text-base font-semibold text-ink">{t.title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink/70">
          {t.bodyBeforeLink}
          <Link
            href={localePath(locale, '/politica-cookie')}
            className="font-medium text-blue underline underline-offset-2"
          >
            {t.policyLink}
          </Link>
          {t.bodyAfterLink}
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button type="button" size="sm" variant="primary" onClick={accept} className="sm:flex-1">
            {t.accept}
          </Button>
          <Button type="button" size="sm" variant="dark" onClick={reject} className="sm:flex-1">
            {t.refuse}
          </Button>
        </div>
      </div>
    </div>
  )
}
