import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { revalidateSiteHook } from '../lib/revalidateSite'

/** Editable certification FAQ (CLAUDE.md §4; home certification section). Public read, admin write. */
export const FaqItems: CollectionConfig = {
  slug: 'faqItems',
  admin: {
    useAsTitle: 'question',
    group: { en: 'Site', ro: 'Site' },
    defaultColumns: ['question', 'order'],
    description: {
      en: 'Questions and answers shown in the FAQ section on the homepage, grouped into journey tabs (Discover, Learn, Validate, Access). Changes appear on the site after saving.',
      ro: 'Întrebări și răspunsuri afișate în secțiunea FAQ de pe pagina principală, grupate pe taburi de parcurs (Discover, Learn, Validate, Access). Modificările apar pe site după salvare.',
    },
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  // Static frontend (EN + /ro) regenerates after every dashboard save.
  hooks: {
    afterChange: [revalidateSiteHook],
    afterDelete: [revalidateSiteHook],
  },
  fields: [
    {
      name: 'question',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'answer',
      type: 'richText',
      localized: true,
    },
    {
      name: 'category',
      type: 'select',
      admin: {
        description: {
          en: 'The tab this question appears under in the homepage FAQ section. Each tab matches a stage of the visitor journey, from discovering the site to enrolling.',
          ro: 'Tabul sub care apare întrebarea în secțiunea FAQ de pe pagina principală. Fiecare tab corespunde unei etape din parcursul vizitatorului, de la descoperirea site-ului până la înscriere.',
        },
      },
      // Owner 2026-07-25: journey-shaped tabs — Discover (company/site/courses),
      // Learn (time framing, evaluations), Validate (certifications), Access (enrolment).
      options: [
        { label: { en: 'Discover', ro: 'Descoperă' }, value: 'discover' },
        { label: { en: 'Learn', ro: 'Învață' }, value: 'learn' },
        { label: { en: 'Validate', ro: 'Validează' }, value: 'validate' },
        { label: { en: 'Access', ro: 'Acces' }, value: 'access' },
      ],
    },
    {
      name: 'order',
      type: 'number',
      admin: {
        description: {
          en: 'Position of the question within its tab, sorted ascending: lower numbers appear higher in the list.',
          ro: 'Poziția întrebării în cadrul tabului său, sortată crescător: numerele mai mici apar mai sus în listă.',
        },
      },
    },
  ],
}
