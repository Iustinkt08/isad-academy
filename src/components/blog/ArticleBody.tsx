import type { DefaultNodeTypes, SerializedBlockNode } from '@payloadcms/richtext-lexical'
import { RichText, type JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'

import { getDictionary } from '@/lib/i18n/dictionaries'
import type { Locale } from '@/lib/i18n/config'
import { asMedia } from '../courses/helpers'
import { cn } from '../ui/cn'
import { LINK_CHIP_PLATFORMS } from '@/fields/richTextBlocks'
import { resolveTextStateStyle } from '@/lib/richtext/textState'
import type { DownloadableResourceBlock, LinkChipBlock } from '@/payload-types'

/**
 * Article-body render targets + Lexical renderer — Figma 3977-687 (desktop ≥lg) /
 * 3977-718 (mobile <lg), single DOM with responsive classes.
 * A converter set SPECIFIC to the article page: paragraph → ArticleParagraph,
 * h2 → ArticleH2, quote → ArticleBlockquote, linkChip → ArticleLinkChip (external pill,
 * NEVER a video embed), downloadableResource → ArticleResourceCard. Colored text runs
 * (TextStateFeature) and prose links keep the exact behavior of the shared
 * RichTextContent (src/components/richtext/RichTextContent.tsx), which stays untouched
 * for its other consumers (about, legal, courses).
 */

type BlogBlockNode = SerializedBlockNode<DownloadableResourceBlock | LinkChipBlock>

const PLATFORM_LABELS: Record<string, string> = Object.fromEntries(
  LINK_CHIP_PLATFORMS.map(({ value, label }) => [value, label]),
)

/** "245 KB" / "1.2 MB" — same best-effort rule as RichTextContent. */
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

/** Body paragraph — Figma 3977-718 / 3977-687: 14.5/24 mobile → 15.5/27 desktop, #595959. */
export function ArticleParagraph({ children }: { children: React.ReactNode }) {
  return (
    <p className="w-full text-[14.5px] leading-6 text-[#595959] [word-break:break-word] lg:text-[15.5px] lg:leading-[27px]">
      {children}
    </p>
  )
}

/** Section heading — 20/28 (−0.5) mobile → 26/34 (−0.8) desktop, Medium #222222. */
export function ArticleH2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="w-full text-[20px] font-medium leading-7 tracking-[-0.5px] text-[#222222] [word-break:break-word] lg:text-[26px] lg:leading-[34px] lg:tracking-[-0.8px]">
      {children}
    </h2>
  )
}

/** Highlighted blockquote — #f6f6f6 panel radius 16, 4px vertical gradient bar
 * (#407ea2 → #1c5d99, self-stretch), text Medium #222: 14/22 mobile → 17/27 desktop. */
export function ArticleBlockquote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="flex w-full gap-5 rounded-[16px] bg-[#f6f6f6] py-[22px] pl-6 pr-7">
      <span
        aria-hidden="true"
        className="w-1 shrink-0 self-stretch rounded-[2px] bg-[linear-gradient(180deg,#407ea2_0%,#1c5d99_100%)]"
      />
      <p className="flex-1 text-[14px] font-medium leading-[22px] text-[#222222] [word-break:break-word] lg:text-[17px] lg:leading-[27px]">
        {children}
      </p>
    </blockquote>
  )
}

/** External link pill (Figma 3839:74) — a button-styled link, NEVER an embed. */
export function ArticleLinkChip({ fields }: { fields: LinkChipBlock }) {
  const platform = PLATFORM_LABELS[fields.platform ?? 'website'] ?? 'Website'
  return (
    <span className="block">
      <a
        href={fields.url}
        target="_blank"
        rel="noopener noreferrer"
        data-chip
        data-testid="link-chip"
        className="inline-flex items-center gap-[8px] rounded-[999px] bg-white py-[9px] pl-[14px] pr-[16px] text-[13.5px] font-medium tracking-[-0.3px] text-[#222222] no-underline shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-transform hover:scale-[1.03] motion-reduce:transition-none"
      >
        {fields.label}
        <span className="font-normal text-[#959595]">
          {platform} <span aria-hidden="true">↗</span>
        </span>
      </a>
    </span>
  )
}

