import type { Block } from 'payload'

/**
 * Custom Lexical blocks for `blogPosts.body` (docs/PLAN.md locked rich-text decision:
 * link chips + downloadable resources are custom blocks via `BlocksFeature`; NO video
 * embeds — CLAUDE.md §4 "link chips … NU embed video"). Rendered on the frontend by the
 * matching `jsxConverters` in `src/components/richtext/RichTextContent.tsx`.
 */

/** `true` only for absolute `http(s)://` URLs — link chips always point off-site. */
export const isAbsoluteHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export const LINK_CHIP_PLATFORMS = [
  { label: 'YouTube', value: 'youtube' },
  { label: 'LinkedIn', value: 'linkedin' },
  { label: 'Website', value: 'website' },
  { label: 'Other', value: 'other' },
] as const

/** Pill-style external link (e.g. a "YouTube" button with a hyperlink — never an embed). */
export const linkChipBlock: Block = {
  slug: 'linkChip',
  interfaceName: 'LinkChipBlock',
  labels: { singular: 'Link chip', plural: 'Link chips' },
  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
      admin: { description: 'Button text, e.g. "Watch the interview".' },
    },
    {
      name: 'url',
      type: 'text',
      required: true,
      validate: (value: null | string | undefined) => {
        if (typeof value !== 'string' || value.trim().length === 0) {
          return 'A URL is required.'
        }
        if (!isAbsoluteHttpUrl(value.trim())) {
          return 'Must be an absolute http(s) URL, e.g. https://example.com/page.'
        }
        return true
      },
      admin: { description: 'Absolute http(s) URL the chip links to.' },
    },
    {
      name: 'platform',
      type: 'select',
      defaultValue: 'website',
      options: [...LINK_CHIP_PLATFORMS],
      admin: { description: 'Shown next to the label so readers know where the link leads.' },
    },
  ],
}

/** Language labels for LEGACY `codeBlock` content (see CodeBlockFields below). */
export const CODE_BLOCK_LANGUAGES = [
  { label: 'Plain text', value: 'plain' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'JSON', value: 'json' },
  { label: 'Bash / shell', value: 'bash' },
  { label: 'Python', value: 'python' },
  { label: 'SQL', value: 'sql' },
] as const

/**
 * LEGACY shape of the retired `codeBlock` block (owner 2026-08-12: added and removed the
 * same day — the HTML code view on the course description covers the need). The editor no
 * longer offers it, but content saved while it existed still renders: RichTextContent and
 * htmlSource keep converters typed against this shape.
 */
export type CodeBlockFields = {
  blockType: 'codeBlock'
  language?: string | null
  code: string
  id?: string | null
  blockName?: string | null
}

/** Downloadable resource card — a media file offered inline in the article body. */
export const downloadableResourceBlock: Block = {
  slug: 'downloadableResource',
  interfaceName: 'DownloadableResourceBlock',
  labels: { singular: 'Downloadable resource', plural: 'Downloadable resources' },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      admin: { description: 'Optional one-liner shown under the title.' },
    },
    {
      name: 'file',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
  ],
}
