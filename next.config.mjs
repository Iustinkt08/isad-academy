import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // /certificare retired 2026-07-11 — certification lives on Home as a section
      { source: '/certificare', destination: '/#certification', permanent: true },
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
