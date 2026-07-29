import Link from 'next/link'

/**
 * Brand mark at the top of the admin nav sidebar (admin.components.beforeNavLinks) —
 * owner request (2026-07-28): icon-only "A", like the site header. Approved Black
 * variant on light, White on dark (swap via `.isad-admin-logo--light/--dark` in
 * custom.scss). Links back to the dashboard.
 */
export function NavLogo() {
  return (
    <Link aria-label="isad.academy — dashboard" className="isad-nav-logo" href="/admin">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="" className="isad-admin-logo--light" src="/brand/icon-black.svg" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="" className="isad-admin-logo--dark" src="/brand/icon-white.svg" />
    </Link>
  )
}
