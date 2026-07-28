import type { GlobalConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { revalidateSiteHook } from '../lib/revalidateSite'

/**
 * Event popup (owner Figma 4033-156/4034-156 desktop, 4035-156/4035-201 mobile) — the
 * site-entry modal announcing a live event. EVERYTHING here is owner-editable without
 * code (the explicit requirement): title (plain + gradient segment), description, event
 * date (the countdown target), speakers, CTA labels, occupation options.
 * (The "Only X seats left" chip was removed — owner decision 2026-07-28.)
 *
 * The frontend re-shows the popup to visitors who dismissed a PREVIOUS event: the
 * "seen it" localStorage key is derived from `eventDate`, so scheduling a new event
 * (new date) re-arms the popup while a typo fix in the description does not.
 */
export const EventPopup: GlobalConfig = {
  slug: 'eventPopup',
  admin: {
    group: 'Site',
    description:
      'The event popup shown once per visitor when entering the site. Toggle "Active" off to hide it everywhere; a new Event date re-shows it to everyone.',
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
      name: 'active',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Show the popup on the site. It also hides itself automatically once the event date has passed.' },
    },
    {
      name: 'titlePlain',
      type: 'text',
      localized: true,
      admin: { description: 'Event title — the part rendered in plain ink, e.g. "AI Governance ".' },
    },
    {
      name: 'titleGradient',
      type: 'text',
      localized: true,
      admin: { description: 'Event title — the segment rendered in the brand gradient, e.g. "in Practice.".' },
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'eventDate',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Countdown target. After this moment the popup stops showing itself.',
      },
    },
    {
      name: 'metaLine',
      type: 'text',
      localized: true,
      admin: { description: 'E.g. "Thu 14 Aug 2026 · 18:00 (EEST) · Live on Zoom".' },
    },
    {
      name: 'speakers',
      type: 'array',
      labels: { singular: 'Speaker', plural: 'Speakers' },
      admin: { description: 'Shown with photo, or initials when no photo is uploaded.' },
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'role', type: 'text', localized: true },
        { name: 'photo', type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'ctaLabel',
      type: 'text',
      localized: true,
      admin: { description: 'Main button label. Empty = "Secure your spot".' },
    },
    {
      name: 'joinLabel',
      type: 'text',
      localized: true,
      admin: { description: 'Form submit label. Empty = "Join us".' },
    },
    {
      name: 'occupations',
      type: 'array',
      localized: true,
      labels: { singular: 'Occupation option', plural: 'Occupation options' },
      admin: { description: 'Options offered in the registration form (visitors can also type their own).' },
      fields: [{ name: 'label', type: 'text', required: true }],
    },
  ],
}
