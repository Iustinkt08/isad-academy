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
    group: 'Content',
    defaultColumns: ['authorName', 'course', 'source', 'showOnHome'],
    description: 'Testimonials. No rating — curate homepage placement with "Show on home" (max 5 shown).',
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
      label: 'Role / Company',
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
        description: 'Which course this review refers to, if any.',
      },
    },
    {
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'manual',
      options: [
        { label: 'Email form (post-session)', value: 'emailForm' },
        { label: 'Added manually', value: 'manual' },
      ],
    },
    {
      name: 'showOnHome',
      label: 'Show on home',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Silviu curates which testimonials appear on Home — max 5 are shown, enforced in the query.',
      },
    },
    {
      name: 'submissionKey',
      type: 'text',
      unique: true,
      admin: {
        hidden: true,
        description:
          'T13 duplicate-submission guard — sha256(sessionId + ":" + lowercased email), set only ' +
          'by the public /api/reviews/submit route so the same (session, email) pair can submit ' +
          'at most once. Left empty for manually-added reviews (a nullable unique column allows ' +
          'any number of empty values in Postgres — effectively "sparse").',
      },
    },
  ],
}
