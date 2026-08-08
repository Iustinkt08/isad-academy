'use client'

import { useAuth, useLocale, useTranslation } from '@payloadcms/ui'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * Always-visible banner above the admin (admin.components.header) — owner 2026-08-08:
 * "as pune in partea de sus: Atentie acum editezi siteul in limba: Romana/Engleza".
 * The dropdown drives the SAME `?locale=` mechanism as Payload's own Localizer (top
 * right), which stays in place. The right side carries a logout link because on phones
 * the sidebar logout is hard to reach (same owner round).
 */
const CONTENT_LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'ro', label: 'Română' },
] as const

export function LocaleBanner() {
  const { user } = useAuth()
  const locale = useLocale()
  const { i18n } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Login / logged-out screens have no locale context worth announcing.
  if (!user) return null

  const uiIsRo = String(i18n?.language ?? 'en').startsWith('ro')
  const current = locale?.code === 'ro' ? 'ro' : 'en'

  const switchLocale = (code: string): void => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.set('locale', code)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="isad-locale-banner" role="status">
      <label className="isad-locale-banner__message">
        {uiIsRo ? 'Atenție: acum editezi site-ul în limba: ' : 'Heads up: you are editing the site in: '}
        <select
          className="isad-locale-banner__select"
          value={current}
          onChange={(event) => switchLocale(event.target.value)}
        >
          {CONTENT_LOCALES.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>

      <Link className="isad-locale-banner__logout" href="/admin/logout">
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        {uiIsRo ? 'Deconectare' : 'Log out'}
      </Link>
    </div>
  )
}
