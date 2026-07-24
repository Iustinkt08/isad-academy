import { escapeHtml, renderBaseLayout } from './base'

export type RenderedEmail = { subject: string; html: string; text: string }

export type ReviewRequestData = {
  participantName: string
  courseTitle: string
  editionDate: string | Date | null | undefined
  reviewUrl: string
}

const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) return 'your recent edition'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'your recent edition'
  return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
}

/**
 * Post-session review-request email (CLAUDE.md §10, T13) — sent once per participant, once
 * per edition, by the daily `sendReviewRequests` job. The link embeds an HMAC-signed,
 * account-free token (`./../../reviews/token`) that authorizes exactly one review submission
 * for this (session, participant email) pair.
 */
export const renderReviewRequestEmail = (data: ReviewRequestData): RenderedEmail => {
  const courseTitle = data.courseTitle || 'your course'
  const editionDate = formatDate(data.editionDate)
  const greetingName = data.participantName?.trim() || 'there'

  const subject = `How was ${courseTitle}? Share your review`

  const bodyHtml = `
    <h1 style="font-size:20px;margin:0 0 16px;">How was your course?</h1>
    <p style="margin:0 0 16px;line-height:1.6;">Hi ${escapeHtml(greetingName)},</p>
    <p style="margin:0 0 16px;line-height:1.6;">
      Thanks for attending <strong>${escapeHtml(courseTitle)}</strong> (${escapeHtml(editionDate)}). We would
      love to hear what you thought — it takes less than two minutes and really helps future
      participants decide.
    </p>
    <p style="margin:0 0 24px;">
      <a href="${escapeHtml(data.reviewUrl)}" style="display:inline-block;background-color:#1c5d99;color:#ffffff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;">Share your review</a>
    </p>
    <p style="margin:0;font-size:12px;color:#999999;">
      This link is personal to you and expires in 90 days. If the button above does not work, copy
      and paste this address into your browser: ${escapeHtml(data.reviewUrl)}
    </p>
  `

  const text = [
    'How was your course?',
    `Hi ${greetingName},`,
    `Thanks for attending ${courseTitle} (${editionDate}). We would love to hear what you thought.`,
    `Share your review: ${data.reviewUrl}`,
    'This link is personal to you and expires in 90 days.',
  ].join('\n')

  const html = renderBaseLayout({ title: subject, bodyHtml })

  return { subject, html, text }
}
