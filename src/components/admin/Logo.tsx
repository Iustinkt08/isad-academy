import { AdminBrand } from './AdminAuthShell'

/**
 * Admin graphic (admin.components.graphics.Logo). The login and create-first-user
 * screens are full custom views now, so this only renders on the remaining
 * minimal-template screens (forgot password / reset) — same brand lockup there.
 */
export function Logo() {
  return <AdminBrand />
}
