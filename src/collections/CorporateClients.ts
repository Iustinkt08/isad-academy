import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { revalidateSiteHook } from '../lib/revalidateSite'

/**
 * Client logo strip shown in the Corporate page hero (CLAUDE.md §4, §6). Kept as its own
 * collection rather than merged into `partners` — a possible future merge is a Silviu TBD,
 * not assumed here.
 */
export const CorporateClients: CollectionConfig = {
  slug: 'corporateClients',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'order'],
    description: 'Client logos shown in the /corporate page hero strip.',
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
        description: 'Optional external link the logo opens when clicked.',
      },
    },
    {
      name: 'order',
      type: 'number',
      admin: {
        description: 'Display order, ascending.',
      },
    },
  ],
}
