import type { CollectionConfig } from 'payload'

import { hiddenFromEditors, isAdminRole } from '../access/isAdminRole'
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
    group: { en: 'Sales', ro: 'Vânzări' },
    defaultColumns: [
      'popup',
      'firstName',
      'lastName',
      'email',
      'occupation',
      'newsletterOptIn',
      'createdAt',
    ],
    description: {
      en: 'Everyone who signed up through an event pop-up. Each row belongs to ONE event, shown in the "Popup" column; use Filters, then Popup, to see a single event\'s list. Signing up for one event never signs anyone up for another, and it does not subscribe them to the newsletter unless they ticked that box.',
      ro: 'Toți cei care s-au înscris printr-un pop-up de eveniment. Fiecare rând aparține UNUI singur eveniment, afișat în coloana „Popup"; folosiți Filters, apoi Popup, pentru lista unui singur eveniment. Înscrierea la un eveniment nu înscrie pe nimeni la alt eveniment și nu abonează persoana la newsletter decât dacă a bifat acea căsuță.',
    },
    // Registrant PII is admin-only — editors manage the popups, not the sign-up list.
    hidden: hiddenFromEditors,
  },
  defaultSort: '-createdAt',
  access: {
    read: isAdminRole,
    // Ca la `leads`: înscrierile publice trec prin serviciul întărit
    // `registerForEventPopup` (honeypot + validare + dedupe, scris cu `overrideAccess`).
    // Endpoint-ul brut de create din Payload nu are voie să fie un ocol public al lor.
    create: ({ req }) => Boolean(req.user),
    update: isAdminRole,
    delete: isAdminRole,
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
        description: {
          en: 'The event pop-up this sign-up came from. Determines which event the person registered for.',
          ro: 'Pop-up-ul de eveniment din care provine această înscriere. Determină la ce eveniment s-a înscris persoana.',
        },
      },
    },
    { name: 'firstName', type: 'text', required: true },
    { name: 'lastName', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    {
      name: 'occupation',
      type: 'text',
      admin: {
        description: {
          en: 'The occupation the person chose from the configured list or typed in freely on the registration form.',
          ro: 'Ocupația pe care persoana a ales-o din lista configurată sau a scris-o liber în formularul de înscriere.',
        },
      },
    },
    {
      name: 'newsletterOptIn',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        readOnly: true,
        description: {
          en: 'Whether the person ticked the newsletter box when registering. This alone does NOT make them a subscriber; they still have to confirm the double opt-in e-mail.',
          ro: 'Dacă persoana a bifat căsuța de newsletter la înscriere. Doar bifa NU o face abonată; trebuie să confirme și e-mailul de dublu opt-in.',
        },
      },
    },
    {
      name: 'consentSnapshot',
      type: 'group',
      admin: {
        readOnly: true,
        description: {
          en: 'GDPR proof: the exact consent wording agreed to, and when. Kept as a snapshot because the pop-up\'s consent text can be edited later; the proof must not change with it.',
          ro: 'Dovadă GDPR: formularea exactă a consimțământului acceptat și momentul acceptării. Păstrată ca instantaneu pentru că textul de consimțământ al pop-up-ului poate fi editat ulterior; dovada nu trebuie să se schimbe odată cu el.',
        },
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
