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
    group: 'Site',
    defaultColumns: ['metaTitle', 'page', 'updatedAt'],
    description:
      'The full text of the legal pages. What you save here is what visitors read — nothing is hard-coded any more.',
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
        { label: 'Terms & Conditions (/terms)', value: 'terms' },
        { label: 'Privacy (/privacy)', value: 'privacy' },
        { label: 'Cookie Policy (/cookies)', value: 'cookies' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Which route this document renders on. One document per page.',
      },
    },
    {
      name: 'metaTitle',
      type: 'text',
      required: true,
      localized: true,
      admin: { description: 'Browser tab / SEO title, e.g. "Terms and Conditions".' },
    },
    {
      name: 'titlePlain',
      type: 'text',
      localized: true,
      admin: {
        description:
          'First part of the on-page heading, in plain ink — e.g. "Terms and " (mind the trailing space).',
      },
    },
    {
      name: 'titleGradient',
      type: 'text',
      localized: true,
      admin: { description: 'Last part of the heading, rendered in the brand gradient — e.g. "Conditions."' },
    },
    {
      name: 'lastUpdated',
      type: 'text',
      localized: true,
      admin: {
        description:
          'Shown verbatim under the title, e.g. "Last updated: 21.07.2026". Free text on purpose — it is the date OF THE DOCUMENT, not of the last save, and those two must not be confused.',
      },
    },
    {
      name: 'sections',
      type: 'array',
      localized: true,
      labels: { singular: 'Section', plural: 'Sections' },
      admin: {
        description:
          'Numbered sections. Put the number in the heading, e.g. "1. General information". Leave the heading empty for the preamble.',
      },
      fields: [
        {
          name: 'heading',
          type: 'text',
          admin: { description: 'Verbatim from the document. Empty = no heading (preamble).' },
        },
        {
          name: 'blocks',
          type: 'blocks',
          minRows: 1,
          blocks: [
            {
              slug: 'paragraph',
              labels: { singular: 'Paragraph', plural: 'Paragraphs' },
              fields: [{ name: 'text', type: 'textarea', required: true }],
            },
            {
              slug: 'subheading',
              labels: { singular: 'Sub-heading', plural: 'Sub-headings' },
              fields: [
                {
                  name: 'text',
                  type: 'text',
                  required: true,
                  admin: { description: 'e.g. "3.1. Provider" or "Identification data".' },
                },
              ],
            },
            {
              slug: 'list',
              labels: { singular: 'Bulleted list', plural: 'Bulleted lists' },
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
              labels: { singular: 'Two-column table', plural: 'Two-column tables' },
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
              labels: { singular: 'Company details panel', plural: 'Company details panels' },
              fields: [
                {
                  name: 'line1',
                  type: 'text',
                  required: true,
                  admin: { description: 'e.g. the legal name and registration numbers.' },
                },
                {
                  name: 'line2',
                  type: 'text',
                  required: true,
                  admin: { description: 'e.g. contact e-mails, phone, website.' },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
