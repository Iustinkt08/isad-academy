import { withPayload } from '@payloadcms/next/withPayload'

// Google Analytics/Tag Manager host-uri (consent-gated, dar CSP trebuie să le permită
// pentru încărcarea de DUPĂ consimțământ). Fonturile Poppins sunt self-hosted (next/font),
// deci `font-src 'self'` e suficient. Netopia e un REDIRECT către pagina lor găzduită
// (nu iframe), acoperit defensiv de `form-action`.
const GA_HOSTS = 'https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com'
const NETOPIA_HOSTS = 'https://secure.netopia-payments.com https://secure-sandbox.netopia-payments.com'

const BASE_SECURITY_HEADERS = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), browsing-topics=()' },
]

// `next dev` compilează cu eval() pentru source maps și HMR. Fără excepția asta, CSP-ul
// blochează TOT codul de client în local — componentele nu se hidratează, iar simptomul e
// înșelător: pagina arată bine, dar nimic interactiv nu funcționează (2026-08-07, pop-up-ul
// de eveniment nu apărea deloc). În producție webpack nu folosește eval, deci antetul livrat
// rămâne exact cel de dinainte.
const DEV_SCRIPT_SRC = process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'"

// CSP-ul site-ului public. `'unsafe-inline'` pe script e necesar pentru bootstrap-ul GTM +
// scripturile inline Next; se poate strânge la nonce-uri ulterior.
const SITE_CSP =
  `default-src 'self'; ` +
  `script-src 'self' 'unsafe-inline'${DEV_SCRIPT_SRC} ${GA_HOSTS}; ` +
  `style-src 'self' 'unsafe-inline'; ` +
  `img-src 'self' data: blob: ${GA_HOSTS}; ` +
  `font-src 'self' data:; ` +
  `connect-src 'self' ${GA_HOSTS}; ` +
  `frame-src ${NETOPIA_HOSTS}; ` +
  `form-action 'self' ${NETOPIA_HOSTS}; ` +
  `frame-ancestors 'none'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests`

// Panoul Payload (SPA React) are nevoie de 'unsafe-eval'/'unsafe-inline' și de framing
// same-origin (live preview) — CSP mai permisiv, DOAR pe /admin.
const ADMIN_CSP =
  `default-src 'self'; ` +
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'; ` +
  `style-src 'self' 'unsafe-inline'; ` +
  `img-src 'self' data: blob:; ` +
  `font-src 'self' data:; ` +
  `connect-src 'self'; ` +
  `frame-ancestors 'self'; base-uri 'self'; object-src 'none'`

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Nu anunța stack-ul (elimină antetul `X-Powered-By: Next.js`).
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/admin/:path*',
        headers: [
          ...BASE_SECURITY_HEADERS,
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: ADMIN_CSP },
        ],
      },
      {
        // Tot ce NU e /admin — site-ul public + rutele API.
        source: '/((?!admin).*)',
        headers: [
          ...BASE_SECURITY_HEADERS,
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: SITE_CSP },
        ],
      },
    ]
  },
  // Deploy pe cPanel/Passenger (owner 2026-07-26): bundle-ul .next/standalone conține
  // server.js + doar modulele necesare — pe server se urcă standalone + static + public.
  output: 'standalone',
  // Media (uploads Payload) e pe disc, în afara git-ului; pe Vercel funcțiile primesc doar
  // fișierele trasate — includem explicit folderul ca imaginile să fie servite și acolo.
  outputFileTracingIncludes: { '/**': ['./media/**'] },
  async redirects() {
    return [
      // /certificare retired 2026-07-11 — certification lives on Home as a section
      { source: '/certificare', destination: '/#certification', permanent: true },
      // Catalog + about moved to English slugs on BOTH locales (owner 2026-08-08) —
      // old RO slugs 308 → new slugs, deep course links included.
      { source: '/cursuri', destination: '/courses', permanent: true },
      { source: '/cursuri/:slug', destination: '/courses/:slug', permanent: true },
      { source: '/despre', destination: '/about', permanent: true },
      { source: '/ro/cursuri', destination: '/ro/courses', permanent: true },
      { source: '/ro/cursuri/:slug', destination: '/ro/courses/:slug', permanent: true },
      { source: '/ro/despre', destination: '/ro/about', permanent: true },
      // Legal routes moved to English slugs (2026-07) — old RO slugs 308 → new slugs.
      { source: '/politica-cookie', destination: '/cookies', permanent: true },
      { source: '/gdpr', destination: '/privacy', permanent: true },
      { source: '/termeni', destination: '/terms', permanent: true },
      { source: '/politica-livrare', destination: '/terms', permanent: true },
      { source: '/ro/politica-cookie', destination: '/ro/cookies', permanent: true },
      { source: '/ro/gdpr', destination: '/ro/privacy', permanent: true },
      { source: '/ro/termeni', destination: '/ro/terms', permanent: true },
      { source: '/ro/politica-livrare', destination: '/ro/terms', permanent: true },
    ]
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
