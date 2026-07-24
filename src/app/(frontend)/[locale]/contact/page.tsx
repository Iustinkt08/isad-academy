import type { Metadata } from 'next'
import { getPayload } from 'payload'

import config from '@payload-config'
import { ContactForm } from '@/components/forms/ContactForm'
import { Container } from '@/components/ui/Container'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { getDictionary, resolveLocale, type Locale } from '@/lib/i18n'
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
 * /contact (§6): title → form + direct details side by side. Deliberately NO map, NO
 * address, NO WhatsApp. Direct details render only what is set in siteSettings.contact
 * (TBD-friendly — the panel shows a fallback line while everything is unset).
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
  const hasDetails = Boolean(contact?.email || contact?.phone || contact?.linkedin)

  return (
    <section className="bg-radial-wash">
      <Container className="animate-rise py-20 sm:py-28">
        <h1 className="text-h1 text-ink">
          {t.title}
        </h1>
        <p className="mt-3 max-w-2xl text-body-lg text-ink/70">{t.intro}</p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <div className="max-w-xl">
            <ContactForm locale={locale} />
          </div>

          <aside aria-label={t.details.aria}>
            <GlassPanel className="p-7">
              <h2 className="text-h4 text-ink">{t.details.title}</h2>
              {hasDetails ? (
                <ul className="mt-4 space-y-3 text-body">
                  {contact?.email && (
                    <li>
                      <span className="block text-small font-semibold uppercase tracking-wider text-grey-500">
                        {t.details.email}
                      </span>
                      <a href={`mailto:${contact.email}`} className="font-medium text-blue underline">
                        {contact.email}
                      </a>
                    </li>
                  )}
                  {contact?.phone && (
                    <li>
                      <span className="block text-small font-semibold uppercase tracking-wider text-grey-500">
                        {t.details.phone}
                      </span>
                      <a
                        href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                        className="font-medium text-blue underline"
                      >
                        {contact.phone}
                      </a>
                    </li>
                  )}
                  {contact?.linkedin && (
                    <li>
                      <span className="block text-small font-semibold uppercase tracking-wider text-grey-500">
                        {t.details.linkedin}
                      </span>
                      <a
                        href={contact.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue underline"
                      >
                        {t.details.linkedinCta}
                      </a>
                    </li>
                  )}
                </ul>
              ) : (
                <p className="mt-3 text-body text-ink/70">{t.details.fallback}</p>
              )}
            </GlassPanel>
          </aside>
        </div>
      </Container>
    </section>
  )
}