/** Downloadable resource card (Figma 3839:79) — the button stacks below 480px. */
export function ArticleResourceCard({
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
    <div
      data-testid="downloadable-resource"
      className="flex w-full flex-col gap-[14px] rounded-[16px] bg-white px-[22px] py-[18px] shadow-[0_6px_20px_rgba(77,77,77,0.06)] min-[480px]:flex-row min-[480px]:items-center"
    >
      <div className="flex min-w-0 flex-1 items-center gap-[14px]">
        <span className="flex size-[44px] shrink-0 items-center justify-center rounded-[12px] bg-[#f6f6f6] text-[12px] font-semibold tracking-[0.5px] text-[#1c5d99]">
          {fileTypeLabel(media.mimeType) ?? 'FILE'}
        </span>
        <div className="flex min-w-0 flex-col gap-[2px]">
          <p className="text-[15px] font-medium tracking-[-0.3px] text-[#222222] [word-break:break-word]">
            {fields.title}
          </p>
          {(fields.description || meta) && (
            <p className="text-[12.5px] text-[#959595] [word-break:break-word]">
              {fields.description || meta}
            </p>
          )}
        </div>
      </div>
      <a
        href={media.url}
        download
        data-chip
        className="shrink-0 self-start rounded-[20px] bg-black px-[16px] pb-[10px] pt-[9px] text-[13px] font-semibold text-white no-underline transition-transform hover:scale-[1.03] motion-reduce:transition-none min-[480px]:self-auto"
      >
        {getDictionary(locale).richtext.download}
      </a>
    </div>
  )
}

/**
 * Article-specific converters on top of the defaults:
 *   - `text`: colored runs from `TextStateFeature`, resolved against the SAME preset map
 *     as the editor (src/lib/richtext/textState.ts) — identical to RichTextContent.
 *   - `paragraph` / `heading(h2)` / `quote`: the Figma-styled article targets above.
 *   - `blocks`: linkChip + downloadableResource as article cards.
 */
const articleConverters =
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
    paragraph: ({ node, nodesToJSX }) => (
      <ArticleParagraph>{nodesToJSX({ nodes: node.children })}</ArticleParagraph>
    ),
    heading: (args) => {
      if (args.node.tag === 'h2') {
        return <ArticleH2>{args.nodesToJSX({ nodes: args.node.children })}</ArticleH2>
      }
      const defaultHeading = defaultConverters.heading
      if (typeof defaultHeading === 'function') return defaultHeading(args)
      const Tag = args.node.tag
      return <Tag>{args.nodesToJSX({ nodes: args.node.children })}</Tag>
    },
    quote: ({ node, nodesToJSX }) => (
      <ArticleBlockquote>{nodesToJSX({ nodes: node.children })}</ArticleBlockquote>
    ),
    blocks: {
      linkChip: ({ node }) => <ArticleLinkChip fields={node.fields as LinkChipBlock} />,
      downloadableResource: ({ node }) => (
        <ArticleResourceCard fields={node.fields as DownloadableResourceBlock} locale={locale} />
      ),
    },
  })

/**
 * The article body renderer. Children stack with the column's uniform 20px gap
 * (Figma Article Column autolayout); node types not restyled here (lists, h3,
 * in-text images, prose links) keep sensible defaults via descendant utilities.
 */
export function ArticleRichText({
  data,
  locale,
  className,
}: {
  data: unknown
  locale: Locale
  className?: string
}) {
  if (!data) return null

  return (
    <RichText
      data={data as never}
      converters={articleConverters(locale)}
      className={cn(
        // Column rhythm from the delivered page: 24px between blocks on mobile, 20px ≥lg.
        'flex w-full flex-col gap-6 lg:gap-5',
        // Prose links are underlined blue accents; pill chips/buttons (data-chip) style themselves.
        '[&_a:not([data-chip])]:font-medium [&_a:not([data-chip])]:text-[#1c5d99] [&_a:not([data-chip])]:underline',
        '[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-1 [&_li]:text-[14.5px] [&_li]:leading-6 [&_li]:text-[#595959] lg:[&_li]:text-[15.5px] lg:[&_li]:leading-[27px]',
        '[&_h3]:text-[20px] [&_h3]:font-medium [&_h3]:tracking-[-0.5px] [&_h3]:text-[#222222]',
        '[&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-[24px]',
        className,
      )}
    />
  )
}
