import type { Field } from 'payload'

/**
 * Reusable "slug" field: auto-generates a unique, URL-safe slug from `sourceField`
 * (default: `title`) the first time a document is saved. Editable afterwards — the
 * hook never overwrites a value someone has already set.
 */
export const slugField = (sourceField = 'title'): Field => ({
  name: 'slug',
  type: 'text',
  unique: true,
  index: true,
  admin: {
    position: 'sidebar',
    description: `Auto-generated from "${sourceField}" on first save. Edit to override — must stay unique.`,
  },
  hooks: {
    beforeValidate: [
      ({ value, siblingData, originalDoc }) => {
        if (value) return value

        const source =
          (siblingData as Record<string, unknown> | undefined)?.[sourceField] ??
          (originalDoc as Record<string, unknown> | undefined)?.[sourceField]

        if (!source || typeof source !== 'string') return value

        return slugify(source)
      },
    ],
  },
})

/** Lowercase, ASCII, hyphen-separated slug (strips diacritics and punctuation). */
export const slugify = (input: string): string =>
  input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
