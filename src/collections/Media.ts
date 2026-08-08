import type { CollectionConfig } from 'payload'

import { uploadsDir } from '../lib/media/uploadsDir'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: { en: 'Content', ro: 'Conținut' },
  },
  access: {
    read: () => true,
  },
  upload: {
    // Calea se rezolvă în `lib/media/uploadsDir` — citește nota de acolo înainte s-o schimbi.
    // Pe scurt: NICI `__dirname` (indică `.next/server/` în standalone), NICI `process.cwd()`
    // (sub Passenger e home-ul contului, nu rădăcina aplicației) nu sunt de încredere aici.
    staticDir: uploadsDir,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
}
