'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { localePath, stripLocalePrefix, type Locale } from '../../lib/i18n/config'
import { cn } from '../ui/cn'
import { Container } from '../ui/Container'
import { LocaleSwitcher } from './LocaleSwitcher'
import { MobileMenu } from './MobileMenu'

export type HeaderLabels = {
  home: string
  courses: string
  corporate: string
  blog: string
  about: string
  quiz: string
  seeCourses: string
  openMenu: string
  closeMenu: string
  language: string
  brandHome: string
}

/** EN defaults keep the header render-safe if a caller ever omits the labels. */
const DEFAULT_LABELS: HeaderLabels = {
  home: 'Home',
  courses: 'Courses',
  corporate: 'Corporate',
  blog: 'Blog',
  about: 'About',
  quiz: 'Quiz',
  seeCourses: 'See courses',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  language: 'Language',
  brandHome: 'isad.academy home',
}

export type NavItem = { label: string; href: string; disabled?: boolean }

/** Owner-decided nav: explicit Home entry (owner 2026-08-08) + the four content pages
 * (Blog + About enabled 2026-07-17, after the blog redesign shipped); the logo still
 * links home too. `disabled: true` renders an entry visible but non-navigable — kept
 * as an option for future not-yet-ready pages. */
const buildNavItems = (labels: HeaderLabels): readonly NavItem[] =>
  [
    { label: labels.home, href: '/' },
    { label: labels.courses, href: '/courses' },
    { label: labels.corporate, href: '/corporate' },
    { label: labels.blog, href: '/blog' },
    { label: labels.about, href: '/about' },
  ] as const

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Header({
  locale = 'en',
  labels = DEFAULT_LABELS,
}: {
  locale?: Locale
  labels?: HeaderLabels
}) {
  const navItems = buildNavItems(labels)
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the mobile menu on navigation.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Escape closes the menu; lock body scroll while it is open.
  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [menuOpen])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b bg-paper/70 backdrop-blur-md transition-shadow duration-200',
        scrolled || menuOpen ? 'border-ice/60 shadow-sm shadow-ink/5' : 'border-transparent',
      )}
    >
      <Container>
        <div className="relative mx-auto flex h-20 max-w-[1300px] items-center justify-between gap-4">
          {/* Brand — official gradient lockup (Brand Book: approved variants only, never
              recolor/distort). Horizontal wordmark ≥120px wide; below `sm` the min-size rule
              applies, so the icon-only mark renders instead. py-1 keeps the wordmark-dot
              clear space inside the 64px header row. */}
          {/* Design navbar: icon-only mark (approved Black variant; <120px → icon per brand rule) */}
          <Link
            href={localePath(locale, '/')}
            className="flex shrink-0 items-center py-1"
            aria-label={labels.brandHome}
          >
            <Image
              src="/brand/icon-gradient.svg"
              alt="isad.academy"
              width={31}
              height={28}
              priority
              unoptimized
              className="h-10 w-auto"
            />
          </Link>

          <nav
            aria-label="Main"
            className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-[30px] lg:flex"
          >
            {navItems.map((item) =>
              item.disabled ? (
                <span
                  key={item.href}
                  aria-disabled="true"
                  className="cursor-default text-sm font-medium text-slate"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  key={item.href}
                  href={localePath(locale, item.href)}
                  aria-current={isActive(stripLocalePrefix(pathname), item.href) ? 'page' : undefined}
                  className={cn(
                    'link-underline text-sm font-medium transition-colors duration-200',
                    isActive(stripLocalePrefix(pathname), item.href)
                      ? 'text-blue'
                      : 'text-ink hover:text-blue',
                  )}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <LocaleSwitcher locale={locale} label={labels.language} />
          </div>

          {/* Mobile burger */}
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-ice/40 lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? labels.closeMenu : labels.openMenu}
            onClick={() => setMenuOpen((open) => !open)}
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
              {menuOpen ? (
                <>
                  <line x1="4" y1="4" x2="18" y2="18" />
                  <line x1="18" y1="4" x2="4" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="19" y2="6" />
                  <line x1="3" y1="11" x2="19" y2="11" />
                  <line x1="3" y1="16" x2="19" y2="16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </Container>

      {/* Mobile menu — draggable bottom sheet */}
      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        navItems={navItems}
        locale={locale}
        isActive={(href) => isActive(stripLocalePrefix(pathname), href)}
      />
    </header>
  )
}
