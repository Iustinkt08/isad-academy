import type { Metadata } from 'next'
import { getPayload } from 'payload'

import config from '@payload-config'
import { ConfirmationRecap } from '@/components/checkout/ConfirmationRecap'
import { Container } from '@/components/ui/Container'
import { getDictionary, resolveLocale } from '@/lib/i18n'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  return {
    title: getDictionary(locale).checkout.confirmationMetaTitle,
    robots: { index: false },
  }
}

/**
 * `/checkout/confirmare` (§6 Confirmare). Server shell only: the recap itself is a client
 * component reading the checkout response from sessionStorage — orders have no public read
 * access (CLAUDE.md §4), so the `POST /api/checkout` response payload IS the recap. The
 * server's only job here is the config-driven currency/VAT display settings (§13).
 */
export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = resolveLocale((await params).locale)
  const payload = await getPayload({ config })
  const siteSettings = await payload
    .findGlobal({
      slug: 'siteSettings',
      overrideAccess: false,
      locale,
      fallbackLocale: 'en',
    })
    .catch(() => null)

  return (
    <div className="bg-radial-wash">
      <Container className="animate-rise py-14 sm:py-20">
        <ConfirmationRecap
          locale={locale}
          currency={siteSettings?.currency ?? 'EUR'}
          vatDisplay={siteSettings?.vatDisplay ?? 'incl'}
        />
      </Container>
    </div>
  )
}
