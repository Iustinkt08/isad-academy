import type { Metadata, Viewport } from 'next'
import { Poppins } from 'next/font/google'
import { getPayload } from 'payload'
import React, { cache } from 'react'

import config from '@payload-config'
import { Analytics } from '@/components/analytics/Analytics'
import { ConsentProvider } from '@/components/consent/ConsentProvider'
import { CookieConsentBanner } from '@/components/consent/CookieConsentBanner'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { ScrollProgress } from '@/components/layout/ScrollProgress'
import { JsonLd } from '@/components/seo/JsonLd'
import { LOCALES, getDictionary, resolveLocale, type Locale } from '@/lib/i18n'
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_TAGLINE, getSiteUrl } from '@/lib/seo/site'
import type { SiteSetting } from '@/payload-types'

import '../globals.css'

/** `viewport-fit=cover` (owner 2026-07-26): pagina se întinde pe sub toolbarul
 *  translucid al Safari iOS (edge-to-edge) — fără el, Safari umple zona de sub
 *  bară cu un fundal alb opac care taie vizual conținutul (ex. watermark-ul). */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

/** Both languages are fully static — EN at the bare URLs, RO under /ro (middleware). */
export function generateStaticParams(): { locale: Locale }[] {
  return LOCALES.map((locale) => ({ locale }))
}

/**
 * Poppins (Brand Book p.11: Bold headlines / SemiBold subheads & labels / Regular body),
 * self-hosted by next/font at build time — zero runtime third-party font requests.
 * globals.css puts `var(--font-poppins)` first in the `--font-sans` stack.
 */
const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-poppins',
})

/** Deduped between generateMetadata and the layout render (React request cache). */
const getSiteSettings = cache(async (locale: Locale): Promise<SiteSetting | null> => {
  try {
    const payload = await getPayload({ config })
    return await payload.findGlobal({ slug: 'siteSettings', locale, fallbackLocale: 'en' })
  } catch {
    // Footer and header degrade gracefully when the CMS is unreachable.
    return null
  }
})

/**
 * Site-wide metadata defaults (T14, CLAUDE.md §7): metadataBase resolves every relative
 * OG/canonical URL against NEXT_PUBLIC_SITE_URL; child pages set short titles and the
 * `%s | isad.academy` template brands them. The Search Console verification meta is
 * emitted only when set in siteSettings.analytics.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const settings = await getSiteSettings(locale)
  const meta = getDictionary(locale).meta
  const gscVerification = settings?.analytics?.gscVerification?.trim()

  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: `${SITE_NAME} — ${meta.titleTagline}`,
      template: `%s | ${SITE_NAME}`,
    },
    description: meta.siteDescription,
    openGraph: {
      siteName: SITE_NAME,
      type: 'website',
      locale: locale === 'ro' ? 'ro_RO' : 'en_US',
      alternateLocale: locale === 'ro' ? 'en_US' : 'ro_RO',
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
    },
    ...(gscVerification ? { verification: { google: gscVerification } } : {}),
  }
}

/** Schema.org Organization — contact details included only when set (TBD-friendly). */
function buildOrganizationJsonLd(settings: SiteSetting | null): Record<string, unknown> {
  const siteUrl = getSiteUrl()
  const contact = settings?.contact
  const contactPoint =
    contact?.email || contact?.phone
      ? {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          ...(contact.email ? { email: contact.email } : {}),
          ...(contact.phone ? { telephone: contact.phone } : {}),
        }
      : null

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}${DEFAULT_OG_IMAGE}`,
    ...(contactPoint ? { contactPoint } : {}),
    ...(contact?.linkedin ? { sameAs: [contact.linkedin] } : {}),
  }
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const locale = resolveLocale((await params).locale)
  const settings = await getSiteSettings(locale)
  const dict = getDictionary(locale)

  // Analytics IDs: siteSettings.analytics first, env vars as fallback (CLAUDE.md §2).
  // The component itself renders nothing without explicit consent (§7 hard rule).
  const ga4Id = settings?.analytics?.ga4Id || process.env.NEXT_PUBLIC_GA4_ID || null
  const gtmId = settings?.analytics?.gtmId || process.env.NEXT_PUBLIC_GTM_ID || null

  return (
    <html lang={locale} className={poppins.variable}>
      <body className="flex min-h-screen flex-col bg-paper font-sans text-ink antialiased">
        <JsonLd data={buildOrganizationJsonLd(settings)} />
        <ConsentProvider>
          <a
            href="#main-content"
            className="fixed left-4 top-4 z-50 -translate-y-24 rounded-full bg-blue px-4 py-2 text-sm font-semibold text-paper transition-transform focus:translate-y-0"
          >
            {dict.common.skipToContent}
          </a>
          <Header locale={locale} labels={{ ...dict.nav, seeCourses: dict.common.seeCourses, language: dict.common.language }} />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer settings={settings} locale={locale} />
          <ScrollProgress />
          <CookieConsentBanner locale={locale} />
          <Analytics ga4Id={ga4Id} gtmId={gtmId} />
        </ConsentProvider>
      </body>
    </html>
  )
}
