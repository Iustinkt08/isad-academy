import type { Access, ClientUser, FieldAccess } from 'payload'

import type { User } from '../payload-types'

/**
 * Strict "real admin" gate — only users whose `role` is `admin` (not `editor`).
 * `role` is stored in the JWT (`saveToJWT: true` on Users), so this reads without a DB hit.
 *
 * Distinct from `isAdmin` (= any logged-in user): use `isAdminRole` for privilege-sensitive
 * operations that an `editor` must never perform — creating/escalating users above all
 * (otherwise an editor could mint themselves an admin account).
 */
export const isAdminRole: Access = ({ req: { user } }) => user?.role === 'admin'

export const isAdminRoleField: FieldAccess = ({ req: { user } }) => user?.role === 'admin'

/**
 * `admin.hidden` callback for admin-only collections/globals: editors neither see them in
 * the nav nor open their list views. Access rules still enforce the actual permission —
 * this is UX, not security.
 */
export const hiddenFromEditors = ({ user }: { user?: ClientUser | User | null }): boolean =>
  (user as User | null | undefined)?.role !== 'admin'
