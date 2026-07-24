import type { ReactNode } from 'react'

import { Container } from '@/components/ui/Container'
import { SectionDark } from '@/components/ui/SectionDark'
import { getDictionary } from '@/lib/i18n/dictionaries'
import type { Locale } from '@/lib/i18n/config'

/**
 * Shared layout for the four legal routes (T14, CLAUDE.md §5): dark hero with the page
 * title, then a constrained single-column body. Sections are composed per page with
 * `LegalSection`; placeholder passages awaiting Silviu's final legal text (§13) are
 * marked with `LegalPlaceholder`.
 */
const formatUpdatedAt = (iso: string): string => {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

export function LegalPage({
  title,
  intro,
  updatedAt,
  locale,
  children,
}: {
  title: string
  intro: string
  /** ISO date of the last CMS save — rendered as a "Last updated" tag (owner request). */
  updatedAt?: string | null
  locale: Locale
  children: ReactNode
}) {
  const dict = getDictionary(locale)
  return (
    <>
      <SectionDark>
        <Container className="animate-rise py-20 sm:py-28">
          {updatedAt && (
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-ice/30 bg-paper/10 px-3 py-1 text-xs font-semibold tracking-wide text-ice backdrop-blur">
              {dict.legal.lastUpdated} {formatUpdatedAt(updatedAt)}
            </p>
          )}
          <h1 className="text-display max-w-3xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-body-lg text-ice/90">{intro}</p>
        </Container>
      </SectionDark>
      <div className="bg-paper">
        <Container className="max-w-3xl space-y-10 py-14 sm:py-16">{children}</Container>
      </div>
    </>
  )
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-h3 text-ink">{heading}</h2>
      <div className="mt-3 space-y-3 text-body leading-relaxed text-ink/80">{children}</div>
    </section>
  )
}

/**
 * Standard marker for passages whose final wording is still pending (§13 TBDs: legal
 * entity, refund/cancellation terms, full legal texts). The bracketed marker string is
 * asserted by the E2E suite — keep it stable.
 */
export function LegalPlaceholder({ children }: { children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-ice bg-ice/20 p-4 text-small text-ink/70">
      <p className="font-semibold text-ink/80">
        [Placeholder — final legal text pending confirmation]
      </p>
      {children && <div className="mt-2 space-y-2">{children}</div>}
    </div>
  )
}
