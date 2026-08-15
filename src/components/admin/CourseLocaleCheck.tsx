'use client'

import { Button, useDocumentEvents, useDocumentInfo, useLocale, useTranslation } from '@payloadcms/ui'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

/**
 * After-save language completeness check for Courses (owner 2026-08-15): when a course is
 * saved in one content language (EN/RO) while the OTHER language has no title yet, an
 * overlay pops up offering a one-click switch to that language (the same `?locale=`
 * mechanism as the nav card / Payload's Localizer). Saving is never blocked — the popup
 * appears after a successful save, and "Later" simply dismisses it.
 *
 * Trigger: `useDocumentEvents().mostRecentUpdate`, reported by the edit view on every
 * explicit save (Save draft / Publish — Courses has no autosave, so no typing noise).
 * Completeness signal: the localized required `title` fetched with `fallback-locale=none`
 * (`draft=true`, so a just-saved draft counts as completed).
 */

type ContentLocale = { code: 'en' | 'ro'; label: string }

const LOCALES: Record<'en' | 'ro', ContentLocale> = {
  en: { code: 'en', label: 'English' },
  ro: { code: 'ro', label: 'Română' },
}

export function CourseLocaleCheck() {
  const { id, collectionSlug } = useDocumentInfo()
  const { mostRecentUpdate } = useDocumentEvents()
  const locale = useLocale()
  const { i18n } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [missing, setMissing] = useState<ContentLocale | null>(null)
  // One popup per save event — remembers the last update stamp it already handled.
  const lastHandled = useRef<string | null>(null)

  const uiIsRo = String(i18n?.language ?? 'en').startsWith('ro')
  const current = locale?.code === 'ro' ? LOCALES.ro : LOCALES.en
  const other = current.code === 'ro' ? LOCALES.en : LOCALES.ro

  useEffect(() => {
    if (!mostRecentUpdate || !id) return
    if (mostRecentUpdate.entitySlug !== collectionSlug) return
    if (String(mostRecentUpdate.id ?? '') !== String(id)) return

    const stamp = `${mostRecentUpdate.id}:${mostRecentUpdate.updatedAt}`
    if (lastHandled.current === stamp) return
    lastHandled.current = stamp

    const controller = new AbortController()
    fetch(
      `/api/courses/${id}?locale=${other.code}&fallback-locale=none&depth=0&draft=true`,
      { credentials: 'include', signal: controller.signal },
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((doc: { title?: unknown } | null) => {
        if (!doc) return
        const title = typeof doc.title === 'string' ? doc.title.trim() : ''
        if (!title) setMissing(other)
      })
      .catch(() => {
        /* offline/aborted — never block the editor over a courtesy check */
      })
    return () => controller.abort()
  }, [mostRecentUpdate, id, collectionSlug, other])

  if (!missing) return null

  const switchToMissing = (): void => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.set('locale', missing.code)
    setMissing(null)
    router.replace(`${pathname}?${params.toString()}`)
  }

  const heading = uiIsRo ? 'Mai e de completat o limbă' : 'One more language to fill in'
  const body = uiIsRo
    ? `Ai salvat cursul în ${current.label}, dar versiunea în ${missing.label} nu e completată încă (nu are titlu). Vizitatorii site-ului în ${missing.label} vor vedea deocamdată conținutul din ${current.label}.`
    : `You saved this course in ${current.label}, but the ${missing.label} version is not filled in yet (it has no title). Visitors browsing the site in ${missing.label} will see the ${current.label} content for now.`
  const switchLabel = uiIsRo ? `Comută la ${missing.label}` : `Switch to ${missing.label}`
  const laterLabel = uiIsRo ? 'Mai târziu' : 'Later'

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={heading}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.55)',
      }}
    >
      <div
        style={{
          background: 'var(--theme-elevation-0)',
          color: 'var(--theme-elevation-800)',
          borderRadius: '8px',
          border: '1px solid var(--theme-elevation-150)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.35)',
          maxWidth: '440px',
          width: 'calc(100% - 40px)',
          padding: '28px',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.25rem', lineHeight: 1.3 }}>{heading}</h2>
        <p style={{ margin: '14px 0 22px', lineHeight: 1.5 }}>{body}</p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button buttonStyle="primary" size="medium" onClick={switchToMissing}>
            {switchLabel}
          </Button>
          <Button buttonStyle="secondary" size="medium" onClick={() => setMissing(null)}>
            {laterLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
