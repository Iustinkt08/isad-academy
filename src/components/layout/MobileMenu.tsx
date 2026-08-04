'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'

import { LOCALE_COOKIE, localePath, stripLocalePrefix, type Locale } from '../../lib/i18n/config'
import { cn } from '../ui/cn'

type NavItem = { label: string; href: string; disabled?: boolean }

function FlagRO() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 rounded-full" aria-hidden="true">
      <clipPath id="mm-ro">
        <circle cx="12" cy="12" r="12" />
      </clipPath>
      <g clipPath="url(#mm-ro)">
        <rect width="8" height="24" fill="#002B7F" />
        <rect x="8" width="8" height="24" fill="#FCD116" />
        <rect x="16" width="8" height="24" fill="#CE1126" />
      </g>
    </svg>
  )
}

function FlagEN() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 rounded-full" aria-hidden="true">
      <clipPath id="mm-en">
        <circle cx="12" cy="12" r="12" />
      </clipPath>
      <g clipPath="url(#mm-en)">
        <rect width="24" height="24" fill="#012169" />
        <path d="M0 0l24 24M24 0L0 24" stroke="#fff" strokeWidth="4.8" />
        <path d="M0 0l24 24M24 0L0 24" stroke="#C8102E" strokeWidth="2.4" />
        <path d="M12 0v24M0 12h24" stroke="#fff" strokeWidth="8" />
        <path d="M12 0v24M0 12h24" stroke="#C8102E" strokeWidth="4.8" />
      </g>
    </svg>
  )
}

const RO_LANG = { value: 'ro' as Locale, label: 'Română', Flag: FlagRO }
const EN_LANG = { value: 'en' as Locale, label: 'English', Flag: FlagEN }

const CLOSE_THRESHOLD = 110 // px dragged down before it dismisses

/**
 * Mobile navigation as a draggable bottom sheet (owner request 2026-07-12): fades up from
 * the bottom over a blurred backdrop, dismissible by dragging the sheet down or tapping X.
 * Always mounted so CSS transitions animate both directions; pointer-events gate the closed
 * state. Respects prefers-reduced-motion via the global kill-switch.
 */
export function MobileMenu({
  open,
  onClose,
  navItems,
  locale,
  isActive,
}: {
  open: boolean
  onClose: () => void
  navItems: readonly NavItem[]
  locale: Locale
  isActive: (href: string) => boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sheetRef = useRef<HTMLDivElement>(null)
  const [dragY, setDragY] = useState(0) // downward drag offset (dismiss)
  const [heightPx, setHeightPx] = useState<number | null>(null) // upward drag expands this
  const [dragging, setDragging] = useState(false)
  const [mounted, setMounted] = useState(false)
  const startY = useRef<number | null>(null)
  const startHeight = useRef(0)

  // Portal target — the header's backdrop-filter would otherwise trap `position: fixed`.
  useEffect(() => setMounted(true), [])

  // Reset drag/expansion whenever the sheet opens.
  useEffect(() => {
    if (open) {
      setDragY(0)
      setHeightPx(null)
    }
  }, [open])

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    startY.current = event.clientY
    startHeight.current = sheetRef.current?.offsetHeight ?? 0
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (startY.current === null) return
    const delta = event.clientY - startY.current
    if (delta <= 0) {
      // Drag up → grow the sheet, capped at 60% of the viewport.
      const maxH = window.innerHeight * 0.6
      setDragY(0)
      setHeightPx(Math.min(maxH, startHeight.current - delta))
    } else {
      // Drag down → slide the whole sheet down (dismiss gesture).
      setDragY(delta)
    }
  }

  const endDrag = () => {
    if (startY.current === null) return
    startY.current = null
    setDragging(false)
    if (dragY > CLOSE_THRESHOLD) onClose()
    else setDragY(0) // keep any upward expansion; just snap the dismiss offset back
  }

  const switchLanguage = () => {
    // Keep the sheet open — switching the language should not dismiss the menu.
    const next: Locale = locale === 'ro' ? 'en' : 'ro'
    const secure = location.protocol === 'https:' ? '; secure' : ''
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax${secure}`
    router.push(localePath(next, stripLocalePrefix(pathname)))
  }

  if (!mounted) return null

  const current = locale === 'ro' ? RO_LANG : EN_LANG
  const CurrentFlag = current.Flag

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 lg:hidden',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
      aria-hidden={!open}
    >
      {/* Blurred backdrop */}
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="Close menu"
        onClick={onClose}
        className={cn(
          'absolute inset-0 h-full w-full bg-ink/40 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        className={cn(
          'absolute inset-x-0 bottom-0 flex max-h-[60dvh] flex-col rounded-t-[28px] bg-paper pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_40px_rgba(9,31,51,0.18)]',
          !dragging && 'transition-[transform,height] duration-300 ease-brand',
        )}
        style={{
          height: heightPx ?? undefined,
          transform: open ? `translateY(${dragY}px)` : 'translateY(100%)',
        }}
      >
        {/* Drag handle — the ONLY drag target, so the close button stays clickable */}
        <div
          className="shrink-0 cursor-grab touch-none pt-3 active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <span className="mx-auto block h-1.5 w-10 rounded-full bg-ice" aria-hidden="true" />
        </div>

        {/* Close button — sibling of the drag handle (not a child), so its click fires */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="absolute right-4 top-3 inline-flex size-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-ice/40"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="4" y1="4" x2="18" y2="18" />
            <line x1="18" y1="4" x2="4" y2="18" />
          </svg>
        </button>

        <nav aria-label="Mobile" className="mt-4 flex-1 overflow-y-auto px-6">
          {navItems.map((item) =>
            item.disabled ? (
              <span
                key={item.href}
                aria-disabled="true"
                className="flex cursor-default items-center border-b border-ice/50 py-4 text-lg font-semibold text-slate"
              >
                {item.label}
              </span>
            ) : (
            <Link
              key={item.href}
              href={localePath(locale, item.href)}
              aria-current={isActive(item.href) ? 'page' : undefined}
              onClick={onClose}
              className={cn(
                'flex items-center border-b border-ice/50 py-4 text-lg font-semibold transition-colors',
                isActive(item.href) ? 'text-blue' : 'text-ink hover:text-blue',
              )}
            >
              {item.label}
            </Link>
          ))}

          {/* Single language toggle — tap switches to the other language */}
          <button
            type="button"
            onClick={switchLanguage}
            className="flex w-full items-center gap-3 border-b border-ice/50 py-4 text-lg font-semibold text-ink transition-colors hover:text-blue"
          >
            <CurrentFlag />
            {current.label}
          </button>

          {/* Empty space left by the removed second language row */}
          <div className="h-14" aria-hidden="true" />
        </nav>
      </div>
    </div>,
    document.body,
  )
}
