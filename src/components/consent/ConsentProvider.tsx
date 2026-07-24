'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type ConsentDecision = 'accepted' | 'rejected'

const STORAGE_KEY = 'cookie-consent'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180 // 180 days

export type ConsentContextValue = {
  /**
   * `null` = no decision yet — non-essential scripts stay OFF (privacy-first default).
   * T14 must gate GA4/GTM on `hasAnalyticsConsent`, which is true ONLY after an
   * explicit accept.
   */
  consent: ConsentDecision | null
  hasAnalyticsConsent: boolean
  /** True while the banner should be rendered (no decision yet, or preferences reopened). */
  isBannerOpen: boolean
  accept: () => void
  reject: () => void
  /** Re-opens the consent banner (footer "Cookie preferences" button). */
  openPreferences: () => void
}

const ConsentContext = createContext<ConsentContextValue | null>(null)

function persist(decision: ConsentDecision) {
  try {
    window.localStorage.setItem(STORAGE_KEY, decision)
  } catch {
    // Storage unavailable (private mode etc.) — the cookie below still persists it.
  }
  document.cookie = `${STORAGE_KEY}=${decision}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`
}

function readStored(): ConsentDecision | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'accepted' || stored === 'rejected') return stored
  } catch {
    // fall through to the cookie
  }
  const match = document.cookie.match(/(?:^|;\s*)cookie-consent=(accepted|rejected)(?:;|$)/)
  return match ? (match[1] as ConsentDecision) : null
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentDecision | null>(null)
  const [ready, setReady] = useState(false)
  const [prefsOpen, setPrefsOpen] = useState(false)

  // Read after mount to avoid a hydration mismatch; until then nothing is loaded.
  useEffect(() => {
    setConsent(readStored())
    setReady(true)
  }, [])

  const accept = useCallback(() => {
    setConsent('accepted')
    persist('accepted')
    setPrefsOpen(false)
  }, [])

  const reject = useCallback(() => {
    setConsent('rejected')
    persist('rejected')
    setPrefsOpen(false)
  }, [])

  const openPreferences = useCallback(() => setPrefsOpen(true), [])

  const value = useMemo<ConsentContextValue>(
    () => ({
      consent,
      hasAnalyticsConsent: consent === 'accepted',
      isBannerOpen: ready && (consent === null || prefsOpen),
      accept,
      reject,
      openPreferences,
    }),
    [consent, ready, prefsOpen, accept, reject, openPreferences],
  )

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext)
  if (!ctx) {
    throw new Error('useConsent must be used inside <ConsentProvider>')
  }
  return ctx
}
