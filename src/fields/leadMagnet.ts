import type { Field, Validate } from 'payload'

/**
 * Reusable "lead magnet" group: a toggle plus the downloadable file it gates. Used on both
 * `blogPosts` (CLAUDE.md §4) and the `homepage` newsletter block. The file is only shown in
 * the admin UI — and only required — once `enabled` is checked.
 */
export const leadMagnetFields = (): Field[] => [
  {
    name: 'enabled',
    type: 'checkbox',
    defaultValue: false,
    admin: {
      description: 'Gate the file behind an email capture form.',
    },
  },
  {
    name: 'file',
    type: 'upload',
    relationTo: 'media',
    admin: {
      description: 'Delivered to visitors who submit their email. Required while "enabled" is checked.',
      condition: (_, siblingData) => Boolean(siblingData?.enabled),
    },
    validate: ((value, { siblingData }) => {
      const enabled = Boolean((siblingData as { enabled?: boolean } | undefined)?.enabled)
      if (enabled && !value) {
        return 'A file is required while the lead magnet is enabled.'
      }
      return true
    }) as Validate,
  },
]
