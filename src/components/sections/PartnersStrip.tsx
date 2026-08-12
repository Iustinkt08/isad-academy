import { getPayload } from 'payload'

import config from '@payload-config'
import { asMedia } from '../courses/helpers'
import { Container } from '../ui/Container'
import { Reveal } from '../ui/Reveal'
import { getDictionary } from '@/lib/i18n/dictionaries'
import type { Locale } from '@/lib/i18n/config'

/**
 * Partners logo strip (owner 2026-08-12, reference: aihouse.promocrat.com
 * `partners-strip`): an infinite horizontal logo marquee with soft-fade edges, adapted
 * to the light isad theme. Shown on the homepage above the FAQ and on /corporate above
 * the form. Self-fetching server component; per the owner rule it renders NOTHING while
 * the `partners` collection is empty.
 *
 * Implementation mirrors the testimonials marquee (TestimonialsSection): `animate-marquee`
 * (tokens.css keyframe), duplicated track halves for the seamless −50% wrap (trailing
 * pr = gap), clones aria-hidden, mask-image edge fade, Reveal fade-in on scroll.
 */

type PartnerLogo = { name: string; src: string; url: string | null }

/** Owner 2026-08-12: each strip shows its OWN logo set, per-logo checkboxes. */
export type PartnersPlacement = 'home' | 'corporate'

async function getPartnerLogos(placement: PartnersPlacement): Promise<PartnerLogo[]> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'partners',
      where:
        placement === 'home'
          ? { showOnHome: { equals: true } }
          : { showOnCorporate: { equals: true } },
      sort: 'order',
      pagination: false,
      depth: 1,
      overrideAccess: false,
    })
    return result.docs.flatMap((partner) => {
      const media = asMedia(partner.logo)
      if (!media?.url) return []
      return [{ name: partner.name, src: media.url, url: partner.url?.trim() || null }]
    })
  } catch {
    // CMS unreachable — the strip simply doesn't render (same rule as "no logos").
    return []
  }
}

function Logo({ logo }: { logo: PartnerLogo }) {
  // Reference sizing: 60px row, logos ~36px tall, dimmed until hover.
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo.src}
      alt={logo.name}
      loading="lazy"
      decoding="async"
      className="max-h-9 w-auto max-w-[180px] object-contain"
    />
  )
  const boxCls =
    'flex h-[60px] min-w-[160px] shrink-0 items-center justify-center px-7 opacity-60 grayscale transition-[opacity,filter] duration-300 hover:opacity-100 hover:grayscale-0'
  if (logo.url) {
    return (
      <a href={logo.url} target="_blank" rel="noopener noreferrer" className={boxCls}>
        {img}
      </a>
    )
  }
  return <div className={boxCls}>{img}</div>
}

export default async function PartnersStrip({
  locale,
  placement,
}: {
  locale: Locale
  placement: PartnersPlacement
}) {
  const logos = await getPartnerLogos(placement)
  // Owner rule: no logos in the collection → the section does not appear at all.
  if (logos.length === 0) return null

  const t = getDictionary(locale).partnersStrip
  // Each track half must be wider than the viewport for the −50% wrap to stay seamless,
  // so short logo lists are repeated until a half holds at least 8 logos.
  const half = Array.from({ length: Math.max(1, Math.ceil(8 / logos.length)) }, () => logos).flat()

  // Owner 2026-08-12: NO outer border/stroke and no gap above — on Home the strip is
  // plain white so it merges seamlessly with the white section above it; on Corporate
  // it stays on the page's subtle background instead of cutting a white band.
  const sectionCls =
    placement === 'home' ? 'bg-white pb-12 pt-0' : 'bg-surface-subtle py-10'

  return (
    <section aria-label={t.ariaLabel} className={sectionCls}>
      <Container>
        <Reveal>
          <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <div className="flex w-max animate-marquee gap-14 pr-14 motion-reduce:animate-none">
              {[...half, ...half].map((logo, index) => (
                <div key={`${logo.name}-${index}`} aria-hidden={index >= half.length || undefined}>
                  <Logo logo={logo} />
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
