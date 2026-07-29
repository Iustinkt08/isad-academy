/**
 * AdminAuthShell — shared backdrop for the admin auth screens (login + create user).
 * From Figma (nodes 3768:18 / 3770:18): page centered on surface-subtle, white 480px
 * card centered (watermark + bottom blue blur dome dropped, owner 2026-07-28).
 *
 * Mounted through Payload custom views (admin.components.views.login /
 * .createFirstUser) — NOT as standalone Next routes. Tailwind utilities come from
 * src/app/(payload)/admin.css; the `isad-admin-auth` class scopes its mini-preflight.
 * Token mapping from the Figma extract (repo convention): brand-steel→steel,
 * brand-deep→blue, ink-body→ink, ink-muted→grey-600, rounded-pill→rounded-full.
 */

export default function AdminAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="isad-admin-auth relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-subtle px-4 py-16">
      {children}

      <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[12px] tracking-[0.4px] text-grey-600">
        isad.academy · admin
      </p>
    </div>
  )
}

/** Brand header inside the card — icon-only "A" mark, approved Black variant, same size
 * as the site header (owner 2026-07-28; <120px → icon per brand rule). */
export function AdminBrand() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/icon-black.svg" alt="isad.academy" className="h-[28px] w-[31px] object-contain" />
  )
}

/** Standard admin input — gray stroke, gray placeholder, gray focus (no blue) */
export const adminInputCls =
  'w-full rounded-[14px] border border-line bg-white px-[18px] py-[13px] text-[15px] text-ink placeholder:text-grey-600 focus:border-[#bdbdbd] focus:outline-none'
