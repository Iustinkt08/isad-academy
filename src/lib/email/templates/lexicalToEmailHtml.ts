/**
 * Minimal Lexical → EMAIL HTML converter (owner 2026-07-29, "compose newsletters from the
 * admin, not from Brevo").
 *
 * Deliberately NOT a general-purpose renderer — it targets the newsletter body only, and
 * email clients are the constraint: no external stylesheets, no classes, no modern CSS.
 * Every element therefore carries INLINE styles, matching `templates/base.ts` (§12 palette).
 *
 * Supported nodes are exactly what a newsletter needs: paragraphs, headings, bold/italic/
 * underline/strikethrough runs, links, bullet/numbered lists, line breaks, horizontal
 * rules and images (Lexical `upload` nodes — owner 2026-08-08, after a newsletter went
 * out without its image). Uploads render ONLY when the media object arrives populated
 * (the send hook fetches the doc at depth 2); a bare id is skipped rather than guessed.
 * Anything else (blocks, embeds) is skipped rather than half-rendered — a silently
 * broken layout in someone's inbox is worse than an omission.
 */
import { getSiteUrl } from '../../seo/site'
import { escapeHtml } from './base'

const INK = '#222222'
const BODY = '#444444'
const BLUE = '#1c5d99'
const LINE = '#e6e6e6'

/** Lexical text-format bitmask (@lexical/text FORMAT constants). */
const FORMAT_BOLD = 1
const FORMAT_ITALIC = 1 << 1
const FORMAT_STRIKETHROUGH = 1 << 2
const FORMAT_UNDERLINE = 1 << 3

type LexicalNode = {
  type?: string
  tag?: string
  text?: string
  format?: number | string
  listType?: string
  url?: string
  fields?: { url?: string; newTab?: boolean; linkType?: string; doc?: unknown }
  /** `upload` nodes: the media relation — a populated doc at depth ≥ 1, a bare id at depth 0. */
  value?: unknown
  children?: LexicalNode[]
}

/** Email clients cannot resolve site-relative paths — every image src must be absolute. */
const absoluteMediaUrl = (url: string): string =>
  /^https?:\/\//i.test(url) ? url : `${getSiteUrl()}${url}`

const renderUpload = (node: LexicalNode): string => {
  const media = node.value
  if (!media || typeof media !== 'object') return ''
  const { url, alt, width } = media as { url?: unknown; alt?: unknown; width?: unknown }
  if (typeof url !== 'string' || url.length === 0) return ''

  // Hard width cap for Outlook (ignores max-width); the style keeps it fluid elsewhere.
  const widthAttr = typeof width === 'number' && width > 0 ? Math.min(width, 600) : 600
  return `<img src="${escapeHtml(absoluteMediaUrl(url))}" alt="${escapeHtml(typeof alt === 'string' ? alt : '')}" width="${widthAttr}" style="display:block;width:100%;max-width:${widthAttr}px;height:auto;border-radius:8px;margin:0 0 16px 0;" />`
}

const wrapRun = (text: string, format: number): string => {
  let html = escapeHtml(text)
  if (format & FORMAT_BOLD) html = `<strong>${html}</strong>`
  if (format & FORMAT_ITALIC) html = `<em>${html}</em>`
  if (format & FORMAT_UNDERLINE) html = `<u>${html}</u>`
  if (format & FORMAT_STRIKETHROUGH) html = `<s>${html}</s>`
  return html
}

/** Renders a node's inline children (text runs, links, line breaks). */
const renderInline = (children: LexicalNode[] | undefined): string => {
  if (!Array.isArray(children)) return ''
  return children
    .map((child) => {
      if (child?.type === 'linebreak') return '<br />'
      if (child?.type === 'text') {
        const format = typeof child.format === 'number' ? child.format : 0
        return wrapRun(String(child.text ?? ''), format)
      }
      if (child?.type === 'link' || child?.type === 'autolink') {
        // Only absolute http(s) links survive: a relative or `javascript:` href is
        // meaningless (or unsafe) once the message leaves the site.
        const raw = child.fields?.url ?? child.url ?? ''
        const inner = renderInline(child.children)
        if (!/^https?:\/\//i.test(raw)) return inner
        return `<a href="${escapeHtml(raw)}" style="color:${BLUE};text-decoration:underline;">${inner}</a>`
      }
      // Unknown inline node — keep its text content rather than dropping the sentence.
      return renderInline(child?.children)
    })
    .join('')
}

const renderListItems = (children: LexicalNode[] | undefined): string =>
  (children ?? [])
    .filter((item) => item?.type === 'listitem')
    .map((item) => {
      // A nested list arrives as a child of the item; render it after the item's own text.
      const nested = (item.children ?? []).filter((c) => c?.type === 'list')
      const inline = renderInline((item.children ?? []).filter((c) => c?.type !== 'list'))
      const nestedHtml = nested.map((n) => renderBlock(n)).join('')
      return `<li style="margin:0 0 8px 0;font-size:15px;line-height:24px;color:${BODY};">${inline}${nestedHtml}</li>`
    })
    .join('')

const renderBlock = (node: LexicalNode): string => {
  switch (node?.type) {
    case 'paragraph': {
      const inner = renderInline(node.children)
      // Lexical emits an empty paragraph for a blank line — keep it as vertical rhythm.
      if (!inner.trim()) return `<p style="margin:0 0 16px 0;">&nbsp;</p>`
      return `<p style="margin:0 0 16px 0;font-size:15px;line-height:24px;color:${BODY};">${inner}</p>`
    }
    case 'heading': {
      const level = node.tag === 'h1' || node.tag === 'h2' ? 2 : 3
      const size = level === 2 ? 22 : 18
      return `<h${level} style="margin:24px 0 12px 0;font-size:${size}px;line-height:1.3;color:${INK};font-weight:600;">${renderInline(node.children)}</h${level}>`
    }
    case 'list': {
      const ordered = node.listType === 'number'
      const tag = ordered ? 'ol' : 'ul'
      return `<${tag} style="margin:0 0 16px 0;padding-left:22px;">${renderListItems(node.children)}</${tag}>`
    }
    case 'quote':
      return `<blockquote style="margin:0 0 16px 0;padding:8px 0 8px 16px;border-left:3px solid ${BLUE};font-size:15px;line-height:24px;color:${BODY};">${renderInline(node.children)}</blockquote>`
    case 'horizontalrule':
      return `<hr style="border:0;border-top:1px solid ${LINE};margin:24px 0;" />`
    case 'upload':
      return renderUpload(node)
    default:
      return ''
  }
}

/** Rich-text body → inline-styled HTML fit for an email client. Returns '' for empty input. */
export const lexicalToEmailHtml = (value: unknown): string => {
  const root = (value as { root?: LexicalNode } | null)?.root
  if (!root || !Array.isArray(root.children)) return ''
  return root.children.map(renderBlock).join('')
}
