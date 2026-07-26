import type { Metadata } from 'next'
import Link from 'next/link'

import { Reveal } from '@/components/ui/Reveal'
import { getDictionary, localePath, resolveLocale } from '@/lib/i18n'

type Args = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const dict = getDictionary(locale)
  return {
    title: dict.newsletter.confirmedTitle,
    description: dict.newsletter.confirmedMetaDescription,
  }
}

/**
 * Double opt-in redirect target (CLAUDE.md §10-11, T7): Brevo's confirmation email links
 * here (`redirectionUrl` in `BrevoMailer.subscribeDoubleOptIn`,
 * src/lib/email/brevo.ts) once a visitor clicks through — that click is the moment they
 * actually become a subscribed contact, not the initial form submission. Deliberately tiny
 * and static: no data fetching, no client-side JS.
 */
export default async function NewsletterConfirmedPage({ params }: Args) {
  const locale = resolveLocale((await params).locale)
  const dict = getDictionary(locale)
  return (
    <section className="bg-radial-wash">
      {/* Fade-in (owner 2026-07-25) — același Reveal ca pe homepage */}
      <Reveal className="mx-auto flex max-w-2xl flex-col items-start gap-4 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <h1 className="text-h1 text-ink">{dict.newsletter.confirmedTitle}</h1>
        <p className="text-body-lg text-ink/70">
          {dict.newsletter.confirmedBody}
        </p>
        <Link
          href={localePath(locale, '/')}
          className="text-sm font-semibold text-blue underline underline-offset-4"
        >
          {dict.newsletter.backHome}
        </Link>
      </Reveal>
    </section>
  )
}
