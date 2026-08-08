import type { GlobalConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { revalidateSiteHook } from '../lib/revalidateSite'

/**
 * The single expert, reused on Home (short bio band) and About (full bio) — CLAUDE.md §4.
 * Seed data comes from the material Silviu provided; needs an EN version + confirmation
 * that it is still current (marked "[TO CONFIRM]" in the seed script).
 */
export const ExpertBio: GlobalConfig = {
  slug: 'expertBio',
  admin: {
    group: { en: 'Site', ro: 'Site' },
    description: {
      en: 'The trainer biography, reused across the site: the short bio appears in the expert band on the homepage, the full bio on the About page. Saving republishes both pages.',
      ro: 'Biografia trainerului, refolosită pe site: biografia scurtă apare în banda expertului de pe pagina principală, iar cea completă pe pagina Despre. Salvarea republică ambele pagini.',
    },
  },
  access: {
    read: () => true,
    update: isAdmin,
  },
  // Static frontend (EN + /ro) regenerates after every dashboard save.
  hooks: {
    afterChange: [revalidateSiteHook],
  },
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'title',
      type: 'text',
      localized: true,
      admin: {
        description: {
          en: 'Professional title or headline shown next to the name, e.g. the role and main credential.',
          ro: 'Titlul profesional sau headline-ul afișat lângă nume, de exemplu rolul și acreditarea principală.',
        },
      },
    },
    { name: 'photo', type: 'upload', relationTo: 'media' },
    {
      name: 'shortBio',
      type: 'textarea',
      localized: true,
      admin: {
        description: {
          en: 'Short biography shown in the expert band on the homepage.',
          ro: 'Biografie scurtă, afișată în banda expertului de pe pagina principală.',
        },
      },
    },
    {
      name: 'fullBio',
      type: 'richText',
      localized: true,
      admin: {
        description: {
          en: 'Full biography shown on the About page.',
          ro: 'Biografia completă, afișată pe pagina Despre.',
        },
      },
    },
    {
      name: 'credentials',
      type: 'array',
      localized: true,
      labels: {
        singular: { en: 'Credential', ro: 'Acreditare' },
        plural: { en: 'Credentials', ro: 'Acreditări' },
      },
      fields: [
        { name: 'label', type: 'text' },
        { name: 'value', type: 'text' },
      ],
    },
  ],
}
