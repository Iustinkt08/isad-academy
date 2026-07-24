'use client'

import Script from 'next/script'
import { useEffect, useRef } from 'react'

import { useConsent } from '@/components/consent/ConsentProvider'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

type AnalyticsProps = {
  /** GA4 measurement ID — siteSettings.analytics.ga4Id, falling back to NEXT_PUBLIC_GA4_ID. */
  ga4Id?: string | null
  /** GTM container ID — siteSettings.analytics.gtmId, falling back to NEXT_PUBLIC_GTM_ID. */
  gtmId?: string | null
}

/**
 * Consent-gated, lazy GA4 + GTM loader (T14 — CLAUDE.md §7 hard rule: ZERO third-party
 * requests before an explicit accept).
 *
 * Gating: renders NOTHING unless `useConsent().hasAnalyticsConsent === true` (set only by
 * an explicit "Accept" — T8's privacy-first default) AND at least one ID is configured.
 * Because consent is read from storage in an effect after mount, the server render and
 * first client render are always empty — no third-party markup ever reaches the initial
 * HTML, and no request leaves the browser before consent.
 *
 * Laziness: the external googletagmanager.com scripts use next/script
 * `strategy="lazyOnload"` — they load during browser idle time, after everything else,
 * protecting Core Web Vitals (§7 "consent-gated + lazy").
 *
 * Consent Mode v2: before any external script executes, an inline bootstrap pushes
 * `gtag('consent', 'default', …all denied)` followed by
 * `gtag('consent', 'update', { analytics_storage: 'granted' })` — analytics_storage is the
 * ONLY signal granted; ad_storage / ad_user_data / ad_personalization stay denied (no ads
 * use case on this site).
 *
 * Revocation: if the user re-opens preferences and refuses AFTER the scripts have loaded,
 * we immediately push `gtag('consent', 'update', { analytics_storage: 'denied' })`, which
 * stops measurement cookies/signals right away. The already-injected script *tags*
 * themselves only disappear on the next full page load (script tags cannot be un-executed
 * once run) — from that navigation on, this component renders nothing again.
 */
export function Analytics({ ga4Id, gtmId }: AnalyticsProps) {
  const { consent, hasAnalyticsConsent } = useConsent()
  const scriptsLoadedRef = useRef(false)

  const cleanGa4Id = ga4Id?.trim() || null
  const cleanGtmId = gtmId?.trim() || null
  const hasAnyId = Boolean(cleanGa4Id || cleanGtmId)

  useEffect(() => {
    if (hasAnalyticsConsent && hasAnyId) {
      scriptsLoadedRef.current = true
    } else if (consent === 'rejected' && scriptsLoadedRef.current) {
      // Consent revoked mid-session: flip analytics_storage back to denied immediately.
      window.gtag?.('consent', 'update', { analytics_storage: 'denied' })
    }
  }, [consent, hasAnalyticsConsent, hasAnyId])

  if (!hasAnalyticsConsent || !hasAnyId) return null

  const consentBootstrap = [
    'window.dataLayer = window.dataLayer || [];',
    'function gtag(){window.dataLayer.push(arguments);}',
    'window.gtag = window.gtag || gtag;',
    // Consent Mode v2 default: everything denied…
    "window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });",
    // …then grant analytics_storage only (the user explicitly accepted analytics cookies).
    "window.gtag('consent', 'update', { analytics_storage: 'granted' });",
    ...(cleanGa4Id
      ? [
          "window.gtag('js', new Date());",
          `window.gtag('config', ${JSON.stringify(cleanGa4Id)});`,
        ]
      : []),
    ...(cleanGtmId
      ? [`window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });`]
      : []),
  ].join('\n')

  return (
    <>
      {/* Inline bootstrap — first-party, runs on mount (i.e. only after accept), BEFORE
          the lazy external scripts execute, so the consent state is already queued. */}
      <Script id="analytics-consent-bootstrap" strategy="afterInteractive">
        {consentBootstrap}
      </Script>
      {cleanGa4Id && (
        <Script
          id="ga4-script"
          src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cleanGa4Id)}`}
          strategy="lazyOnload"
        />
      )}
      {cleanGtmId && (
        <Script
          id="gtm-script"
          src={`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(cleanGtmId)}`}
          strategy="lazyOnload"
        />
      )}
    </>
  )
}
