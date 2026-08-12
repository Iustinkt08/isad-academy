import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { revalidateSiteHook } from '../lib/revalidateSite'

/**
 * Trainer profiles for the course page mini-card (owner 2026-08-12). The site default
 * stays Dr. Silviu Gresoi (rendered from the dictionary when a course has no trainer
 * set — see `ExpertMiniCard`); this collection exists so other trainers can be added
 * and picked per course via `courses.trainer`. NOT client accounts (CLAUDE.md §3.1) —
 * plain content documents, readable publicly, managed by admins.
 */
export const Trainers: CollectionConfig = {
  slug: 'trainers',
  admin: {
    useAsTitle: 'name',
    group: { en: 'Content', ro: 'Conținut' },
    defaultColumns: ['name', 'role'],
    description: {
      en: 'Trainer profiles shown on course pages, under the enrolment card. Assign one to a course via its Trainer field; courses without one show the default (Dr. Silviu Gresoi).',
      ro: 'Profiluri de trainer afișate pe paginile cursurilor, sub cardul de înscriere. Se atribuie unui curs din câmpul Trainer; cursurile fără trainer afișează varianta implicită (Dr. Silviu Gresoi).',
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
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: {
          en: 'Full display name, including titles, e.g. "Dr. Silviu Gresoi, PhD, CFE".',
          ro: 'Numele complet afișat, inclusiv titlurile, de exemplu „Dr. Silviu Gresoi, PhD, CFE".',
        },
      },
    },
    {
      name: 'role',
      type: 'text',
      localized: true,
      admin: {
        description: {
          en: 'One line shown under the name, e.g. "Your trainer · 20+ years in AI, risk & financial crime".',
          ro: 'Un rând afișat sub nume, de exemplu „Trainerul tău · 20+ ani în AI, risc și criminalitate financiară".',
        },
      },
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: {
          en: 'Square portrait; shown as a small round photo. Without one, the default trainer photo is used.',
          ro: 'Portret pătrat; apare ca fotografie rotundă mică. Fără fotografie se folosește cea a trainerului implicit.',
        },
      },
    },
  ],
}
