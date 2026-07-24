import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { revalidateSiteHook } from '../lib/revalidateSite'

/**
 * CMS-editable legal pages (owner request 2026-07-12): Privacy, Cookie Policy, Delivery
 * Policy and Terms are fully editable from the dashboard. The frontend shows a
 * "Last updated" tag sourced from Payload's automatic `updatedAt` — it refreshes on every
 * save. Public read, admin write.
 */
export const LegalPages: CollectionConfig = {
  slug: 'legalPages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'page', 'updatedAt'],
    description:
      'Legal page content (Privacy / Cookie Policy / Delivery Policy / Terms). The "Last updated" tag on the site updates automatically when you save.',
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
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'page',
      type: 'select',
      required: true,
      unique: true,
      options: [
        { label: 'Privacy (/privacy)', value: 'privacy' },
        { label: 'Cookie Policy (/cookies)', value: 'cookies' },
        { label: 'Terms & Conditions (/terms)', value: 'terms' },
      ],
      admin: { description: 'Which route this document renders on. One document per page.' },
    },
    {
      name: 'intro',
      type: 'textarea',
      localized: true,
      admin: { description: 'Short line under the page title.' },
    },
    {
      name: 'sections',
      type: 'array',
      localized: true,
      fields: [
        { name: 'heading', type: 'text', required: true },
        { name: 'body', type: 'richText' },
      ],
      admin: { description: 'Numbered sections — include the number in the heading (e.g. "1. General").' },
    },
  ],
}
