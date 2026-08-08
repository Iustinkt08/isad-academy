'use client'

import { useLocale, useTranslation } from '@payloadcms/ui'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * Editing-language card in the LEFT NAV, right under the logo (owner 2026-08-08 v2:
 * the previous top strip is gone — "amplasam asta cu limba in meniul din stanga sub
 * logo"). Lives in `admin.components.beforeNavLinks`, so it shows in the mobile nav
 * overlay too. The dropdown drives the same `?locale=` mechanism as Payload's own
 * Localizer (top right), which stays. The logout link stays here as well — on phones
 * this card is the easiest place to reach it.
 */
const CONTENT_LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'ro', label: 'Română' },
] as const

export function NavLocale() {
  const locale = useLocale()
  const { i18n } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const uiIsRo = String(i18n?.language ?? 'en').startsWith('ro')
  const current = locale?.code === 'ro' ? 'ro' : 'en'

  const switchLocale = (code: string): void => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.set('locale', code)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="isad-nav-locale">
      <label className="isad-nav-locale__label">
        {uiIsRo ? 'Editezi site-ul în limba:' : 'You are editing the site in:'}
        <select
          className="isad-nav-locale__select"
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

      <Link className="isad-nav-locale__logout" href="/admin/logout">
        <svg
          aria-hidden="true"
          width="13"
          height="13"
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
