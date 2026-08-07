import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { sendEventEmail } from '../lib/email/hooks/sendEventEmail'

/**
 * Emailuri către înscrișii unui eveniment (spec §7) — compuse în admin, trimise cu o bifă.
 *
 * Fiecare document e ȘI draft, ȘI jurnal al trimiterii: după expediere rămân aici subiectul,
 * corpul, câți au primit și cine a eșuat. Ștergerea unui document nu „retrage" nimic — e doar
 * pierderea dovezii.
 *
 * NU e Brevo campaign: emailurile pleacă tranzacțional, unul câte unul, pentru că fiecare
 * poate conține numele destinatarului. Lista de evenimente nu ajunge niciodată în Brevo
 * (decizie owner: Brevo rămâne strict pentru newsletter).
 */
export const EventEmails: CollectionConfig = {
  slug: 'eventEmails',
  admin: {
    useAsTitle: 'subject',
    group: 'Sales',
    defaultColumns: ['subject', 'popup', 'status', 'recipientCount', 'sentAt'],
    description:
      'Write an e-mail and send it to everyone registered for ONE event. Tick "Send test to me" first to see how it looks; then "Send now" delivers it to the whole list — once, and it cannot be re-sent.',
  },
  defaultSort: '-createdAt',
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    afterChange: [sendEventEmail],
  },
  fields: [
    {
      name: 'popup',
      type: 'relationship',
      relationTo: 'eventPopups',
      required: true,
      index: true,
      admin: { description: 'Which event’s registrants receive this. Nobody else gets it.' },
    },
    {
      name: 'subject',
      type: 'text',
      required: true,
      admin: { description: 'Subject line. Variables work here too, e.g. {{firstName}}.' },
    },
    {
      name: 'body',
      type: 'richText',
      required: true,
      admin: {
        description:
          'Variables: {{firstName}}, {{lastName}}, {{eventTitle}}, {{eventDate}}, {{joinUrl}} — replaced per recipient. Headings, bold, links and lists carry into the e-mail; images and embeds do not.',
      },
    },
    {
      name: 'joinUrl',
      type: 'text',
      admin: {
        description:
          'Zoom/Meet link, filled in per e-mail rather than on the event (owner 2026-08-07): the link often does not exist yet when the pop-up is created, and a reminder may point somewhere different from the invitation. Becomes the {{joinUrl}} variable. Leave empty if the e-mail does not need it.',
      },
    },
    {
      name: 'sendTestNow',
      type: 'checkbox',
      defaultValue: false,
      label: 'Send test to me',
      admin: {
        position: 'sidebar',
        description:
          'Sends ONE copy to your own account e-mail, with sample names filled into the variables. Changes nothing else — use it as the preview.',
      },
    },
    {
      name: 'sendNow',
      type: 'checkbox',
      defaultValue: false,
      label: 'Send now',
      admin: {
        position: 'sidebar',
        description:
          'Tick and save to send to every registrant of the selected event. Works ONCE — re-saving afterwards sends nothing. If some addresses failed, ticking it again retries only those.',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Sent', value: 'sent' },
        { label: 'Failed (some recipients)', value: 'failed' },
      ],
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'lastResult',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'What happened on the last attempt — read this after ticking a box.',
      },
    },
    { name: 'sentAt', type: 'date', admin: { readOnly: true, position: 'sidebar' } },
    {
      name: 'sentBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true, position: 'sidebar' },
    },
    { name: 'recipientCount', type: 'number', admin: { readOnly: true } },
    { name: 'successCount', type: 'number', admin: { readOnly: true } },
    {
      name: 'failures',
      type: 'array',
      admin: {
        readOnly: true,
        description:
          'Addresses the provider refused, with the reason. Retry targets exactly these.',
      },
      fields: [
        { name: 'email', type: 'text' },
        { name: 'error', type: 'text' },
      ],
    },
  ],
}
