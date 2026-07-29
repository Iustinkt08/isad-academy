import { escapeHtml, renderBaseLayout } from './base'
import { lexicalToEmailHtml } from './lexicalToEmailHtml'

/**
 * Ad-hoc newsletter composed in the admin (`newsletters` collection, owner 2026-07-29).
 * The body is authored as rich text and converted to inline-styled HTML, then dropped into
 * the shared brand layout so a hand-written newsletter looks like every other email the
 * site sends.
 */
export type NewsletterBroadcastData = {
  subject: string
  /** Optional lead paragraph rendered above the body, in the site's muted grey. */
  preheader?: string | null
  /** Payload richText value (Lexical JSON). */
  body: unknown
}

export type RenderedNewsletter = { subject: string; html: string; text: string }

const stripTags = (html: string): string =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h2|h3|li|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

export const renderNewsletterEmail = (data: NewsletterBroadcastData): RenderedNewsletter => {
  const bodyHtml = lexicalToEmailHtml(data.body)
  const preheader = data.preheader?.trim()

  const inner = [
    `<h1 style="margin:0 0 16px 0;font-size:24px;line-height:1.25;color:#222222;font-weight:600;">${escapeHtml(data.subject)}</h1>`,
    preheader
      ? `<p style="margin:0 0 20px 0;font-size:16px;line-height:26px;color:#959595;">${escapeHtml(preheader)}</p>`
      : '',
    bodyHtml,
  ]
    .filter(Boolean)
    .join('')

  const html = renderBaseLayout({ title: data.subject, bodyHtml: inner })

  return {
    subject: data.subject,
    html,
    text: stripTags([preheader ?? '', bodyHtml].filter(Boolean).join('\n')),
  }
}
