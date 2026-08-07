'use client'

import { useEffect, useState } from 'react'

import { getDictionary } from '@/lib/i18n/dictionaries'
import type { Locale } from '@/lib/i18n/config'
import EventPopup, { type EventPopupData } from './EventPopup'

/**
 * Montarea site-wide a pop-up-ului de eveniment — din layout-ul [locale], după conținut.
 *
 * CLIENT, nu server, și asta e o decizie, nu o scăpare (2026-08-07): paginile sunt statice și
 * se regenerează doar la salvările din dashboard. Un pop-up cu `startShowingAt` peste trei
 * zile n-ar apărea niciodată de la sine dintr-o pagină prerandată — fereastra de afișare se
 * deschide după ceas, nu la o salvare. Aducerea datelor de pe client rezolvă asta; costul e
 * o cerere JSON mică, făcută oricum după încărcare, iar răspunsul e cache-abil 60s.
 *
 * Înainte citea globalul `eventPopup`. Globalul rămâne în cod până la migrarea de la pasul 7,
 * dar NU mai alimentează nimic: sursa e colecția `eventPopups`, prin `/api/event-popups/active`.
 */
export default function EventPopupSlot({ locale }: { locale: Locale }) {
  const [data, setData] = useState<EventPopupData | null>(null)

  useEffect(() => {
    // `ignore` previne setState după unmount (schimbare de limbă în timpul cererii).
    let ignore = false

    fetch(`/api/event-popups/active?locale=${locale}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { popup?: EventPopupData | null } | null) => {
        if (ignore || !body?.popup) return
        // Fără titlu nu există pop-up. Se întâmplă real: conținutul e localizat, iar dacă
        // limba curentă (și fallback-ul EN) sunt goale, am afișa un modal gol peste site.
        const hasTitle = `${body.popup.titlePlain}${body.popup.titleGradient}`.trim().length > 0
        if (hasTitle) setData(body.popup)
      })
      .catch(() => {
        // CMS/rețea indisponibile — site-ul merge mai departe fără pop-up.
      })

    return () => {
      ignore = true
    }
  }, [locale])

  if (!data) return null

  return <EventPopup data={data} labels={getDictionary(locale).eventPopup} locale={locale} />
}
