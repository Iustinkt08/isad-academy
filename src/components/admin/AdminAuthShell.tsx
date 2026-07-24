/**
 * AdminAuthShell — shared backdrop for the admin auth screens (login + create user).
 * 1:1 from Figma (nodes 3768:18 / 3770:18): page centered on surface-subtle, diffuse
 * blue dome at the bottom, logo watermark top-right, white 480px card centered.
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
      {/* Diffuse blue dome at the base (echo of the site hero) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[380px] left-1/2 h-[700px] w-[1600px] -translate-x-1/2 rounded-[50%] bg-gradient-to-b from-steel to-blue opacity-25 blur-[120px]"
      />
      {/* Logo watermark, top-right corner */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        aria-hidden
        src="/brand/icon-black.svg"
        alt=""
        className="pointer-events-none absolute -top-16 right-16 h-[275px] w-[300px] object-contain opacity-[0.04]"
      />

      {children}

      <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[12px] tracking-[0.4px] text-grey-600">
        isad.academy · admin
      </p>
    </div>
  )
}

/** Brand header inside the card (logo + wordmark) — shared by both screens */
export function AdminBrand() {
  return (
    <div className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/icon-black.svg" alt="" className="h-[26px] w-7 object-contain" />
      <span className="text-[17px] font-semibold tracking-[-0.4px] text-ink">isad.academy</span>
    </div>
  )
}

/** Standard admin input — gray stroke, gray placeholder, gray focus (no blue) */
export const adminInputCls =
  'w-full rounded-[14px] border border-line bg-white px-[18px] py-[13px] text-[15px] text-ink placeholder:text-grey-600 focus:border-[#bdbdbd] focus:outline-none'
