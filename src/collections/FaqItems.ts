import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { revalidateSiteHook } from '../lib/revalidateSite'

/** Editable certification FAQ (CLAUDE.md §4; home certification section). Public read, admin write. */
export const FaqItems: CollectionConfig = {
  slug: 'faqItems',
  admin: {
    useAsTitle: 'question',
    defaultColumns: ['question', 'order'],
    description: 'Certification FAQ shown in the certification section on the homepage.',
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
      options: [
        { label: 'Getting started', value: 'gettingStarted' },
        { label: 'Courses & certification', value: 'coursesCertification' },
        { label: 'Payments & practical details', value: 'paymentsPractical' },
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
