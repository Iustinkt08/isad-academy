import Image from 'next/image'
import Link from 'next/link'

import type { SiteSetting } from '@/payload-types'

import { getDictionary, localePath, type Locale } from '../../lib/i18n'
import { Container } from '../ui/Container'
import { NewsletterForm } from './NewsletterForm'

/*
 * Global footer — Figma redesign 3790:5036 (owner, 2026-07): floating newsletter card
 * on the left; three link columns (Legal / Explore / Other) on the right; official ANPC
 * SAL + SOL badges (legally required in RO — assets from public/anpc/, used as-is,
 * never restyled); legal entity + CUI copyright line; and a giant light-grey wordmark
 * clipped at the bottom of the page (/brand/isad-academy-wordmark-gray.svg).
 *
 * Style rules v3 (owner): NO borders/strokes anywhere — the newsletter card is
 * borderless and lifts through drop shadow only. Blue is reserved for link hovers and
 * the Subscribe gradient fill.
 */

export function Footer({ settings, locale }: { settings: SiteSetting | null; locale: Locale }) {
  const dict = getDictionary(locale)
  const l = dict.footer.links
  const legalEntity = settings?.legalEntity

  const columns = [
    {
      label: dict.footer.legal,
      links: [
        { label: l.cookies, href: '/cookies' },
        { label: l.privacy, href: '/privacy' },
        { label: l.terms, href: '/terms' },
      ],
    },
    {
      label: dict.footer.explore,
      links: [
        { label: l.blog, href: '/blog' },
        { label: l.about, href: '/despre' },
        { label: l.corporate, href: '/corporate' },
      ],
    },
    {
      label: dict.footer.other,
      links: [
        { label: l.contact, href: '/contact' },
        { label: l.notSure, href: '/quiz' },
        { label: l.certification, href: '/#certification' },
      ],
    },
  ]

  return (
    <footer className="overflow-hidden bg-paper pt-12 sm:pt-16">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1.5fr] lg:gap-16">
          {/* Newsletter card — floating, BORDERLESS, lifts through drop shadow alone (v3) */}
          <div className="h-fit w-full max-w-[402px] self-start rounded-[28px] bg-paper p-6 shadow-[0_16px_50px_rgba(77,77,77,0.10),0_2px_10px_rgba(77,77,77,0.04)]">
            <Image
              src="/brand/icon-blue.svg"
              alt=""
              width={31}
              height={28}
              unoptimized
              className="h-7 w-auto"
            />
            <p className="mt-4 text-[20px] font-medium tracking-[-0.5px] text-ink">
              {dict.footer.newsletter}
            </p>
            <p className="mt-2 whitespace-pre-line text-sm leading-5 text-grey-600">
              {dict.footer.newsletterSub}
            </p>
            <NewsletterForm tone="light" variant="pill" locale={locale} className="mt-4" />
          </div>

          {/* Nav columns + ANPC badges — stacks below the newsletter card on mobile */}
          <div className="flex flex-col gap-8 lg:justify-self-end">
            <div className="grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-3 sm:gap-x-14">
              {columns.map((column) => (
                <nav key={column.label} aria-label={column.label}>
                  <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ink">
                    {column.label}
                  </h2>
                  <ul className="mt-3 space-y-2.5">
                    {column.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={localePath(locale, link.href)}
                          className="link-underline text-sm text-grey-600 transition-colors duration-200 hover:text-blue"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>

            {/* ANPC SAL + SOL — official badges, used as-is (legal requirement, §7),
                pushed to the right edge (owner 2026-07-14) */}
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <a
                href={legalEntity?.anpcUrl || 'https://anpc.ro/ce-este-sal/'}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  src="/anpc/anpc-sal.svg"
                  alt="ANPC — Soluționarea Alternativă a Litigiilor"
                  width={193}
                  height={48}
                  unoptimized
                  className="h-12 w-auto"
                />
              </a>
              <a
                href={legalEntity?.solUrl || 'https://ec.europa.eu/consumers/odr'}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  src="/anpc/anpc-sol.svg"
                  alt="Soluționarea Online a Litigiilor (SOL)"
                  width={193}
                  height={48}
                  unoptimized
                  className="h-12 w-auto"
                />
              </a>
            </div>
          </div>
        </div>

      </Container>

      {/* Giant wordmark — light grey. Desktop: clipped at the page's bottom edge
          (~10% deeper cut, owner 2026-07-14). Mobil: ÎNTREG + bandă albă dedesubt
          (owner 2026-07-26) — Safari iOS pune propria bară albă sub toolbarul
          translucid; cu wordmark-ul tăiat la margine se vedea o „umbră"/seam, iar
          alb-pe-alb (stil certcar) o face invizibilă. */}
      <div aria-hidden="true" className="mt-12 flex justify-center overflow-hidden pb-5 lg:pb-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/isad-academy-wordmark-gray.svg"
          alt=""
          className="w-[calc(100%-48px)] max-w-[1280px] select-none opacity-90 lg:translate-y-[28%]"
        />
      </div>
    </footer>
  )
}
