import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { revalidateSiteHook } from '../lib/revalidateSite'

/** Partner/accreditation logos shown on Home (CLAUDE.md §4). Public read, admin write. */
export const Partners: CollectionConfig = {
  slug: 'partners',
  admin: {
    useAsTitle: 'name',
    group: 'Content',
    defaultColumns: ['name', 'type', 'order'],
    description: 'Logos shown on the homepage partners strip.',
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
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'url',
      type: 'text',
      admin: {
        description: 'External link the logo opens when clicked.',
      },
    },
    {
      name: 'order',
      type: 'number',
      admin: {
        description: 'Display order, ascending.',
      },
    },
    {
      name: 'type',
      type: 'select',
      admin: {
        description: 'Optional grouping — reserved for future use.',
      },
      options: [
        { label: 'Accreditation', value: 'accreditation' },
        { label: 'Client', value: 'client' },
        { label: 'Training partner', value: 'trainingPartner' },
      ],
    },
  ],
}
