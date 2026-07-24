'use client'

import { useConsent } from './ConsentProvider'

/** Footer link-style button that re-opens the cookie consent banner. */
export function CookiePreferencesButton({
  className,
  label = 'Cookie preferences',
}: {
  className?: string
  label?: string
}) {
  const { openPreferences } = useConsent()
  return (
    <button type="button" onClick={openPreferences} className={className}>
      {label}
    </button>
  )
}
