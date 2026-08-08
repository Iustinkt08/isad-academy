/**
 * Admin account avatar (admin.avatar Component) — owner 2026-08-08: the default
 * initials ("vas"/"yas") read as a glitch; a neutral profile glyph replaces them.
 * No photos: the site has no user photo concept.
 */
export function ProfileIcon() {
  return (
    <svg
      aria-hidden="true"
      className="isad-profile-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10.2" />
      <circle cx="12" cy="9.6" r="3.2" />
      <path d="M5.8 19.4c1.3-2.7 3.6-4.1 6.2-4.1s4.9 1.4 6.2 4.1" />
    </svg>
  )
}
