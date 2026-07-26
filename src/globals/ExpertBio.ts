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
    group: 'Site',
    description: 'The expert bio, shown on Home (short) and About (full).',
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
    { name: 'title', type: 'text', localized: true, admin: { description: 'Professional title / headline.' } },
    { name: 'photo', type: 'upload', relationTo: 'media' },
    { name: 'shortBio', type: 'textarea', localized: true, admin: { description: 'Used in the Home expert band.' } },
    { name: 'fullBio', type: 'richText', localized: true, admin: { description: 'Used on the About page.' } },
    {
      name: 'credentials',
      type: 'array',
      localized: true,
      labels: { singular: 'Credential', plural: 'Credentials' },
      fields: [
        { name: 'label', type: 'text' },
        { name: 'value', type: 'text' },
      ],
    },
  ],
}
