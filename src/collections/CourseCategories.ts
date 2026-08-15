import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'

/**
 * Course categories (owner 2026-08-15) — replaces the old fixed `category` select on
 * Courses so new categories can be created straight from the course edit screen (the
 * relationship field's "Add new" drawer) and reused on later courses.
 *
 * `slug` is the STABLE key business logic hangs on: the seeded `iso` category is what
 * makes a course a PECB track (card subtitle "PECB ISO/IEC 42001", the PECB certification
 * copy, the checkout track label — via `courses.categoryKey`). Renaming a category's NAME
 * is always safe; the slug should not be changed after creation.
 */
export const CourseCategories: CollectionConfig = {
  slug: 'courseCategories',
  admin: {
    useAsTitle: 'name',
    group: { en: 'Courses', ro: 'Cursuri' },
    defaultColumns: ['name', 'slug'],
    description: {
      en: 'Categories a course can belong to. Create new ones here or directly from the Category field on a course — they are saved and reusable on every other course. Reserved for future catalog filtering; no filter is shown at launch.',
      ro: 'Categoriile din care poate face parte un curs. Creezi categorii noi aici sau direct din câmpul Categorie al unui curs — se salvează și se pot refolosi la orice alt curs. Rezervat pentru filtrarea viitoare a catalogului; la lansare nu se afișează niciun filtru.',
    },
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: {
          en: 'Category name, as shown in the admin (e.g. "ISO/IEC 42001 (AI Management)").',
          ro: 'Numele categoriei, așa cum apare în admin (ex. „ISO/IEC 42001 (Management AI)").',
        },
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: {
          en: 'Stable identifier, generated from the name. The special slug "iso" marks the PECB ISO/IEC 42001 track. Do not change it after creation.',
          ro: 'Identificator stabil, generat din nume. Slug-ul special „iso" marchează traseul PECB ISO/IEC 42001. Nu-l schimba după creare.',
        },
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (typeof value === 'string' && value.trim()) return value.trim()
            const name = typeof data?.name === 'string' ? data.name : ''
            return (
              name
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '') || undefined
            )
          },
        ],
      },
    },
  ],
}
