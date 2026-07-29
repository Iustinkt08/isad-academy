import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { sendNewsletterCampaign } from '../lib/email/hooks/sendNewsletterCampaign'

/**
 * Hand-written newsletters, composed in the admin and broadcast to the Brevo subscriber
 * list (owner 2026-07-29 — "vreau sa scriu din admin, sa nu intru in Brevo").
 *
 * NOT public: unlike the rest of the CMS this never renders on the site, so read is
 * admin-only too. Sending is driven by the `sendNow` checkbox rather than a separate button
 * because Payload's field UI is what the editor already knows — see
 * `lib/email/hooks/sendNewsletterCampaign` for the exactly-once mechanics.
 */
export const Newsletters: CollectionConfig = {
  slug: 'newsletters',
  admin: {
    useAsTitle: 'subject',
    group: 'Marketing',
    defaultColumns: ['subject', 'sentAt', 'lastResult'],
    description:
      'Write a newsletter and send it to everyone subscribed. Tick “Send now” and save — the message goes out once and cannot be re-sent.',
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    afterChange: [sendNewsletterCampaign],
  },
  fields: [
    {
      name: 'subject',
      type: 'text',
      required: true,
      admin: { description: 'Subject line recipients see in their inbox.' },
    },
    {
      name: 'preheader',
      type: 'text',
      admin: {
        description: 'Optional one-line intro shown under the title. Leave empty to skip it.',
      },
    },
    {
      name: 'body',
      type: 'richText',
      required: true,
      admin: {
        description:
          'The message. Headings, bold, italic, links and lists are carried into the e-mail; images and embeds are not.',
      },
    },
    {
      name: 'sendNow',
      type: 'checkbox',
      defaultValue: false,
      label: 'Send now',
      admin: {
        position: 'sidebar',
        description: 'Tick and save to send. Sending happens once — this cannot be undone.',
      },
    },
    {
      name: 'sentAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Stamped when the newsletter was sent. Once set, it can never be re-sent.',
      },
    },
    {
      name: 'lastResult',
      type: 'text',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Outcome of the send — check here if the newsletter did not arrive.',
      },
    },
  ],
}
