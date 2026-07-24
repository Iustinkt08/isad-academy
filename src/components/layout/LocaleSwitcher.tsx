'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { LOCALE_COOKIE, localePath, stripLocalePrefix, type Locale } from '../../lib/i18n/config'
import { cn } from '../ui/cn'

/**
 * Navbar language dropdown (reference design 2026-07-12): flag + RO/EN abbreviation +
 * chevron; the menu opens directly on hover (and on click/focus for touch & keyboard),
 * listing both languages with round flag icons. Navigates to the same page under the
 * other locale's URL (EN unprefixed ↔ /ro) and persists the preference in the `locale`
 * cookie, which the middleware uses to route returning visitors.
 */

function FlagRO({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-5 rounded-full', className)} aria-hidden="true">
      <clipPath id="ro-circle">
        <circle cx="12" cy="12" r="12" />
      </clipPath>
      <g clipPath="url(#ro-circle)">
        <rect x="0" y="0" width="8" height="24" fill="#002B7F" />
        <rect x="8" y="0" width="8" height="24" fill="#FCD116" />
        <rect x="16" y="0" width="8" height="24" fill="#CE1126" />
      </g>
    </svg>
  )
}

function FlagEN({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-5 rounded-full', className)} aria-hidden="true">
      <clipPath id="en-circle">
        <circle cx="12" cy="12" r="12" />
      </clipPath>
      <g clipPath="url(#en-circle)">
        <rect width="24" height="24" fill="#012169" />
        <path d="M0 0l24 24M24 0L0 24" stroke="#fff" strokeWidth="4.8" />
        <path d="M0 0l24 24M24 0L0 24" stroke="#C8102E" strokeWidth="2.4" />
        <path d="M12 0v24M0 12h24" stroke="#fff" strokeWidth="8" />
        <path d="M12 0v24M0 12h24" stroke="#C8102E" strokeWidth="4.8" />
      </g>
    </svg>
  )
}

const RO_OPTION = { value: 'ro' as Locale, label: 'RO', Flag: FlagRO }
const EN_OPTION = { value: 'en' as Locale, label: 'EN', Flag: FlagEN }
const OPTIONS = [RO_OPTION, EN_OPTION]

export function LocaleSwitcher({
  locale,
  label,
  className,
}: {
  locale: Locale
  label: string
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [current, setCurrent] = useState<Locale>(locale)
  const [open, setOpen] = useState(false)

  const active = current === 'ro' ? RO_OPTION : EN_OPTION

  const choose = (next: Locale) => {
    setOpen(false)
    if (next === current) return
    setCurrent(next)
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
    startTransition(() => {
      router.push(localePath(next, stripLocalePrefix(pathname)))
    })
  }

  return (
    <span data-open={open ? 'true' : undefined} className={cn('group relative inline-flex', className)}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        disabled={isPending}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 items-center gap-2 rounded-full px-2.5 text-sm font-semibold text-ink transition-colors duration-200 hover:bg-ice/30 disabled:cursor-wait disabled:opacity-60"
      >
        <active.Flag />
        {active.label}
        <svg
          viewBox="0 0 12 12"
          className="h-3 w-3 text-blue transition-transform duration-200 group-hover:-rotate-180 group-focus-within:-rotate-180 group-data-[open=true]:-rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2 7.5l4-4 4 4" />
        </svg>
      </button>

      {/* Opens on hover (desktop), click (touch) and keyboard focus — animated in
          (opacity + slight rise) instead of appearing abruptly. `visibility` is
          transitioned so the panel stays interactive until the fade-out completes. */}
      <span
        className={cn(
          'absolute right-0 top-full z-50 pt-2 transition-[opacity,transform,visibility] duration-200 ease-out',
          'invisible -translate-y-1 opacity-0',
          'group-hover:visible group-hover:translate-y-0 group-hover:opacity-100',
          'group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100',
          'group-data-[open=true]:visible group-data-[open=true]:translate-y-0 group-data-[open=true]:opacity-100',
          'motion-reduce:transition-none',
        )}
      >
        <span className="flex min-w-[132px] flex-col gap-1 rounded-2xl border border-ice/50 bg-paper p-2 shadow-lift">
          {OPTIONS.map(({ value, label: optionLabel, Flag }) => (
            <button
              key={value}
              type="button"
              onClick={() => choose(value)}
              className={cn(
                'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-ice/30',
                value === current && 'bg-ice/20',
              )}
            >
              <Flag />
              {optionLabel}
            </button>
          ))}
        </span>
      </span>
    </span>
  )
}
