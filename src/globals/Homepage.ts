import type { GlobalConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { revalidateSiteHook } from '../lib/revalidateSite'
import { leadMagnetFields } from '../fields/leadMagnet'

/**
 * Homepage content (CLAUDE.md §4, §6). Testimonials (`reviews` with `showOnHome`) and
 * partner logos (`partners`) are queried directly by the frontend rather than referenced
 * here — this global only holds hero/featured/why-isad/newsletter content.
 */
export const Homepage: GlobalConfig = {
  slug: 'homepage',
  admin: {
    description: 'Homepage content: hero, featured courses, trust stats and newsletter block.',
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
    {
      name: 'hero',
      type: 'group',
      fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'subtitle', type: 'textarea', localized: true },
        { name: 'ctaText', label: 'CTA text', type: 'text', localized: true },
        { name: 'ctaLink', label: 'CTA link', type: 'text' },
        { name: 'visual', type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'featuredCourses',
      type: 'relationship',
      relationTo: 'courses',
      hasMany: true,
      admin: {
        description: 'Courses shown in the "Featured courses" section — Silviu chooses.',
      },
    },
    {
      name: 'whyIsad',
      label: 'Why isad',
      type: 'group',
      fields: [
        {
          name: 'stats',
          type: 'array',
          localized: true,
          labels: { singular: 'Stat', plural: 'Stats' },
          fields: [
            { name: 'value', type: 'text' },
            { name: 'label', type: 'text' },
          ],
        },
        {
          name: 'differentiators',
          type: 'array',
          localized: true,
          labels: { singular: 'Differentiator', plural: 'Differentiators' },
          fields: [
            { name: 'title', type: 'text' },
            { name: 'text', type: 'textarea' },
          ],
        },
      ],
    },
    {
      name: 'newsletter',
      type: 'group',
      fields: [
        { name: 'headline', type: 'text', localized: true },
        { name: 'invitationText', type: 'textarea', localized: true },
        {
          name: 'leadMagnet',
          label: 'Lead magnet',
          type: 'group',
          admin: {
            description: 'Optional — offer a downloadable resource in exchange for a newsletter signup.',
          },
          fields: leadMagnetFields(),
        },
      ],
    },
  ],
}
