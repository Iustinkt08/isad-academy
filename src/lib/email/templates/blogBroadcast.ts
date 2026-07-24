import { escapeHtml, renderBaseLayout } from './base'
import type { RenderedEmail } from './paymentConfirmation'

export type BlogBroadcastData = { title: string; excerpt: string; url: string }

/** "New blog post" newsletter broadcast content (CLAUDE.md §10-11 — broadcast on first
 * publish). Kept separate from `Mailer.broadcastNewPost`'s HTTP mechanics (`../brevo.ts`)
 * so the copy/markup can change without touching the campaign-create/send calls. */
export const renderBlogBroadcastEmail = (data: BlogBroadcastData): RenderedEmail => {
  const subject = `New on the blog: ${data.title}`

  const bodyHtml = `
    <h1 style="font-size:20px;margin:0 0 16px;">${escapeHtml(data.title)}</h1>
    ${data.excerpt ? `<p style="margin:0 0 16px;line-height:1.6;">${escapeHtml(data.excerpt)}</p>` : ''}
    <p style="margin:0;"><a href="${escapeHtml(data.url)}" style="display:inline-block;padding:12px 24px;border-radius:999px;background-color:#1c5d99;color:#ffffff;text-decoration:none;font-weight:600;">Read the article</a></p>
  `

  const text = [data.title, data.excerpt, data.url].filter((line) => Boolean(line && line.trim())).join('\n\n')

  const html = renderBaseLayout({ title: subject, bodyHtml })

  return { subject, html, text }
}
