import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { revalidateSiteHook } from '../lib/revalidateSite'

/**
 * Partner logos for the scrolling logo strip (owner 2026-08-12, reference: the
 * aihouse.promocrat.com partners strip) — shown on the homepage above the FAQ and on
 * /corporate between the industries and the form. BOTH strips hide themselves entirely
 * while this collection is empty (owner rule), so seeding is not required.
 */
export const Partners: CollectionConfig = {
  slug: 'partners',
  admin: {
    useAsTitle: 'name',
    group: { en: 'Content', ro: 'Conținut' },
    defaultColumns: ['name', 'order'],
    description: {
      en: 'Partner logos shown in the scrolling strip on the homepage (above the FAQ) and on the Corporate page (above the form). While this list is empty, the strip does not appear at all.',
      ro: 'Logo-urile partenerilor afișate în banda derulantă de pe pagina principală (deasupra FAQ) și de pe pagina Corporate (deasupra formularului). Cât timp lista e goală, banda nu apare deloc.',
    },
  },
  defaultSort: 'order',
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
          en: 'Partner name — used as the logo\'s alt text.',
          ro: 'Numele partenerului — folosit ca text alternativ al logo-ului.',
        },
      },
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: {
        description: {
          en: 'Logo image, ideally SVG or PNG with a transparent background.',
          ro: 'Imaginea logo-ului, ideal SVG sau PNG cu fundal transparent.',
        },
      },
    },
    // Owner 2026-08-12: the two strips show DIFFERENT logo sets (homepage: all partners;
    // corporate: currently just Orange Digital Center) — placement is per logo.
    {
      name: 'showOnHome',
      type: 'checkbox',
      defaultValue: true,
      label: { en: 'Show in the homepage strip', ro: 'Afișează în banda de pe pagina principală' },
    },
    {
      name: 'showOnCorporate',
      type: 'checkbox',
      defaultValue: false,
      label: { en: 'Show in the Corporate page strip', ro: 'Afișează în banda de pe pagina Corporate' },
    },
    {
      name: 'url',
      type: 'text',
      admin: {
        description: {
          en: 'Optional: the partner\'s website. When set, the logo becomes a link (opens in a new tab).',
          ro: 'Opțional: site-ul partenerului. Când e completat, logo-ul devine link (se deschide în tab nou).',
        },
      },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: {
          en: 'Position in the strip — lower numbers come first.',
          ro: 'Poziția în bandă — numerele mai mici apar primele.',
        },
      },
    },
  ],
}
