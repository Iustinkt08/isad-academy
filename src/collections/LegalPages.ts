import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { revalidateSiteHook } from '../lib/revalidateSite'

/**
 * Paginile legale, editabile din dashboard: Termeni, Confidențialitate, Cookies.
 *
 * Schema oglindește EXACT modelul de blocuri cu care sunt scrise documentele azi
 * (`src/components/legal/content/types.ts`): paragraf, subtitlu, listă, tabel pe două
 * coloane și panoul cu datele firmei. Nu e o alegere de stil — până la 2026-08-07 colecția
 * avea doar `sections[] { heading, body }`, iar în forma aia tabelul de retenție din GDPR și
 * panoul cu CUI/ANPC pur și simplu nu încăpeau. Colecția exista, dar site-ul o ignora și
 * randa texte hardcodate: editai în admin și nu se schimba nimic (confirmat de owner).
 *
 * Dacă adaugi un tip de bloc aici, adaugă-l și în randorul din `src/components/legal/` —
 * altfel conținutul se salvează și dispare tăcut la afișare.
 */
export const LegalPages: CollectionConfig = {
  slug: 'legalPages',
  admin: {
    useAsTitle: 'metaTitle',
    group: { en: 'Site', ro: 'Site' },
    defaultColumns: ['metaTitle', 'page', 'updatedAt'],
    description: {
      en: 'The full text of the legal pages: Terms, Privacy, Cookies. What you save here is exactly what visitors read on the site; nothing is hard-coded any more, and every save republishes the pages in both languages.',
      ro: 'Textul integral al paginilor legale: Termeni, Confidențialitate, Cookies. Ce salvezi aici este exact ce citesc vizitatorii pe site; nimic nu mai este scris în cod, iar fiecare salvare republică paginile în ambele limbi.',
    },
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  // Frontend static (EN + /ro) — fără asta, o modificare salvată n-ar apărea până la
  // următorul build.
  hooks: {
    afterChange: [revalidateSiteHook],
    afterDelete: [revalidateSiteHook],
  },
  fields: [
    {
      name: 'page',
      type: 'select',
      required: true,
      unique: true,
      options: [
        { label: { en: 'Terms & Conditions (/terms)', ro: 'Termeni și condiții (/terms)' }, value: 'terms' },
        { label: { en: 'Privacy (/privacy)', ro: 'Confidențialitate (/privacy)' }, value: 'privacy' },
        { label: { en: 'Cookie Policy (/cookies)', ro: 'Politica de cookies (/cookies)' }, value: 'cookies' },
      ],
      admin: {
        position: 'sidebar',
        description: {
          en: 'Which page of the site this document renders on. Create exactly one document per page; the value cannot repeat.',
          ro: 'Pe ce pagină a site-ului se afișează acest document. Creează exact un document pentru fiecare pagină; valoarea nu se poate repeta.',
        },
      },
    },
    {
      name: 'metaTitle',
      type: 'text',
      required: true,
      localized: true,
      admin: {
        description: {
          en: 'Title shown in the browser tab and used by search engines, e.g. "Terms and Conditions".',
          ro: 'Titlul afișat în tab-ul browserului și folosit de motoarele de căutare, de exemplu "Terms and Conditions".',
        },
      },
    },
    {
      name: 'titlePlain',
      type: 'text',
      localized: true,
      admin: {
        description: {
          en: 'First part of the on-page heading, rendered in plain ink, e.g. "Terms and " (mind the trailing space).',
          ro: 'Prima parte a titlului de pe pagină, afișată în culoarea de text obișnuită, de exemplu "Terms and " (atenție la spațiul de la final).',
        },
      },
    },
    {
      name: 'titleGradient',
      type: 'text',
      localized: true,
      admin: {
        description: {
          en: 'Last part of the on-page heading, rendered in the brand gradient, e.g. "Conditions."',
          ro: 'Ultima parte a titlului de pe pagină, afișată în gradientul brandului, de exemplu "Conditions."',
        },
      },
    },
    {
      name: 'lastUpdated',
      type: 'text',
      localized: true,
      admin: {
        description: {
          en: 'Shown verbatim under the title, e.g. "Last updated: 21.07.2026". Free text on purpose: it is the date of the document itself, not of the last save, and the two must not be confused.',
          ro: 'Afișat exact așa sub titlu, de exemplu "Last updated: 21.07.2026". Text liber intenționat: este data documentului în sine, nu a ultimei salvări, iar cele două nu trebuie confundate.',
        },
      },
    },
    {
      name: 'sections',
      type: 'array',
      localized: true,
      labels: {
        singular: { en: 'Section', ro: 'Secțiune' },
        plural: { en: 'Sections', ro: 'Secțiuni' },
      },
      admin: {
        description: {
          en: 'The numbered sections of the document, in the order they appear on the page. Put the number in the heading itself, e.g. "1. General information". Leave the heading empty for the preamble.',
          ro: 'Secțiunile numerotate ale documentului, în ordinea în care apar pe pagină. Include numărul chiar în titlu, de exemplu "1. General information". Lasă titlul gol pentru preambul.',
        },
      },
      fields: [
        {
          name: 'heading',
          type: 'text',
          admin: {
            description: {
              en: 'The section heading, copied verbatim from the document. Leave empty for a section without a heading (the preamble).',
              ro: 'Titlul secțiunii, copiat exact din document. Lasă gol pentru o secțiune fără titlu (preambulul).',
            },
          },
        },
        {
          name: 'blocks',
          type: 'blocks',
          minRows: 1,
          blocks: [
            {
              slug: 'paragraph',
              labels: {
                singular: { en: 'Paragraph', ro: 'Paragraf' },
                plural: { en: 'Paragraphs', ro: 'Paragrafe' },
              },
              fields: [{ name: 'text', type: 'textarea', required: true }],
            },
            {
              slug: 'subheading',
              labels: {
                singular: { en: 'Sub-heading', ro: 'Subtitlu' },
                plural: { en: 'Sub-headings', ro: 'Subtitluri' },
              },
              fields: [
                {
                  name: 'text',
                  type: 'text',
                  required: true,
                  admin: {
                    description: {
                      en: 'e.g. "3.1. Provider" or "Identification data".',
                      ro: 'de exemplu "3.1. Provider" sau "Identification data".',
                    },
                  },
                },
              ],
            },
            {
              slug: 'list',
              labels: {
                singular: { en: 'Bulleted list', ro: 'Listă cu puncte' },
                plural: { en: 'Bulleted lists', ro: 'Liste cu puncte' },
              },
              fields: [
                {
                  name: 'items',
                  type: 'array',
                  minRows: 1,
                  fields: [{ name: 'text', type: 'textarea', required: true }],
                },
              ],
            },
            {
              slug: 'table',
              labels: {
                singular: { en: 'Two-column table', ro: 'Tabel pe două coloane' },
                plural: { en: 'Two-column tables', ro: 'Tabele pe două coloane' },
              },
              // Două coloane fix, nu un tabel generic: singurul tabel din documente e grila
              // de perioade de retenție. Un model flexibil ar cere un randor flexibil, pe
              // care nu-l avem.
              fields: [
                { name: 'headLeft', type: 'text', required: true },
                { name: 'headRight', type: 'text', required: true },
                {
                  name: 'rows',
                  type: 'array',
                  minRows: 1,
                  fields: [
                    { name: 'left', type: 'textarea', required: true },
                    { name: 'right', type: 'textarea', required: true },
                  ],
                },
              ],
            },
            {
              slug: 'entity',
              labels: {
                singular: { en: 'Company details panel', ro: 'Panou cu datele firmei' },
                plural: { en: 'Company details panels', ro: 'Panouri cu datele firmei' },
              },
              fields: [
                {
                  name: 'line1',
                  type: 'text',
                  required: true,
                  admin: {
                    description: {
                      en: 'First line of the panel, e.g. the legal name and registration numbers.',
                      ro: 'Primul rând al panoului, de exemplu denumirea legală și numerele de înregistrare.',
                    },
                  },
                },
                {
                  name: 'line2',
                  type: 'text',
                  required: true,
                  admin: {
                    description: {
                      en: 'Second line of the panel, e.g. contact emails, phone, website.',
                      ro: 'Al doilea rând al panoului, de exemplu adresele de email de contact, telefonul, site-ul.',
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
