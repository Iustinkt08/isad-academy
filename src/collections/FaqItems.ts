import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { revalidateSiteHook } from '../lib/revalidateSite'

/** Editable certification FAQ (CLAUDE.md §4; home certification section). Public read, admin write. */
export const FaqItems: CollectionConfig = {
  slug: 'faqItems',
  admin: {
    useAsTitle: 'question',
    group: 'Content',
    defaultColumns: ['question', 'order'],
    description: 'Q&A shown in the FAQ section on the homepage, grouped by journey tab.',
  },
  access: {
    read: () => true,
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
      name: 'question',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'answer',
      type: 'richText',
      localized: true,
    },
    {
      name: 'category',
      type: 'select',
      admin: {
        description: 'Tab the question appears under in the homepage FAQ section.',
      },
      // Owner 2026-07-25: journey-shaped tabs — Discover (company/site/courses),
      // Learn (time framing, evaluations), Validate (certifications), Access (enrolment).
      options: [
        { label: 'Discover', value: 'discover' },
        { label: 'Learn', value: 'learn' },
        { label: 'Validate', value: 'validate' },
        { label: 'Access', value: 'access' },
      ],
    },
    {
      name: 'order',
      type: 'number',
      admin: {
        description: 'Display order, ascending.',
      },
    },
  ],
}
