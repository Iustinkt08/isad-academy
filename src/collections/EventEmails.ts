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
    group: { en: 'Sales', ro: 'Vânzări' },
    defaultColumns: ['subject', 'popup', 'status', 'recipientCount', 'sentAt'],
    description: {
      en: 'Write an e-mail and send it to everyone registered for ONE event. Tick "Send test to me" first to check how it looks in your own inbox; then "Send now" delivers it to the whole list. Each document sends only once and cannot be re-sent; after sending it stays here as a log of the delivery.',
      ro: 'Scrieți un e-mail și trimiteți-l tuturor celor înscriși la UN singur eveniment. Bifați mai întâi „Send test to me" ca să verificați cum arată în propria căsuță; apoi „Send now" îl livrează întregii liste. Fiecare document se trimite o singură dată și nu poate fi retrimis; după trimitere rămâne aici ca jurnal al livrării.',
    },
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
      admin: {
        description: {
          en: 'The event whose registrants receive this e-mail. Only people registered for that event get it; nobody else does.',
          ro: 'Evenimentul ai cărui înscriși primesc acest e-mail. Îl primesc doar persoanele înscrise la acel eveniment; nimeni altcineva.',
        },
      },
    },
    {
      name: 'subject',
      type: 'text',
      required: true,
      admin: {
        description: {
          en: 'Subject line of the e-mail. Variables work here too, for example {{firstName}}.',
          ro: 'Subiectul e-mailului. Variabilele funcționează și aici, de exemplu {{firstName}}.',
        },
      },
    },
    {
      name: 'body',
      type: 'richText',
      required: true,
      admin: {
        description: {
          en: 'Body of the e-mail. The variables {{firstName}}, {{lastName}}, {{eventTitle}}, {{eventDate}} and {{joinUrl}} are replaced per recipient. Headings, bold, links and lists carry into the e-mail; images and embeds do not.',
          ro: 'Conținutul e-mailului. Variabilele {{firstName}}, {{lastName}}, {{eventTitle}}, {{eventDate}} și {{joinUrl}} sunt înlocuite pentru fiecare destinatar. Titlurile, textul îngroșat, linkurile și listele ajung în e-mail; imaginile și elementele încorporate nu.',
        },
      },
    },
    {
      name: 'joinUrl',
      type: 'text',
      admin: {
        description: {
          en: 'Zoom or Meet link, filled in per e-mail rather than on the event: the link often does not exist yet when the pop-up is created, and a reminder may point somewhere different from the invitation. Becomes the {{joinUrl}} variable. Leave empty if this e-mail does not need it.',
          ro: 'Linkul de Zoom sau Meet, completat per e-mail, nu pe eveniment: de multe ori linkul nu există încă atunci când se creează pop-up-ul, iar un e-mail de reamintire poate duce în alt loc decât invitația. Devine variabila {{joinUrl}}. Lăsați gol dacă acest e-mail nu are nevoie de el.',
        },
      },
    },
    {
      name: 'sendTestNow',
      type: 'checkbox',
      defaultValue: false,
      label: { en: 'Send test to me', ro: 'Trimite-mi un test' },
      admin: {
        position: 'sidebar',
        description: {
          en: 'Sends ONE copy to your own admin account e-mail, with sample names filled into the variables. Changes nothing else; use it as the preview before the real send.',
          ro: 'Trimite O SINGURĂ copie pe adresa contului dumneavoastră de admin, cu nume de exemplu în locul variabilelor. Nu schimbă nimic altceva; folosiți-o ca previzualizare înainte de trimiterea reală.',
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
          en: 'Tick and save to send the e-mail to every registrant of the selected event. Works ONCE: re-saving afterwards sends nothing. If some addresses failed, ticking it again retries only those addresses.',
          ro: 'Bifați și salvați pentru a trimite e-mailul tuturor înscrișilor la evenimentul selectat. Funcționează O SINGURĂ dată: o salvare ulterioară nu mai trimite nimic. Dacă unele adrese au eșuat, rebifarea reîncearcă doar acele adrese.',
        },
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: { en: 'Draft', ro: 'Ciornă' }, value: 'draft' },
        { label: { en: 'Sent', ro: 'Trimis' }, value: 'sent' },
        { label: { en: 'Failed (some recipients)', ro: 'Eșuat (unii destinatari)' }, value: 'failed' },
      ],
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'lastResult',
      type: 'text',
      admin: {
        readOnly: true,
        description: {
          en: 'The outcome of the last send attempt, written automatically. Check it after ticking one of the send boxes.',
          ro: 'Rezultatul ultimei încercări de trimitere, scris automat. Verificați-l după ce bifați una dintre căsuțele de trimitere.',
        },
      },
    },
    { name: 'sentAt', type: 'date', admin: { readOnly: true, position: 'sidebar' } },
    {
      name: 'sentBy',
      type: 'relationship',
      relationTo: 'users',
      label: { en: 'Triggered by (admin account)', ro: 'Declanșat de (cont de admin)' },
      admin: {
        readOnly: true,
        position: 'sidebar',
        // Eticheta veche era doar „Sent By" și a fost citită drept ADRESA EXPEDITORULUI
        // (owner 2026-08-07). E doar urma de audit: cine a apăsat trimite. Expeditorul real
        // e news@isad.academy, decis în cod prin categoria `newsletter`.
        description: {
          en: 'Which admin pressed send. This is an audit trail, NOT the sender address: e-mails always go out from the newsletter sender, news@isad.academy.',
          ro: 'Adminul care a apăsat trimiterea. Este doar o urmă de audit, NU adresa expeditorului: e-mailurile pleacă întotdeauna de la expeditorul de newsletter, news@isad.academy.',
        },
      },
    },
    { name: 'recipientCount', type: 'number', admin: { readOnly: true } },
    { name: 'successCount', type: 'number', admin: { readOnly: true } },
    {
      name: 'failures',
      type: 'array',
      admin: {
        readOnly: true,
        description: {
          en: 'Addresses the e-mail provider refused, with the reason for each. Ticking "Send now" again retries exactly these addresses and no others.',
          ro: 'Adresele refuzate de furnizorul de e-mail, cu motivul pentru fiecare. Rebifarea „Send now" reîncearcă exact aceste adrese și nimic altceva.',
        },
      },
      fields: [
        { name: 'email', type: 'text' },
        { name: 'error', type: 'text' },
      ],
    },
  ],
}
