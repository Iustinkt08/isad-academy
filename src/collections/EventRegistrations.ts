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
    // Same as `leads`: public sign-ups flow through the hardened
    // `/api/event-registrations` service (`overrideAccess: true` after honeypot + dedupe +
    // eventId validation). The raw Payload create endpoint must not be a public bypass.
    create: ({ req }) => Boolean(req.user),
    update: isAdmin,
    delete: isAdmin,
  },
  // Un om nu se poate înscrie de două ori la același eveniment. Dedupe-ul din
  // `createEventRegistration` e la nivel de aplicație și pierde cursa la două cereri
  // simultane; indexul îl garantează în baza de date.
  //
  // NU e `unique` încă: înregistrările migrate din `eventId` (pasul 7) au `popup` null, iar
  // Postgres tratează fiecare NULL ca distinct — indexul ar trece, dar ar fi o promisiune
  // falsă cât timp există rânduri nelegate. Se ridică la `unique: true` odată cu migrarea,
  // când `popup` devine `required`.
  indexes: [{ fields: ['popup', 'email'] }],
  fields: [
    {
      name: 'popup',
      type: 'relationship',
      relationTo: 'eventPopups',
      index: true,
      admin: {
        description: 'Which event pop-up this sign-up came from.',
      },
    },
    {
      name: 'eventId',
      type: 'text',
      // DEPRECATED — înlocuit de `popup`. Rămâne populat (cu `String(eventDate)`) până când
      // migrarea de la pasul 7 e confirmată; nu-l șterge înainte, e singura legătură a
      // înregistrărilor vechi cu evenimentul lor.
      required: true,
      index: true,
      admin: {
        readOnly: true,
        description:
          'DEPRECATED — legacy event key (the event date). Kept for registrations made before pop-ups became a collection. Use "Popup" instead.',
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
