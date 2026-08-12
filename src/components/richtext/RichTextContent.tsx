import type { DefaultNodeTypes, SerializedBlockNode } from '@payloadcms/richtext-lexical'
import { RichText, type JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'

import { asMedia } from '../courses/helpers'
import { getDictionary } from '../../lib/i18n/dictionaries'
import { DEFAULT_LOCALE, type Locale } from '../../lib/i18n/config'
import { GlassPanel } from '../ui/GlassPanel'
import { cn } from '../ui/cn'
import {
  CODE_BLOCK_LANGUAGES,
  LINK_CHIP_PLATFORMS,
  type CodeBlockFields,
} from '@/fields/richTextBlocks'
import { resolveTextStateStyle } from '@/lib/richtext/textState'
import type { DownloadableResourceBlock, LinkChipBlock } from '@/payload-types'

/**
 * Server-rendered Lexical rich text with house prose styling (no typography plugin —
 * descendant utilities keep it dependency-free). Shared by course/about/certification pages
 * (which only use the default node set) and the blog (which adds the T12 extras rendered by
 * the converters below: named text colors, link chips, downloadable resources). Accepts the
 * loosely-typed richText shape Payload generates on collections/globals.
 */

type BlogBlockNode = SerializedBlockNode<DownloadableResourceBlock | LinkChipBlock | CodeBlockFields>

const PLATFORM_LABELS: Record<string, string> = Object.fromEntries(
  LINK_CHIP_PLATFORMS.map(({ value, label }) => [value, label]),
)

const CODE_LANGUAGE_LABELS: Record<string, string> = Object.fromEntries(
  CODE_BLOCK_LANGUAGES.map(({ value, label }) => [value, label]),
)

/** Dark monospaced panel for the `codeBlock` block — verbatim code, no highlighter. */
function CodePanel({ fields }: { fields: CodeBlockFields }) {
  const language =
    fields.language && fields.language !== 'plain'
      ? (CODE_LANGUAGE_LABELS[fields.language] ?? null)
      : null
  return (
    // #091f33 = the dark end of the brand dark gradient (§12) — never a new hue.
    <div className="my-6 overflow-hidden rounded-2xl bg-[#091f33]" data-testid="code-block">
      {language && (
        <div className="px-5 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8fb3d9]">
          {language}
        </div>
      )}
      <pre className="overflow-x-auto px-5 py-4 font-mono text-[13.5px] leading-[22px] text-[#e8eef5]">
        <code>{fields.code}</code>
      </pre>
    </div>
  )
}

/** "245 KB" / "1.2 MB" — best-effort, returns null when the size is unknown. */
const formatFileSize = (bytes: number | null | undefined): string | null => {
  if (bytes == null || bytes <= 0) return null
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** "PDF" / "PNG" — derived from the media mime type, null when unknown. */
const fileTypeLabel = (mimeType: string | null | undefined): string | null => {
  const subtype = mimeType?.split('/')[1]
  if (!subtype) return null
  const [base] = subtype.split('+')
  return base ? base.toUpperCase() : null
}

/** Pill external link (never an embed) — `data-chip` opts it out of the prose underline. */
function LinkChip({ fields }: { fields: LinkChipBlock }) {
  const platform = PLATFORM_LABELS[fields.platform ?? 'website'] ?? 'Website'
  return (
    <span className="my-6 block">
      <a
        href={fields.url}
        target="_blank"
        rel="noopener noreferrer"
        data-chip
        data-testid="link-chip"
        className="inline-flex items-center gap-2 rounded-full bg-blue px-5 py-2.5 text-sm font-semibold text-paper no-underline transition-colors duration-200 hover:bg-steel"
      >
        {fields.label}
        <span className="font-normal text-ice">
          {platform} <span aria-hidden="true">↗</span>
        </span>
      </a>
    </span>
  )
}

/** Inline download card for a media file offered in the article body. */
function DownloadableResource({
  fields,
  locale,
}: {
  fields: DownloadableResourceBlock
  locale: Locale
}) {
  const media = asMedia(fields.file)
  // Unpopulated (fetched at depth 0) or missing media — nothing useful to render.
  if (!media?.url) return null

  const meta = [fileTypeLabel(media.mimeType), formatFileSize(media.filesize)]
    .filter(Boolean)
    .join(' · ')

  return (
    <GlassPanel className="my-6 p-6" data-testid="downloadable-resource">
      <p className="text-h4 text-ink">{fields.title}</p>
      {fields.description && <p className="mt-1 text-body text-ink/70">{fields.description}</p>}
      {meta && <p className="mt-2 text-small text-grey-500">{meta}</p>}
      <a
        href={media.url}
        download
        data-chip
        className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-blue px-5 py-2 text-sm font-semibold text-blue no-underline transition-colors duration-200 hover:bg-blue/10"
      >
        {getDictionary(locale).richtext.download} <span aria-hidden="true">↓</span>
      </a>
    </GlassPanel>
  )
}

/**
 * Custom converters on top of the defaults:
 *   - `text`: the default converter ignores Lexical node state (`$`), so colored runs from
 *     `TextStateFeature` are resolved here against the SAME preset map the editor uses
 *     (src/lib/richtext/textState.ts) and wrapped in a styled span.
 *   - `blocks`: the two T12 custom blocks.
 */
const jsxConverters =
  (locale: Locale): JSXConvertersFunction<BlogBlockNode | DefaultNodeTypes> =>
  ({ defaultConverters }) => ({
  ...defaultConverters,
  text: (args) => {
    const defaultText = defaultConverters.text
    const rendered = typeof defaultText === 'function' ? defaultText(args) : args.node.text
    const state = (args.node as { $?: Record<string, unknown> }).$
    const style = resolveTextStateStyle(state)
    if (!style) return rendered
    return (
      <span style={style} data-text-state>
        {rendered}
      </span>
    )
  },
  blocks: {
    linkChip: ({ node }) => <LinkChip fields={node.fields as LinkChipBlock} />,
    downloadableResource: ({ node }) => (
      <DownloadableResource fields={node.fields as DownloadableResourceBlock} locale={locale} />
    ),
    codeBlock: ({ node }) => <CodePanel fields={node.fields as CodeBlockFields} />,
  },
  })

export function RichTextContent({
  data,
  className,
  locale = DEFAULT_LOCALE,
}: {
  data: unknown
  className?: string
  locale?: Locale
}) {
  if (!data) return null

  return (
    <RichText
      data={data as never}
      converters={jsxConverters(locale)}
      className={cn(
        'text-body text-ink/80',
        '[&_p+p]:mt-4 [&_h2]:text-h3 [&_h2]:mt-8 [&_h2]:text-ink [&_h3]:text-h4 [&_h3]:mt-6 [&_h3]:text-ink',
        // Full heading scale (owner 2026-08-12: editor "Title 1…" styles must render) —
        // h1 steps down to h2 scale inside prose; h4-h6 get a modest semibold treatment.
        '[&_h1]:text-h2 [&_h1]:mt-8 [&_h1]:text-ink',
        '[&_h4]:mt-6 [&_h4]:text-[17px] [&_h4]:font-semibold [&_h4]:text-ink',
        '[&_h5]:mt-6 [&_h5]:text-[16px] [&_h5]:font-semibold [&_h5]:text-ink',
        '[&_h6]:mt-6 [&_h6]:text-[15px] [&_h6]:font-semibold [&_h6]:text-ink',
        // Inline code (the toolbar's `code` format) — pre>code panels style themselves.
        '[&_:not(pre)>code]:rounded-md [&_:not(pre)>code]:bg-line-soft [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.9em] [&_:not(pre)>code]:text-blue',
        '[&_hr]:my-8 [&_hr]:border-line',
        '[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-1',
        // Prose links are underlined; pill chips/download buttons (data-chip) style themselves.
        '[&_a:not([data-chip])]:font-medium [&_a:not([data-chip])]:text-blue [&_a:not([data-chip])]:underline',
        '[&_blockquote]:mt-4 [&_blockquote]:border-l-4 [&_blockquote]:border-aqua [&_blockquote]:pl-4 [&_blockquote]:italic',
        '[&_img]:my-6 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-2xl',
        className,
      )}
    />
  )
}
