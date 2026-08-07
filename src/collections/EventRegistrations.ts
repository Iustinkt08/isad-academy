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
    defaultColumns: [
      'popup',
      'firstName',
      'lastName',
      'email',
      'occupation',
      'newsletterOptIn',
      'createdAt',
    ],
    description:
      'Everyone who signed up through an event pop-up. Each row belongs to ONE event — see the "Popup" column. Use Filters → Popup to see a single event’s list. Signing up for one event never signs anyone up for another, and it does not subscribe them to the newsletter unless they ticked that box.',
  },
  defaultSort: '-createdAt',
  access: {
    read: isAdmin,
    // Ca la `leads`: înscrierile publice trec prin serviciul întărit
    // `registerForEventPopup` (honeypot + validare + dedupe, scris cu `overrideAccess`).
    // Endpoint-ul brut de create din Payload nu are voie să fie un ocol public al lor.
    create: ({ req }) => Boolean(req.user),
    update: isAdmin,
    delete: isAdmin,
  },
  // Un om nu se poate înscrie de două ori la același eveniment. Dedupe-ul din
  // `registerForEventPopup` e la nivel de aplicație și pierde cursa la două cereri
  // simultane; indexul îl garantează în baza de date.
  //
  // Unic din 2026-08-07, după retragerea mecanismului vechi: nu mai există rânduri fără
  // `popup`, deci garanția e reală, nu o promisiune ocolită de NULL-uri.
  indexes: [{ fields: ['popup', 'email'], unique: true }],
  fields: [
    {
      name: 'popup',
      type: 'relationship',
      relationTo: 'eventPopups',
      required: true,
      index: true,
      admin: {
        description: 'Which event pop-up this sign-up came from.',
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
    {
      name: 'newsletterOptIn',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        readOnly: true,
        description:
          'Ticked the newsletter box when registering. This alone does NOT make them a subscriber — they still have to confirm the double opt-in e-mail.',
      },
    },
    {
      name: 'consentSnapshot',
      type: 'group',
      admin: {
        readOnly: true,
        description:
          'GDPR proof: the exact wording agreed to, and when. Kept as a snapshot because the pop-up’s consent text can be edited later — the proof must not change with it.',
      },
      fields: [
        { name: 'consentText', type: 'textarea' },
        { name: 'consentedAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
        { name: 'ip', type: 'text' },
        { name: 'userAgent', type: 'text' },
      ],
    },
  ],
  // Confirmation email to the participant ("invite link on its way") + single-destination
  // owner notification (siteSettings.contact.email) — both on CREATE only, never blocking.
  hooks: {
    afterChange: [sendEventRegistrationEmails],
  },
}
