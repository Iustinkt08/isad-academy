import type { CollectionConfig } from 'payload'

/**
 * Admin users only (Silviu + team). Clients never get accounts or log in —
 * seats are named participants on orders, not site users (CLAUDE.md §3.1).
 */
export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    group: 'System',
    description: 'Payload admin users only. Clients never log in.',
  },
  auth: true,
  fields: [
    { name: 'name', type: 'text', label: 'Full name' },
    // Informational for now — every user can access the admin; per-role access
    // rules are a separate decision. Values match the AdminCreateUser toggle.
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'admin',
      saveToJWT: true,
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
    },
  ],
}
