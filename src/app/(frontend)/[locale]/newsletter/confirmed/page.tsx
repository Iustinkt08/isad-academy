import type { Metadata } from 'next'
import Link from 'next/link'

import { Reveal } from '@/components/ui/Reveal'
import { getDictionary, localePath, resolveLocale } from '@/lib/i18n'

type Args = {
  params: Promise<{ locale: string }>
  /** `status` vine de la `/api/newsletter/confirm` — absent înseamnă „confirmat". */
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const dict = getDictionary(locale)
  return {
    title: dict.newsletter.confirmedTitle,
    description: dict.newsletter.confirmedMetaDescription,
  }
}

/**
 * Double opt-in redirect target (CLAUDE.md §10-11, T7): the confirmation email links here
 * via `/api/newsletter/confirm`, which verifies the signed token and only then subscribes
 * the address. That click — not the form submission — is the moment someone becomes a
 * contact. Deliberately tiny and static: no data fetching, no client-side JS.
 *
 * Trei stări, toate pe aceeași adresă (`?status=`), pentru că e o singură pagină în capul
 * vizitatorului: confirmat (fără parametru), link invalid/expirat, eșec la provider. Textul
 * pentru „invalid" e neutru deliberat — pagina e publică, iar o formulare de tipul „adresa
 * asta nu aștepta confirmare" ar transforma-o într-un oracol de adrese.
 */
export default async function NewsletterConfirmedPage({ params, searchParams }: Args) {
  const locale = resolveLocale((await params).locale)
  const dict = getDictionary(locale)
  const status = (await searchParams)?.status
  const copy =
    status === 'invalid'
      ? { title: dict.newsletter.invalidTitle, body: dict.newsletter.invalidBody }
      : status === 'failed'
        ? { title: dict.newsletter.failedTitle, body: dict.newsletter.failedBody }
        : { title: dict.newsletter.confirmedTitle, body: dict.newsletter.confirmedBody }

  return (
    <section className="bg-radial-wash">
      {/* Fade-in (owner 2026-07-25) — același Reveal ca pe homepage */}
      <Reveal className="mx-auto flex max-w-2xl flex-col items-start gap-4 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <h1 className="text-h1 text-ink">{copy.title}</h1>
        <p className="text-body-lg text-ink/70">{copy.body}</p>
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
