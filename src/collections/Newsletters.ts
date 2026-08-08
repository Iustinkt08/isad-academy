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
    group: { en: 'Marketing', ro: 'Marketing' },
    defaultColumns: ['subject', 'sentAt', 'lastResult'],
    description: {
      en: 'Write a newsletter in the dashboard and broadcast it to every subscriber on the Brevo list. Tick "Send now" and save: the message goes out once and cannot be re-sent.',
      ro: 'Scrie un newsletter din dashboard și trimite-l tuturor abonaților din lista Brevo. Bifează "Trimite acum" și salvează: mesajul pleacă o singură dată și nu poate fi retrimis.',
    },
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
      admin: {
        description: {
          en: 'The subject line recipients see in their inbox.',
          ro: 'Subiectul pe care destinatarii îl văd în inbox.',
        },
      },
    },
    {
      name: 'preheader',
      type: 'text',
      admin: {
        description: {
          en: 'Optional one-line intro shown under the title in the email. Leave empty to skip it.',
          ro: 'Introducere opțională de un rând, afișată sub titlu în email. Lasă gol ca să fie omisă.',
        },
      },
    },
    {
      name: 'body',
      type: 'richText',
      required: true,
      admin: {
        description: {
          en: 'The body of the message. Headings, bold, italic, links and lists are carried into the email; images and embeds are not.',
          ro: 'Conținutul mesajului. Titlurile, bold, italic, linkurile și listele ajung în email; imaginile și elementele încorporate nu.',
        },
      },
    },
    {
      name: 'sendNow',
      type: 'checkbox',
      defaultValue: false,
      label: { en: 'Send now', ro: 'Trimite acum' },
      admin: {
        position: 'sidebar',
        description: {
          en: 'Tick and save to send the newsletter to all subscribers. Sending happens exactly once and cannot be undone.',
          ro: 'Bifează și salvează pentru a trimite newsletterul tuturor abonaților. Trimiterea are loc o singură dată și nu poate fi anulată.',
        },
      },
    },
    {
      name: 'sentAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: {
          en: 'Set automatically at the moment the newsletter went out. Once this date exists, the newsletter can never be sent again.',
          ro: 'Completată automat în momentul în care newsletterul a plecat. Odată setată această dată, newsletterul nu mai poate fi trimis din nou.',
        },
      },
    },
    {
      name: 'lastResult',
      type: 'text',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: {
          en: 'Outcome of the last send attempt. Check here first if the newsletter did not arrive.',
          ro: 'Rezultatul ultimei încercări de trimitere. Verifică aici mai întâi dacă newsletterul nu a ajuns.',
        },
      },
    },
  ],
}
