import AdminForgotPassword from '../AdminForgotPassword'

/**
 * Server wrapper for the custom `forgot` view (payload.config.ts
 * admin.components.views.forgot). Payload passes server-only props
 * (initPageResult holds the payload instance) — deliberately NOT forwarded,
 * since AdminForgotPassword is a client component and needs none of them.
 */
export function ForgotPasswordView() {
  return <AdminForgotPassword />
}
