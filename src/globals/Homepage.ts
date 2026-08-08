import type { GlobalConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { revalidateSiteHook } from '../lib/revalidateSite'
import { leadMagnetFields } from '../fields/leadMagnet'

/**
 * Homepage content (CLAUDE.md §4, §6). Testimonials (`reviews` with `showOnHome`) and
 * partner logos (`partners`) are queried directly by the frontend rather than referenced
 * here — this global only holds hero/featured/why-isad/newsletter content.
 */
export const Homepage: GlobalConfig = {
  slug: 'homepage',
  admin: {
    group: { en: 'Site', ro: 'Site' },
    description: {
      en: 'Homepage content: the hero section, the featured course selection, the trust stats and differentiators, and the newsletter block. Saving republishes the homepage in both languages.',
      ro: 'Conținutul paginii principale: secțiunea hero, selecția de cursuri recomandate, statisticile de încredere și diferențiatorii, plus blocul de newsletter. Salvarea republică pagina principală în ambele limbi.',
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
      fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'subtitle', type: 'textarea', localized: true },
        { name: 'ctaText', label: { en: 'CTA text', ro: 'Text CTA' }, type: 'text', localized: true },
        { name: 'ctaLink', label: { en: 'CTA link', ro: 'Link CTA' }, type: 'text' },
        { name: 'visual', type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'featuredCourses',
      type: 'relationship',
      relationTo: 'courses',
      hasMany: true,
      admin: {
        description: {
          en: 'The courses shown in the "Featured courses" section of the homepage, in the order set here. The selection is manual; nothing is picked automatically.',
          ro: 'Cursurile afișate în secțiunea de cursuri recomandate de pe pagina principală, în ordinea stabilită aici. Selecția este manuală; nimic nu se alege automat.',
        },
      },
    },
    {
      name: 'whyIsad',
      label: { en: 'Why isad', ro: 'De ce isad' },
      type: 'group',
      fields: [
        {
          name: 'stats',
          type: 'array',
          localized: true,
          labels: {
            singular: { en: 'Stat', ro: 'Statistică' },
            plural: { en: 'Stats', ro: 'Statistici' },
          },
          fields: [
            { name: 'value', type: 'text' },
            { name: 'label', type: 'text' },
          ],
        },
        {
          name: 'differentiators',
          type: 'array',
          localized: true,
          labels: {
            singular: { en: 'Differentiator', ro: 'Diferențiator' },
            plural: { en: 'Differentiators', ro: 'Diferențiatori' },
          },
          fields: [
            { name: 'title', type: 'text' },
            { name: 'text', type: 'textarea' },
          ],
        },
      ],
    },
    {
      name: 'newsletter',
      type: 'group',
      fields: [
        { name: 'headline', type: 'text', localized: true },
        { name: 'invitationText', type: 'textarea', localized: true },
        {
          name: 'leadMagnet',
          label: { en: 'Lead magnet', ro: 'Lead magnet' },
          type: 'group',
          admin: {
            description: {
              en: 'Optional: offer a downloadable resource in exchange for a newsletter signup, shown with the newsletter block on the homepage.',
              ro: 'Opțional: oferă o resursă descărcabilă în schimbul abonării la newsletter, afișată împreună cu blocul de newsletter de pe pagina principală.',
            },
          },
          fields: leadMagnetFields(),
        },
      ],
    },
  ],
}
