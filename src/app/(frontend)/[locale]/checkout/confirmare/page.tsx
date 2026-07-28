import type { Metadata } from 'next'
import { getPayload } from 'payload'

import config from '@payload-config'
import { ConfirmationRecap } from '@/components/checkout/ConfirmationRecap'
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
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ outcome?: string }>
}) {
  const locale = resolveLocale((await params).locale)
  // Set by /api/netopia/return after a hosted-page payment. Display-only hint — the
  // authoritative status lives on the order (IPN/status poll); absent for the mock flow.
  const rawOutcome = (await searchParams).outcome
  const outcome =
    rawOutcome === 'paid' || rawOutcome === 'pending' || rawOutcome === 'failed'
      ? rawOutcome
      : undefined
  const payload = await getPayload({ config })
  const siteSettings = await payload
    .findGlobal({
      slug: 'siteSettings',
      overrideAccess: false,
      locale,
      fallbackLocale: 'en',
    })
    .catch(() => null)

  // Figma 4031-156/4031-218: full-page #f8f9fa wash, single centred column (the recap
  // component owns its paddings/gaps) — no radial wash, no Container.
  return (
    <main className="animate-rise bg-surface-subtle">
      <ConfirmationRecap
        locale={locale}
        currency={siteSettings?.currency ?? 'EUR'}
        outcome={outcome}
      />
    </main>
  )
}
