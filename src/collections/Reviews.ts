import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { revalidateSiteHook } from '../lib/revalidateSite'

/**
 * Testimonials (CLAUDE.md §4, §10) — a single pool, no star rating. Collected via an
 * auto-sent email after a session ends (`source: emailForm`, T13) or added by Silviu
 * (`source: manual`). Curated on Home via `showOnHome` (max 5 enforced in the query, T9).
 *
 * Public create is intentionally closed here: the T13 public submit route writes through
 * the Local API with `overrideAccess: true` server-side, so it never depends on this
 * collection's own `create` access being open to anonymous requests.
 *
 * Public READ is limited to curated testimonials (T16): anonymous requests only ever see
 * `showOnHome: true` docs — the Home query already filters on that flag, so nothing
 * publicly rendered changes; what closes is the REST-level enumeration of every uncurated
 * (name + role/company) submission. Admins see everything.
 */
export const Reviews: CollectionConfig = {
  slug: 'reviews',
  admin: {
    useAsTitle: 'authorName',
    group: { en: 'Content', ro: 'Conținut' },
    defaultColumns: ['authorName', 'course', 'source', 'showOnHome'],
    description: {
      en: 'Participant testimonials, collected by email after a course edition ends or added manually. There is no star rating. Curate homepage placement with "Show on home"; at most 5 appear there.',
      ro: 'Testimoniale ale participanților, colectate prin email după încheierea unei ediții de curs sau adăugate manual. Nu există rating cu stele. Alege ce apare pe pagina principală cu "Afișează pe pagina principală"; acolo apar cel mult 5.',
    },
  },
  access: {
    read: ({ req }) => (req.user ? true : { showOnHome: { equals: true } }),
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  // Static frontend (EN + /ro) regenerates after every dashboard save.
  hooks: {
    afterChange: [revalidateSiteHook],
    afterDelete: [revalidateSiteHook],
  },
  fields: [
    {
      name: 'text',
      type: 'textarea',
      required: true,
      localized: true,
    },
    {
      name: 'authorName',
      type: 'text',
    },
    {
      name: 'roleCompany',
      label: { en: 'Role / Company', ro: 'Rol / Companie' },
      type: 'text',
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      hasMany: false,
      admin: {
        description: {
          en: 'The course this testimonial refers to, if any. Optional; used for context in the dashboard.',
          ro: 'Cursul la care se referă acest testimonial, dacă există. Opțional; folosit pentru context în dashboard.',
        },
      },
    },
    {
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'manual',
      options: [
        { label: { en: 'Email form (post-session)', ro: 'Formular pe email (după sesiune)' }, value: 'emailForm' },
        { label: { en: 'Added manually', ro: 'Adăugat manual' }, value: 'manual' },
      ],
    },
    {
      name: 'showOnHome',
      label: { en: 'Show on home', ro: 'Afișează pe pagina principală' },
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: {
          en: 'Tick to feature this testimonial on the homepage. At most 5 ticked testimonials are displayed there; the rest stay hidden from visitors.',
          ro: 'Bifează pentru a afișa acest testimonial pe pagina principală. Cel mult 5 testimoniale bifate apar acolo; restul rămân ascunse vizitatorilor.',
        },
      },
    },
    {
      name: 'submissionKey',
      type: 'text',
      unique: true,
      admin: {
        hidden: true,
        description: {
          en: 'Duplicate-submission guard: sha256 of the session id and the lowercased email, set only by the public review submission route so the same (session, email) pair can submit at most once. Left empty for manually added reviews; the unique constraint allows any number of empty values.',
          ro: 'Protecție împotriva trimiterilor duplicate: sha256 din id-ul sesiunii și emailul scris cu litere mici, setat doar de ruta publică de trimitere a recenziilor, astfel încât aceeași pereche (sesiune, email) să poată trimite cel mult o dată. Rămâne gol pentru recenziile adăugate manual; constrângerea de unicitate permite oricâte valori goale.',
        },
      },
    },
  ],
}
