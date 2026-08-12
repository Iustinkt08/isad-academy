import type { GlobalConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { revalidateSiteHook } from '../lib/revalidateSite'

/**
 * /corporate page content (owner 2026-08-12: the whole page becomes editable, including
 * the lead form's field list). Every text field is optional — EMPTY fields fall back to
 * the site's default copy (src/lib/i18n/dictionaries.ts `corporate.*`), so the page never
 * breaks while partially filled in. The form's CORE fields (company name, contact person,
 * e-mail) are fixed — leads and the notification e-mail depend on them; everything else
 * is configured in `form.fields` and stored on the lead as label/value pairs.
 */
export const CorporatePage: GlobalConfig = {
  slug: 'corporatePage',
  admin: {
    group: { en: 'Site', ro: 'Site' },
    description: {
      en: 'Content of the Corporate page: hero, benefit cards, industries, the proposal form (including its optional fields) and the side column. Empty fields fall back to the built-in copy. Saving republishes the page.',
      ro: 'Conținutul paginii Corporate: hero, cardurile de beneficii, industriile, formularul de propunere (inclusiv câmpurile lui opționale) și coloana laterală. Câmpurile goale folosesc textele implicite. Salvarea republică pagina.',
    },
  },
  access: {
    read: () => true,
    update: isAdmin,
  },
  // Static frontend (EN + /ro) regenerates after every dashboard save.
  hooks: {
    afterChange: [revalidateSiteHook],
  },
  fields: [
    {
      name: 'hero',
      type: 'group',
      label: { en: 'Hero', ro: 'Hero' },
      fields: [
        { name: 'pill', type: 'text', localized: true },
        {
          name: 'titleTop',
          type: 'text',
          localized: true,
          admin: {
            description: {
              en: 'First title line, e.g. "Help your organization".',
              ro: 'Primul rând al titlului, de exemplu „Help your organization".',
            },
          },
        },
        {
          name: 'titleBottomPrefix',
          type: 'text',
          localized: true,
          admin: {
            description: {
              en: 'Start of the second line, before the highlighted phrase.',
              ro: 'Începutul rândului al doilea, înaintea sintagmei evidențiate.',
            },
          },
        },
        {
          name: 'titleBottomHighlight',
          type: 'text',
          localized: true,
          admin: {
            description: {
              en: 'The gradient-highlighted phrase that ends the title.',
              ro: 'Sintagma cu gradient care încheie titlul.',
            },
          },
        },
        { name: 'subtitle', type: 'textarea', localized: true },
        { name: 'ctaPrimary', type: 'text', localized: true },
        { name: 'ctaSecondary', type: 'text', localized: true },
      ],
    },
    {
      name: 'benefits',
      type: 'group',
      label: { en: 'Benefits section', ro: 'Secțiunea de beneficii' },
      fields: [
        {
          name: 'titlePlain',
          type: 'text',
          localized: true,
          admin: {
            description: {
              en: 'Plain part of the section title, e.g. "One expert.".',
              ro: 'Partea simplă a titlului secțiunii, de exemplu „One expert.".',
            },
          },
        },
        {
          name: 'titleHighlight',
          type: 'text',
          localized: true,
          admin: {
            description: {
              en: 'Gradient-highlighted part of the section title.',
              ro: 'Partea cu gradient a titlului secțiunii.',
            },
          },
        },
        {
          name: 'items',
          type: 'array',
          labels: {
            singular: { en: 'Benefit card', ro: 'Card de beneficii' },
            plural: { en: 'Benefit cards', ro: 'Carduri de beneficii' },
          },
          admin: {
            description: {
              en: 'The three (or more) benefit cards. When empty, the default three cards are shown.',
              ro: 'Cele trei (sau mai multe) carduri de beneficii. Când lista e goală, se afișează cele trei carduri implicite.',
            },
          },
          fields: [
            { name: 'title', type: 'text', required: true, localized: true },
            { name: 'text', type: 'textarea', localized: true },
          ],
        },
        { name: 'idealFor', type: 'text', localized: true },
        {
          name: 'industries',
          type: 'array',
          labels: {
            singular: { en: 'Industry', ro: 'Industrie' },
            plural: { en: 'Industries', ro: 'Industrii' },
          },
          fields: [{ name: 'name', type: 'text', required: true, localized: true }],
        },
      ],
    },
    {
      name: 'form',
      type: 'group',
      label: { en: 'Proposal form', ro: 'Formularul de propunere' },
      fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'subtitle', type: 'textarea', localized: true },
        {
          name: 'fields',
          type: 'array',
          labels: {
            singular: { en: 'Form field', ro: 'Câmp de formular' },
            plural: { en: 'Form fields', ro: 'Câmpuri de formular' },
          },
          admin: {
            description: {
              en: 'The form fields AFTER the fixed ones (company name, contact person, e-mail — always shown and required). Add, remove or reorder rows freely; answers are stored on the lead and included in the notification e-mail. When the list is empty, the default fields are shown (phone, participants, topic, preferred period, message).',
              ro: 'Câmpurile formularului DUPĂ cele fixe (numele companiei, persoana de contact, e-mail — mereu afișate și obligatorii). Adăugați, ștergeți sau reordonați rândurile liber; răspunsurile se salvează pe lead și intră în emailul de notificare. Când lista e goală, se afișează câmpurile implicite (telefon, participanți, temă, perioadă preferată, mesaj).',
            },
          },
          fields: [
            {
              name: 'label',
              type: 'text',
              required: true,
              localized: true,
              admin: {
                description: {
                  en: 'Shown as the field placeholder and stored next to the answer.',
                  ro: 'Apare ca placeholder al câmpului și se salvează lângă răspuns.',
                },
              },
            },
            {
              name: 'fieldType',
              type: 'select',
              required: true,
              defaultValue: 'text',
              options: [
                { label: { en: 'Short text', ro: 'Text scurt' }, value: 'text' },
                { label: { en: 'E-mail', ro: 'E-mail' }, value: 'email' },
                { label: { en: 'Phone', ro: 'Telefon' }, value: 'phone' },
                { label: { en: 'Long text', ro: 'Text lung' }, value: 'textarea' },
                { label: { en: 'Dropdown (custom options)', ro: 'Listă derulantă (opțiuni proprii)' }, value: 'select' },
                {
                  label: { en: 'Topic / course (catalog + "Other")', ro: 'Temă / curs (catalog + „Altele")' },
                  value: 'courseTopic',
                },
                { label: { en: 'Period (from / to)', ro: 'Perioadă (de la / până la)' }, value: 'period' },
              ],
            },
            { name: 'required', type: 'checkbox', defaultValue: false },
            {
              name: 'options',
              type: 'array',
              labels: {
                singular: { en: 'Option', ro: 'Opțiune' },
                plural: { en: 'Options', ro: 'Opțiuni' },
              },
              admin: {
                condition: (_, siblingData) => siblingData?.fieldType === 'select',
                description: {
                  en: 'The choices of the dropdown, in order.',
                  ro: 'Variantele listei derulante, în ordine.',
                },
              },
              fields: [{ name: 'option', type: 'text', required: true, localized: true }],
            },
          ],
        },
      ],
    },
    {
      name: 'aside',
      type: 'group',
      label: { en: 'Side column', ro: 'Coloana laterală' },
      fields: [
        { name: 'nextTitle', type: 'text', localized: true },
        {
          name: 'steps',
          type: 'array',
          labels: {
            singular: { en: 'Step', ro: 'Pas' },
            plural: { en: 'Steps', ro: 'Pași' },
          },
          fields: [{ name: 'text', type: 'text', required: true, localized: true }],
        },
        { name: 'talkTitle', type: 'text', localized: true },
        { name: 'talkNote', type: 'text', localized: true },
      ],
    },
  ],
}
