import { getPayload } from 'payload'

import config from '../../../../payload.config'
import { DEFAULT_LOCALE, isLocale } from '../../../../lib/i18n/config'

/** Cât timp poate fi servit un răspuns din cache. Scurt: publicarea unui pop-up trebuie să
 *  se vadă repede, dar nu atât de scurt încât fiecare vizitator să lovească baza de date. */
const CACHE_SECONDS = 60

/**
 * `GET /api/event-popups/active?locale=en|ro` — pop-up-ul care se cuvine afișat acum (spec §5).
 *
 * Întoarce UNUL singur, sau `{ popup: null }`. Criteriile sunt aceleași cu cele ale
 * endpoint-ului de înscriere — dacă ceva se afișează, trebuie să și accepte înscrieri.
 *
 * Nu întoarce documentul întreg: colecția are câmpuri interne (`internalName`, `status`,
 * numărul de înscriși) care n-au ce căuta într-un răspuns public. Trimitem exact felia de
 * care are nevoie interfața.
 *
 * `eventDate` pleacă spre client ca să poată verifica el însuși expirarea — cache-ul de mai
 * sus înseamnă că un pop-up poate fi servit până la un minut după ce evenimentul a trecut.
 */
export async function GET(request: Request): Promise<Response> {
  const requested = new URL(request.url).searchParams.get('locale')
  const locale = isLocale(requested) ? requested : DEFAULT_LOCALE

  let popup = null
  try {
    const payload = await getPayload({ config })
    const now = new Date().toISOString()

    const found = await payload.find({
      collection: 'eventPopups',
      where: {
        and: [
          { status: { equals: 'published' } },
          { startShowingAt: { less_than_equal: now } },
          { eventDate: { greater_than: now } },
        ],
      },
      // Cel mai recent programat câștigă: dacă două evenimente se suprapun, cel anunțat
      // ultimul e cel pe care owner-ul îl vrea în față.
      sort: '-startShowingAt',
      limit: 1,
      locale,
      fallbackLocale: DEFAULT_LOCALE,
      overrideAccess: true, // colecția nu e publică; felia sigură se construiește aici
      depth: 1, // pozele speakerilor
    })

    const doc = found.docs[0]
    if (doc) {
      popup = {
        slug: doc.slug,
        displayVersion: doc.displayVersion ?? 1,
        showDelaySeconds: doc.showDelaySeconds ?? 5,
        eventDate: String(doc.eventDate),
        titlePlain: doc.titlePlain ?? '',
        titleGradient: doc.titleGradient ?? '',
        description: doc.description ?? '',
        metaLine: doc.metaLine ?? '',
        ctaLabel: doc.ctaLabel || null,
        joinLabel: doc.joinLabel || null,
        occupations: (doc.occupations ?? []).map((o) => o.label),
        speakers: (doc.speakers ?? []).map((s) => ({
          name: s.name,
          role: s.role ?? '',
          photo: typeof s.photo === 'object' && s.photo?.url ? s.photo.url : null,
        })),
        newsletterOptInEnabled: doc.newsletterOptInEnabled ?? false,
        newsletterConsentText: doc.newsletterConsentText ?? '',
      }
    }
  } catch {
    // CMS indisponibil — site-ul degradează elegant, fără pop-up, niciodată cu o eroare
    // aruncată în fața vizitatorului.
    return Response.json({ popup: null }, { status: 200 })
  }

  return Response.json(
    { popup },
    {
      status: 200,
      headers: {
        'Cache-Control': `public, max-age=0, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
      },
    },
  )
}
