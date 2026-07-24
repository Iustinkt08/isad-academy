/**
 * Nav icon for the Payload admin (admin.components.graphics.Icon). Icon-only variant is
 * the brand-correct choice below the 120px lockup minimum. Theme swap via custom.scss.
 */
export function Icon() {
  return (
    <span className="isad-admin-icon">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="isad-admin-logo--light" src="/brand/icon-blue.svg" alt="isad.academy" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="isad-admin-logo--dark" src="/brand/icon-white.svg" alt="isad.academy" />
    </span>
  )
}
