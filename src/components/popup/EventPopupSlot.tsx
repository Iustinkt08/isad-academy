import { getPayload } from 'payload'

import config from '@payload-config'
import { getDictionary } from '@/lib/i18n/dictionaries'
import type { Locale } from '@/lib/i18n/config'
import EventPopup, { type EventPopupData } from './EventPopup'

/**
 * Site-wide mount for the event popup — rendered from the [locale] layout, after the page
 * content. Server component: reads the `eventPopup` global (owner-editable, localized with
 * EN fallback) and hands a display-safe slice to the client `EventPopup`, which decides on
 * its own whether to show (active + future date + not seen by this visitor).
 *
 * The event "identity" is its DATE: dismissals are remembered per `eventDate`, so
 * scheduling a new event re-shows the popup to everyone while a copy fix does not.
 */
export default async function EventPopupSlot({ locale }: { locale: Locale }) {
  let g
  try {
    const payload = await getPayload({ config })
    g = await payload.findGlobal({ slug: 'eventPopup', locale, fallbackLocale: 'en' })
  } catch {
    return null // CMS unreachable — the site degrades gracefully, no popup
  }

  // The popup exists ONLY when the owner explicitly turned it on AND there is a real,
  // future event with a title behind it — an empty/leftover global must never surface.
  if (!g?.active || !g.eventDate) return null
  if (new Date(g.eventDate).getTime() < Date.now()) return null
  if (!`${g.titlePlain ?? ''}${g.titleGradient ?? ''}`.trim()) return null

  const data: EventPopupData = {
    id: String(g.eventDate),
    active: g.active,
    titlePlain: g.titlePlain ?? '',
    titleGradient: g.titleGradient ?? '',
    description: g.description ?? '',
    eventDate: String(g.eventDate),
    metaLine: g.metaLine ?? '',
    speakers: (g.speakers ?? []).map((s) => ({
      name: s.name,
      role: s.role ?? '',
      photo: typeof s.photo === 'object' && s.photo?.url ? s.photo.url : null,
    })),
    ctaLabel: g.ctaLabel || undefined,
    joinLabel: g.joinLabel || undefined,
    occupations: (g.occupations ?? []).map((o) => o.label),
  }

  return <EventPopup data={data} labels={getDictionary(locale).eventPopup} />
}
