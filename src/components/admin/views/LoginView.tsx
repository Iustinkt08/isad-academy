import AdminLogin from '../AdminLogin'

/**
 * Server wrapper for the custom `login` view (payload.config.ts
 * admin.components.views.login). Payload passes server-only props
 * (initPageResult holds the payload instance) — deliberately NOT forwarded,
 * since AdminLogin is a client component and needs none of them.
 */
export function LoginView() {
  return <AdminLogin />
}
