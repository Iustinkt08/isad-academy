import type { CollectionConfig } from 'payload'

import { hiddenFromEditors, isAdminRole } from '../access/isAdminRole'
import { sendLeadNotificationEmail } from '../lib/email/hooks'

/**
 * Contact + Corporate form submissions (CLAUDE.md §4, §6) — dual purpose: email
 * notification (T7) and an admin-reviewable dashboard. Public creation is open (anonymous
 * visitors submit these forms); every other operation is admin-only.
 */
export const Leads: CollectionConfig = {
  slug: 'leads',
  admin: {
    useAsTitle: 'name',
    group: { en: 'Sales', ro: 'Vânzări' },
    defaultColumns: ['type', 'name', 'email', 'createdAt'],
    description: {
      en: 'Submissions from the Contact and Corporate forms on the site. Every new entry also triggers a notification email to the site contact address. Entries are created by visitors; only administrators can view or manage them.',
      ro: 'Mesaje trimise prin formularele Contact și Corporate de pe site. Fiecare intrare nouă declanșează și un email de notificare către adresa de contact a site-ului. Intrările sunt create de vizitatori; doar administratorii le pot vedea și gestiona.',
    },
    // Lead PII is admin-only — editors manage content, not the inbox (owner 2026-08-08).
    hidden: hiddenFromEditors,
  },
  defaultSort: '-createdAt',
  access: {
    read: isAdminRole,
    // Public submission goes through the hardened `/api/leads/submit` service, which writes
    // via the Local API with `overrideAccess: true` (honeypot + strict validation already
    // applied). Payload's own REST/GraphQL create endpoint must NOT be a public bypass that
    // skips that validation and fires the notification email — so require an authenticated
    // user here (securitate: A01/A03).
    create: ({ req }) => Boolean(req.user),
    update: isAdminRole,
    delete: isAdminRole,
  },
  fields: [
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: { en: 'Contact', ro: 'Contact' }, value: 'contact' },
        { label: { en: 'Corporate', ro: 'Corporate' }, value: 'corporate' },
      ],
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'message',
      type: 'textarea',
    },
    // --- Contact-only ---
    {
      name: 'subject',
      type: 'select',
      admin: {
        description: {
          en: 'Contact form only: the topic the visitor picked in the subject dropdown.',
          ro: 'Doar pentru formularul de contact: subiectul ales de vizitator din meniul derulant.',
        },
        condition: (_, siblingData) => siblingData?.type === 'contact',
      },
      options: [
        { label: { en: 'Course', ro: 'Curs' }, value: 'course' },
        { label: { en: 'Corporate', ro: 'Corporate' }, value: 'corporate' },
        { label: { en: 'Certification', ro: 'Certificare' }, value: 'certification' },
        { label: { en: 'Other', ro: 'Altele' }, value: 'other' },
      ],
    },
    // --- Corporate-only ---
    {
      name: 'companyName',
      type: 'text',
      admin: {
        description: {
          en: 'Corporate form only: the company the request comes from.',
          ro: 'Doar pentru formularul Corporate: compania de la care vine solicitarea.',
        },
        condition: (_, siblingData) => siblingData?.type === 'corporate',
      },
    },
    {
      name: 'contactPerson',
      type: 'text',
      admin: {
        description: {
          en: 'Corporate form only: the person to follow up with at the company.',
          ro: 'Doar pentru formularul Corporate: persoana de contact din companie pentru discuțiile ulterioare.',
        },
        condition: (_, siblingData) => siblingData?.type === 'corporate',
      },
    },
    {
      name: 'participantsRange',
      type: 'text',
      admin: {
        description: {
          en: 'Corporate form only: estimated number of participants, free text, e.g. "10-20".',
          ro: 'Doar pentru formularul Corporate: numărul estimat de participanți, text liber, de exemplu "10-20".',
        },
        condition: (_, siblingData) => siblingData?.type === 'corporate',
      },
    },
    {
      name: 'topicCourse',
      type: 'relationship',
      relationTo: 'courses',
      hasMany: false,
      admin: {
        description: {
          en: 'Corporate form only: the existing catalog course the company asked about.',
          ro: 'Doar pentru formularul Corporate: cursul existent din catalog despre care a întrebat compania.',
        },
        condition: (_, siblingData) => siblingData?.type === 'corporate',
      },
    },
    {
      name: 'topicOther',
      type: 'text',
      admin: {
        description: {
          en: 'Corporate form only: free-text topic, used when the request is not about one of the catalog courses.',
          ro: 'Doar pentru formularul Corporate: temă în text liber, folosită când solicitarea nu vizează unul dintre cursurile din catalog.',
        },
        condition: (_, siblingData) => siblingData?.type === 'corporate',
      },
    },
    {
      name: 'preferredPeriod',
      type: 'group',
      admin: {
        description: {
          en: 'Corporate form only: the delivery window the company prefers (from and to dates).',
          ro: 'Doar pentru formularul Corporate: intervalul de livrare preferat de companie (datele de început și de sfârșit).',
        },
        condition: (_, siblingData) => siblingData?.type === 'corporate',
      },
      fields: [
        { name: 'from', type: 'date' },
        { name: 'to', type: 'date' },
      ],
    },
  ],
  // T7: single-destination email notification on every NEW lead (`siteSettings.contact.email`;
  // skipped gracefully — logged, never blocking — when unset). See
  // src/lib/email/hooks/sendLeadNotificationEmail.ts.
  hooks: {
    afterChange: [sendLeadNotificationEmail],
  },
}
