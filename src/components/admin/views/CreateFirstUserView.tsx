import AdminCreateUser from '../AdminCreateUser'

/**
 * Server wrapper for the custom `createFirstUser` view (payload.config.ts
 * admin.components.views.createFirstUser). Payload only routes here while the
 * users collection is empty, so the form posts to /api/users/first-register
 * (firstUser mode). Server-only props are deliberately not forwarded.
 */
export function CreateFirstUserView() {
  return <AdminCreateUser firstUser />
}
