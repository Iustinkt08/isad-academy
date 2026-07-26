import Link from 'next/link'

/**
 * Brand lockup at the top of the admin nav sidebar (admin.components.beforeNavLinks) —
 * owner request: the isad logo visible in the nav, not only on the auth screens.
 * Same theme-swapped icon assets as Icon.tsx (blue on light, white on dark — swap done
 * in custom.scss via the shared `.isad-admin-logo--light/--dark` classes) + the
 * wordmark, always lowercase (CLAUDE.md §12). Links back to the dashboard.
 */
export function NavLogo() {
  return (
    <Link aria-label="isad.academy — dashboard" className="isad-nav-logo" href="/admin">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="" className="isad-admin-logo--light" src="/brand/icon-blue.svg" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="" className="isad-admin-logo--dark" src="/brand/icon-white.svg" />
      <span className="isad-nav-logo__wordmark">isad.academy</span>
    </Link>
  )
}
