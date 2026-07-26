import path from 'path'

import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Content',
  },
  access: {
    read: () => true,
  },
  upload: {
    // Project-root /media — gitignored. Rezolvat prin cwd, NU prin dirname:
    // în bundle-ul standalone modulul compilat trăiește în .next/server/, deci
    // dirname-relative ar fi indicat un folder inexistent (upload + servire 500
    // în producție, 2026-07-26). cwd = rădăcina proiectului în ambele moduri.
    staticDir: path.resolve(process.cwd(), 'media'),
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
}
