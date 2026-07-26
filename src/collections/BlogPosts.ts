import { BlocksFeature, lexicalEditor, TextStateFeature } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { revalidateSiteHook } from '../lib/revalidateSite'
import { publicOrPublished } from '../access/publicOrPublished'
import { leadMagnetFields } from '../fields/leadMagnet'
import { downloadableResourceBlock, linkChipBlock } from '../fields/richTextBlocks'
import { slugField } from '../fields/slug'
import { broadcastNewPostOnPublish } from '../lib/email/hooks'
import { computeReadingTimeMinutes } from '../lib/richtext/plainText'
import { TEXT_STATE_PRESETS } from '../lib/richtext/textState'

/**
 * Blog articles (CLAUDE.md §4, §6, §10). Drafts + published via `versions.drafts` (same
 * pattern as `courses`). `body` extends the default Lexical feature set (headings, lists,
 * blockquotes, links, in-text upload images) with the locked T12 extras:
 *   - `TextStateFeature` — palette-named text colors (content stores keys, never hexes);
 *   - `BlocksFeature` — `linkChip` (pill external link, NEVER a video embed) and
 *     `downloadableResource` (inline download card) custom blocks.
 * Admin "Preview" opens `/next/preview?slug=…`, which authenticates the admin, enables Next
 * draft mode and lands on `/blog/[slug]` — public draft URLs stay 404. No comments, no
 * `seo` group yet (T14 plugin-seo).
 */
export const BlogPosts: CollectionConfig = {
  slug: 'blogPosts',
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    defaultColumns: ['title', '_status', 'createdAt'],
    listSearchableFields: ['title'],
    description: 'Blog articles — rich text supports named colors, link chips and downloadable resources.',
    preview: (doc) => {
      const slug = typeof doc?.slug === 'string' && doc.slug.length > 0 ? doc.slug : null
      if (!slug) return null
      const base = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000').replace(/\/+$/, '')
      return `${base}/next/preview?slug=${encodeURIComponent(slug)}`
    },
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
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    slugField('title'),
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Optional — articles may be published without a cover image.',
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'body',
      type: 'richText',
      localized: true,
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
          // Named palette colors/highlights — see src/lib/richtext/textState.ts (single
          // source of truth shared with the frontend renderer).
          TextStateFeature({ state: TEXT_STATE_PRESETS }),
          // Link chips + downloadable resources (docs/PLAN.md locked decision). NO
          // video-embed feature — CLAUDE.md §4 explicitly rules embeds out.
          BlocksFeature({ blocks: [linkChipBlock, downloadableResourceBlock] }),
        ],
      }),
      admin: {
        description:
          'Supports colored text, blockquotes, in-text images, link chips (external pill links) and downloadable resources.',
      },
    },
    {
      name: 'author',
      type: 'text',
      defaultValue: 'Dr. Silviu Gresoi',
      admin: {
        description: 'Defaults to Dr. Silviu Gresoi — editable per article.',
      },
    },
    {
      name: 'category',
      type: 'select',
      admin: {
        description: 'Reserved for future filtering — no filter UI at launch (CLAUDE.md §6).',
      },
      options: [
        { label: 'AI Governance', value: 'aiGovernance' },
        { label: 'Anti-Fraud', value: 'antiFraud' },
        { label: 'Risk Management', value: 'riskManagement' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'readingTime',
      type: 'number',
      localized: true,
      min: 0,
      admin: {
        description:
          'Minutes. Leave empty to auto-estimate from the body (~200 words/min); a manual value always wins.',
      },
    },
    {
      name: 'leadMagnet',
      label: 'Lead magnet',
      type: 'group',
      admin: {
        description: 'If enabled, the article shows a gated email form that delivers the attached file.',
      },
      fields: leadMagnetFields(),
    },
    {
      name: 'relatedCourse',
      type: 'relationship',
      relationTo: 'courses',
      hasMany: false,
      admin: {
        description: 'Toggle "related to a course" — shows a course callout at the end of the article.',
      },
    },
    {
      name: 'sendNewsletterOnPublish',
      label: 'Send newsletter on publish',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description:
          'Uncheck to publish WITHOUT emailing subscribers. First publish only — the broadcast is ever sent once. ' +
          'Publishing unchecked keeps that one send available: unpublish, tick the box and publish again to send it later.',
      },
    },
    {
      name: 'broadcastSentAt',
      type: 'date',
      admin: {
        hidden: true,
        description:
          'Set automatically once the first-publish newsletter broadcast has been attempted (T7) — prevents re-sending on subsequent re-saves/re-publishes. Do not edit by hand.',
      },
    },
  ],
  hooks: {
    beforeChange: [
      // Auto reading time (CLAUDE.md §4 `readingTime` "auto sau manual"): only fills the
      // field when the editor left it EMPTY — a manual value (including one entered on a
      // later edit) is never overwritten. Recomputed on every save while empty, so body
      // edits keep the estimate honest. `data.body ?? originalDoc.body` covers partial
      // updates that don't resend the body.
      async ({ data, originalDoc }) => {
        if (data && data.readingTime == null) {
          const body = data.body ?? (originalDoc as { body?: unknown } | undefined)?.body
          const minutes = computeReadingTimeMinutes(body)
          if (minutes != null) data.readingTime = minutes
        }
        return data
      },
    ],
    // T7: first-publish (draft/unpublished -> published, exactly once) newsletter broadcast —
    // see src/lib/email/hooks/broadcastNewPostOnPublish.ts for the exactly-once mechanics
    // (`broadcastSentAt` + a `context.skipBroadcastHook` re-entrancy guard).
    afterChange: [broadcastNewPostOnPublish, revalidateSiteHook],
    afterDelete: [revalidateSiteHook],
  },
}
