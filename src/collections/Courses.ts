import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { revalidateSiteHook } from '../lib/revalidateSite'
import { publicOrPublished } from '../access/publicOrPublished'
import { slugField } from '../fields/slug'

/**
 * Teaser + shared content for a course (CLAUDE.md §4). Dates, prices and seats live on
 * `courseSessions` (Variant B), never here. No `modules` field (§3, §9 R3 — resolved:
 * no modules) and no `seo` group yet (lands with `@payloadcms/plugin-seo` in T14).
 */
export const Courses: CollectionConfig = {
  slug: 'courses',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'durationHours', '_status'],
    description: 'Course teasers shown in the catalog. Editions (dates/prices/seats) live on Course Sessions.',
  },
  versions: {
    drafts: true,
  },
  access: {
    read: publicOrPublished,
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
    slugField('title'),
    {
      name: 'shortDescription',
      type: 'textarea',
      localized: true,
      maxLength: 200,
      admin: {
        description:
          'Short blurb shown on the course preview cards (Home "Explore our upcoming courses"). Keep it to 1–2 sentences.',
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Banner image shown on the catalog card and course detail header.',
      },
    },
    {
      name: 'durationHours',
      type: 'number',
      min: 0,
      admin: {
        description: 'Total course length in hours.',
      },
    },
    {
      name: 'category',
      type: 'select',
      admin: {
        description: 'Reserved for future catalog filtering — no filter UI at launch (CLAUDE.md §6).',
      },
      options: [
        { label: 'ISO/IEC 42001 (AI Management)', value: 'iso' },
        { label: 'Anti-Fraud', value: 'antiFraud' },
        { label: 'Security', value: 'security' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'description',
      type: 'richText',
      localized: true,
      admin: {
        description: 'Full course description. Placeholder copy until Silviu confirms real content (CLAUDE.md §15).',
      },
    },
    {
      name: 'audience',
      type: 'array',
      localized: true,
      labels: {
        singular: 'Audience item',
        plural: 'Audience items',
      },
      admin: {
        description: '"Who this course is for" — one row per bullet point.',
      },
      fields: [
        {
          name: 'text',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'certificationCredits',
      type: 'number',
      min: 0,
      admin: {
        description:
          'CPD credits are 1 per course hour (house rule C3, CLAUDE.md §9 R2) and derive ' +
          'automatically from Duration (hours). This field is only used as a fallback for ' +
          'courses whose Duration is left empty.',
      },
    },
    {
      name: 'sessions',
      type: 'join',
      collection: 'courseSessions',
      on: 'course',
      admin: {
        description: 'Editions of this course. Add/edit them from the Course Sessions collection.',
      },
    },
  ],
}
