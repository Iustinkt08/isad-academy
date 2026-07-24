import { escapeHtml, renderBaseLayout } from './base'
import type { RenderedEmail } from './paymentConfirmation'

export type LeadMagnetEmailData = {
  /** Title of the article the reader requested the resource from. */
  postTitle: string
  /** Absolute URL of the gated media file. */
  downloadUrl: string
}

/** Lead-magnet delivery email (CLAUDE.md §4 `blogPosts.leadMagnet`): sent to a reader who
 * submitted their email on a gated article. Sends a LINK to the file — no attachment. */
export const renderLeadMagnetEmail = (data: LeadMagnetEmailData): RenderedEmail => {
  const subject = 'Your download from isad.academy'

  const bodyHtml = `
    <h1 style="font-size:20px;margin:0 0 16px;">Here&#39;s your resource</h1>
    <p style="margin:0 0 16px;line-height:1.6;">Thanks for reading &ldquo;${escapeHtml(
      data.postTitle,
    )}&rdquo;. Your download is ready:</p>
    <p style="margin:0 0 16px;"><a href="${escapeHtml(
      data.downloadUrl,
    )}" style="display:inline-block;padding:12px 24px;border-radius:999px;background-color:#1c5d99;color:#ffffff;text-decoration:none;font-weight:600;">Download the resource</a></p>
    <p style="margin:0;line-height:1.6;font-size:13px;color:#22222299;">If the button doesn&#39;t work, copy this link into your browser:<br />${escapeHtml(
      data.downloadUrl,
    )}</p>
  `

  const text = [
    `Thanks for reading "${data.postTitle}". Your download is ready:`,
    data.downloadUrl,
  ].join('\n\n')

  const html = renderBaseLayout({ title: subject, bodyHtml })

  return { subject, html, text }
}
