import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { slugField } from '../fields/slug'
import { revalidateSiteHook } from '../lib/revalidateSite'

/**
 * Event pop-ups — one document per live event (owner spec 2026-08-07).
 *
 * Înlocuiește globalul `eventPopup`, care putea ține un singur eveniment odată: acum Silviu
 * își face câte unul per eveniment, vede istoricul și numărul de înscriși pe fiecare.
 * Globalul rămâne pe loc până când migrarea datelor vechi e confirmată (pasul 7 din spec) —
 * nu-l șterge înainte.
 *
 * CONȚINUTUL e copiat 1:1 din global, inclusiv `localized: true` (owner 2026-08-07: „da, ca
 * acum"). Titlul e împărțit intenționat în `titlePlain` + `titleGradient` — al doilea segment
 * primește gradientul de brand din Figma; nu le uni într-un singur câmp.
 *
 * Ce NU e aici, deși apărea în specificație: `image`, `eventLocation`, `joinUrl`,
 * `eventDescription` ca richText. Owner-ul a cerut explicit „păstrează doar … cum e și acum".
 * `joinUrl` va fi nevoie la pasul 6 (variabila `{{joinUrl}}` din emailuri) — se adaugă acolo,
 * ca decizie separată.
 */
export const EventPopups: CollectionConfig = {
  slug: 'eventPopups',
  admin: {
    useAsTitle: 'internalName',
    group: 'Sales',
    defaultColumns: ['internalName', 'eventDate', 'status', 'registrationsCount'],
    description:
      'One entry per live event. A pop-up shows on the site only while it is "Published" AND the clock is between "Start showing at" and the event date — after the event it disappears on its own. "Registrations" counts the people who signed up for THAT event; their details are in Event Registrations.',
  },
  defaultSort: '-eventDate',
  access: {
    // Citirea publică se face DOAR prin endpoint-ul dedicat (pasul 2), care interoghează cu
    // `overrideAccess: true` și întoarce o felie sigură. Colecția în sine nu e publică: ar
    // expune altfel pop-up-uri `draft` și evenimente nepublicate.
    read: ({ req }) => Boolean(req.user),
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  indexes: [
    // Interogarea frontend-ului: „published, în fereastra de afișare, cel mai recent".
    { fields: ['status', 'startShowingAt'] },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        // „Reafișare forțată" e un buton deghizat în checkbox: la salvare incrementează
        // versiunea și se dezarmează singur, altfel ar reafișa pop-up-ul la FIECARE salvare
        // ulterioară. Clientul compară `displayVersion` cu ce are în localStorage.
        if (data?.forceReshow) {
          const current =
            typeof originalDoc?.displayVersion === 'number' ? originalDoc.displayVersion : 1
          data.displayVersion = current + 1
          data.forceReshow = false
        }
        return data
      },
    ],
    // Frontend-ul e static (EN + /ro); fără asta un pop-up publicat n-ar apărea până la
    // următorul build.
    afterChange: [revalidateSiteHook],
  },
  fields: [
    {
      name: 'internalName',
      type: 'text',
      required: true,
      admin: { description: 'Only visible here, to tell events apart. Not shown to visitors.' },
    },
    slugField('internalName'),
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
      admin: { position: 'sidebar', description: 'Only "Published" is ever shown on the site.' },
    },
    {
      name: 'displayVersion',
      type: 'number',
      defaultValue: 1,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description:
          'Bumped by "Force re-show". Visitors who dismissed an older version see it again.',
      },
    },
    {
      name: 'forceReshow',
      type: 'checkbox',
      virtual: true,
      defaultValue: false,
      label: 'Force re-show',
      admin: {
        position: 'sidebar',
        // OBLIGATORIU lângă `virtual: true`: Payload face câmpurile virtuale readOnly în
        // admin din oficiu (fields/config/sanitize.js), iar bifa apărea gri, neapăsabilă.
        // Aici e singurul câmp virtual pe care omul TREBUIE să-l poată atinge.
        readOnly: false,
        description:
          'Tick and save to show this pop-up again to people who dismissed it. Those who already registered never see it again.',
      },
    },

    // ——— Conținut (identic cu globalul, localizat EN/RO) ————————————————————————————————
    {
      name: 'titlePlain',
      type: 'text',
      localized: true,
      admin: {
        description: 'Event title — the part rendered in plain ink, e.g. "AI Governance ".',
      },
    },
    {
      name: 'titleGradient',
      type: 'text',
      localized: true,
      admin: {
        description: 'Event title — the segment rendered in the brand gradient, e.g. "in Practice.".',
      },
    },
    { name: 'description', type: 'textarea', localized: true },
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
      admin: {
        description: 'Options offered in the registration form (visitors can also type their own).',
      },
      fields: [{ name: 'label', type: 'text', required: true }],
    },

    // ——— Programare ————————————————————————————————————————————————————————————————————
    {
      name: 'eventDate',
      type: 'date',
      required: true,
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        description:
          'Countdown target. The pop-up disappears on its own after this moment — no need to unpublish it.',
      },
    },
    {
      name: 'startShowingAt',
      type: 'date',
      required: true,
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        description: 'From when the pop-up may appear. Must be before the event date.',
      },
      validate: (value: unknown, options: unknown): string | true => {
        const siblingData = (options as { siblingData?: { eventDate?: unknown } } | undefined)
          ?.siblingData
        const eventDate = siblingData?.eventDate
        if (typeof value !== 'string' || typeof eventDate !== 'string') return true
        return new Date(value) < new Date(eventDate)
          ? true
          : 'Must be before the event date — otherwise the pop-up could never show.'
      },
    },
    {
      name: 'showDelaySeconds',
      type: 'number',
      defaultValue: 5,
      min: 0,
      max: 120,
      admin: { description: 'Seconds on the page before the pop-up appears.' },
    },

    // ——— Consimțământ newsletter ————————————————————————————————————————————————————————
    {
      name: 'newsletterOptInEnabled',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Show the (unticked) newsletter opt-in in the registration form.' },
    },
    {
      name: 'newsletterConsentText',
      type: 'textarea',
      localized: true,
      defaultValue: 'I want to receive news from isad.academy',
      admin: {
        description:
          'Wording shown next to the opt-in. Stored as a snapshot on every registration — GDPR proof of what exactly was agreed to.',
      },
    },

    // ——— Derivat ————————————————————————————————————————————————————————————————————————
    {
      name: 'registrationsCount',
      type: 'number',
      virtual: true,
      admin: {
        readOnly: true,
        description: 'How many people signed up for this event.',
      },
      hooks: {
        afterRead: [
          async ({ req, data }): Promise<number> => {
            if (!data?.id) return 0
            // Un COUNT per document — în listă înseamnă o interogare pe rând. Acceptabil:
            // `eventRegistrations.popup` e indexat, iar lista de evenimente e scurtă prin
            // natura ei. Dacă ajunge vreodată să doară, se mută pe un contor materializat.
            const result = await req.payload.count({
              collection: 'eventRegistrations',
              where: { popup: { equals: data.id } },
              overrideAccess: true,
            })
            return result.totalDocs
          },
        ],
      },
    },
  ],
}
