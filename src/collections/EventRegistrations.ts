import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { sendEventRegistrationEmails } from '../lib/email/hooks'

/**
 * Registrations collected by the event popup (Figma 4034-156) — dual purpose like `leads`:
 * email notifications (participant confirmation + owner alert) and an admin-reviewable
 * list of who signed up for which event. Public creation is open (anonymous visitors
 * submit the popup form); every other operation is admin-only.
 */
export const EventRegistrations: CollectionConfig = {
  slug: 'eventRegistrations',
  admin: {
    useAsTitle: 'email',
    group: 'Sales',
    defaultColumns: ['firstName', 'lastName', 'email', 'occupation', 'createdAt'],
    description:
      'Sign-ups from the event popup. Public create only — read/update/delete are admin-only.',
  },
  defaultSort: '-createdAt',
  access: {
    read: isAdmin,
    create: () => true,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'eventId',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description:
          'Which event this registration belongs to — the popup event\'s date key (a new event date starts a fresh list).',
      },
    },
    { name: 'firstName', type: 'text', required: true },
    { name: 'lastName', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    {
      name: 'occupation',
      type: 'text',
      admin: { description: 'Picked from the configured list or typed freely.' },
    },
  ],
  // Confirmation email to the participant ("invite link on its way") + single-destination
  // owner notification (siteSettings.contact.email) — both on CREATE only, never blocking.
  hooks: {
    afterChange: [sendEventRegistrationEmails],
  },
}
