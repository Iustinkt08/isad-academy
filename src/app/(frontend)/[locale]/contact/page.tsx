import type { Metadata } from 'next'
import { getPayload } from 'payload'

import config from '@payload-config'
import ContactDetails, {
  DEFAULT_EMAIL,
  DEFAULT_PHONE,
  type ContactDetail,
} from '@/components/contact/ContactDetails'
import ContactForm from '@/components/contact/ContactForm'
import ContactHeader from '@/components/contact/ContactHeader'
import { Reveal } from '@/components/ui/Reveal'
import { getDictionary, localePath, resolveLocale, type Locale } from '@/lib/i18n'
import type { SiteSetting } from '@/payload-types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const dict = getDictionary(locale)
  return { title: dict.contact.metaTitle, description: dict.contact.metaDescription }
}

async function getContactDetails(locale: Locale): Promise<SiteSetting['contact'] | null> {
  try {
    const payload = await getPayload({ config })
    const settings = await payload.findGlobal({
      slug: 'siteSettings',
      overrideAccess: false,
      locale,
      fallbackLocale: 'en',
    })
    return settings?.contact ?? null
  } catch {
    // The form still works when the CMS is unreachable; only the details panel degrades.
    return null
  }
}

/**
 * /contact (§6) — redesign Figma 3977-489 (desktop) / 3977-531 (mobil): header centrat
 * (pill + titlu două-tonuri + subtitlu) → rând 1164 = card formular 700 + card detalii
 * 420 la gap 44 (mobil: stivuit, gap 24, conținut 350/margini 20). Fundal #F8F9FA.
 * Deliberately NO map, NO address, NO WhatsApp. Email/telefon vin din
 * siteSettings.contact cu fallback pe default-urile din ContactDetails.
 * Layout-ul global randează deja <main id="main-content"> — aici doar <div>.
 */
export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = resolveLocale((await params).locale)
  const dict = getDictionary(locale)
  const t = dict.contact
  const contact = await getContactDetails(locale)

  const email = contact?.email || DEFAULT_EMAIL
  const phone = contact?.phone || DEFAULT_PHONE
  const details: ContactDetail[] = [
    { label: t.details.email, value: email, href: `mailto:${email}` },
    { label: t.details.phone, value: phone, href: `tel:${phone.replace(/\s+/g, '')}` },
    { label: t.details.responseTime, value: t.details.responseTimeValue },
  ]

  return (
    <div className="bg-[#f8f9fa] pb-16 lg:pb-[120px]">
      {/* Fade-in on scroll per secțiune (owner 2026-07-25) — Reveal, ca pe homepage.
          Aside-ul sticky rămâne ÎN AFARA Reveal-ului (transformul ar strica sticky). */}
      <Reveal>
        <ContactHeader
          pill={t.title}
          titlePlain={t.headerTitlePlain}
          titleGradient={t.headerTitleGradient}
          subtitle={t.intro}
        />
      </Reveal>

      <div className="mx-auto flex w-full max-w-[1164px] flex-col gap-6 px-5 pt-6 lg:flex-row lg:items-start lg:gap-11 lg:px-4 lg:pt-9">
        <div className="min-w-0 flex-1">
          <Reveal>
            <ContactForm locale={locale} privacyHref={localePath(locale, '/privacy')} />
          </Reveal>
        </div>
        {/* Sticky la scroll pe desktop (owner 2026-07-25) — același offset ca aside-urile
            de pe curs/checkout (header h-20 → top-24). */}
        <aside
          aria-label={t.details.aria}
          className="w-full self-start lg:sticky lg:top-24 lg:w-[420px] lg:shrink-0"
        >
          <Reveal>
            <ContactDetails title={t.details.title} details={details} />
          </Reveal>
        </aside>
      </div>
    </div>
  )
}
