import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { revalidateSiteHook } from '../lib/revalidateSite'
import { publicOrPublished } from '../access/publicOrPublished'
import { slugField } from '../fields/slug'

/**
 * Teaser + shared content for a course (CLAUDE.md §4). Dates, prices and seats live on
 * `courseSessions` (Variant B), never here. No `modules` field (§3, §9 R3 — resolved:
 * no modules) and no `seo` group yet (lands with `@payloadcms/plugin-seo` in T14).
 */
export const Courses: CollectionConfig = {
  slug: 'courses',
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    defaultColumns: ['title', 'category', 'durationHours', '_status'],
    listSearchableFields: ['title'],
    description: 'Course teasers shown in the catalog. Editions (dates/prices/seats) live on Course Sessions.',
  },
  versions: {
    drafts: true,
  },
  access: {
    read: publicOrPublished,
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
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    slugField('title'),
    {
      name: 'shortDescription',
      type: 'textarea',
      localized: true,
      maxLength: 200,
      admin: {
        description:
          'Short blurb shown on the course preview cards (Home "Explore our upcoming courses"). Keep it to 1–2 sentences.',
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Banner image shown on the catalog card and course detail header.',
      },
    },
    {
      name: 'durationHours',
      type: 'number',
      min: 0,
      admin: {
        description: 'Total course length in hours.',
      },
    },
    {
      name: 'category',
      type: 'select',
      admin: {
        description: 'Reserved for future catalog filtering — no filter UI at launch (CLAUDE.md §6).',
      },
      options: [
        { label: 'ISO/IEC 42001 (AI Management)', value: 'iso' },
        { label: 'Anti-Fraud', value: 'antiFraud' },
        { label: 'Security', value: 'security' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'description',
      type: 'richText',
      localized: true,
      admin: {
        description: 'Full course description. Placeholder copy until Silviu confirms real content (CLAUDE.md §15).',
      },
    },
    {
      name: 'audience',
      type: 'array',
      localized: true,
      labels: {
        singular: 'Audience item',
        plural: 'Audience items',
      },
      admin: {
        description: '"Who this course is for" — one row per bullet point.',
      },
      fields: [
        {
          name: 'text',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'certificationCredits',
      type: 'number',
      min: 0,
      admin: {
        description:
          'CPD credits are 1 per course hour (house rule C3, CLAUDE.md §9 R2) and derive ' +
          'automatically from Duration (hours). This field is only used as a fallback for ' +
          'courses whose Duration is left empty.',
      },
    },
    {
      name: 'sessions',
      type: 'join',
      collection: 'courseSessions',
      on: 'course',
      admin: {
        description: 'Editions of this course. Add/edit them from the Course Sessions collection.',
      },
    },
    // Owner 2026-07-26: powers the "Which course is right for me?" quiz. The engine
    // (src/components/quiz/quiz-data.ts) matches quiz answers against these tags —
    // weighted scoring, hard gates, nearest-edition tie-break. A course WITHOUT a level
    // is simply excluded from quiz recommendations (safe default for drafts/mockups).
    {
      name: 'quizProfile',
      type: 'group',
      admin: {
        description:
          'Quiz matching tags. Fill these in so the "Which course is right for me?" quiz ' +
          'can recommend this course. Leave Level empty to keep the course OUT of the quiz.',
      },
      fields: [
        {
          name: 'level',
          type: 'select',
          options: [
            { label: 'Introductory', value: 'introductory' },
            { label: 'Intermediate', value: 'intermediate' },
            { label: 'Advanced', value: 'advanced' },
            { label: 'Professional specialization', value: 'specialization' },
          ],
          admin: { description: 'Depth of the course. Required for the course to appear in quiz results.' },
        },
        {
          name: 'outcomes',
          type: 'select',
          hasMany: true,
          options: [
            { label: 'Overview / big picture', value: 'overview' },
            { label: 'Practical, applicable skills', value: 'practicalSkills' },
            { label: 'Implementation plan', value: 'implementationPlan' },
            { label: 'Audit preparation', value: 'auditPrep' },
            { label: 'Certification', value: 'certification' },
            { label: 'Foundation for more advanced courses', value: 'foundationForMore' },
          ],
          admin: { description: 'What a participant walks away with (pick all that apply).' },
        },
        {
          name: 'domains',
          type: 'select',
          hasMany: true,
          options: [
            { label: 'ISO standards & management systems', value: 'isoManagement' },
            { label: 'Quality & continuous improvement', value: 'quality' },
            { label: 'Sustainability & organizational responsibility', value: 'sustainability' },
            { label: 'Risk management & compliance', value: 'riskCompliance' },
            { label: 'Information security & data protection', value: 'infosec' },
            { label: 'AI & digital transformation', value: 'ai' },
            { label: 'Leadership, strategy & governance', value: 'leadership' },
            { label: 'Audit & conformity assessment', value: 'audit' },
          ],
          admin: {
            description:
              'Mirrors quiz question 2 ("Ce domeniu te interesează cel mai mult?") — pick all that apply.',
          },
        },
        {
          name: 'quizPitch',
          type: 'textarea',
          localized: true,
          admin: {
            description:
              'One–two sentences shown on the quiz result screen ("why we recommend it"). ' +
              'The quiz is in Romanian — write the RO version at least.',
          },
        },
      ],
    },
  ],
}
