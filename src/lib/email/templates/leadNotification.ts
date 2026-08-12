import { escapeHtml, renderBaseLayout } from './base'
import type { RenderedEmail } from './paymentConfirmation'

export type LeadNotificationData = {
  id: number | string
  type: 'contact' | 'corporate' | string
  name?: string | null
  email?: string | null
  phone?: string | null
  message?: string | null
  subject?: string | null
  companyName?: string | null
  contactPerson?: string | null
  participantsRange?: string | null
  topicOther?: string | null
  /** Either a raw relationship id or a populated `courses` doc (depth-dependent). */
  topicCourse?: unknown
  preferredPeriod?: { from?: string | null; to?: string | null } | null
  /** Dynamic corporate form answers (owner 2026-08-12) — label/value, in form order. */
  formData?: Array<{ label?: string | null; value?: string | null }> | null
}

const courseTitleOf = (topicCourse: unknown): string | null => {
  if (topicCourse && typeof topicCourse === 'object' && 'title' in topicCourse) {
    const title = (topicCourse as { title?: unknown }).title
    return typeof title === 'string' ? title : null
  }
  return null
}

/** Subject line keeps PII minimal — first name only (or a generic fallback), never the
 * full email address. */
const firstNameOf = (name?: string | null): string => {
  const trimmed = name?.trim()
  return trimmed?.split(/\s+/)[0] || 'New lead'
}

/**
 * Contact/Corporate lead notification (CLAUDE.md §4 `leads`, §6, §11 — single destination
 * email, `siteSettings.contact.email`). Renders every populated field; omits empty ones
 * rather than showing "—" for a dozen unused corporate-only fields on a contact lead.
 */
export const renderLeadNotificationEmail = (lead: LeadNotificationData): RenderedEmail => {
  const typeLabel = lead.type === 'corporate' ? 'Corporate' : 'Contact'
  const subject = `New ${typeLabel} lead: ${firstNameOf(lead.name)}`

  const preferredPeriod =
    lead.preferredPeriod?.from || lead.preferredPeriod?.to
      ? `${lead.preferredPeriod?.from ?? '?'} → ${lead.preferredPeriod?.to ?? '?'}`
      : null

  // Annotated on this intermediate (unfiltered) array only — annotating the final `rows`
  // binding itself would widen its type back to `string | null | undefined` values and
  // defeat the `.filter` type predicate below.
  const allRows: Array<[string, string | null | undefined]> = [
    ['Type', typeLabel],
    ['Name', lead.name],
    ['Email', lead.email],
    ['Phone', lead.phone],
    ['Subject', lead.subject],
    ['Message', lead.message],
    ['Company', lead.companyName],
    ['Contact person', lead.contactPerson],
    ['Participants range', lead.participantsRange],
    ['Topic (course)', courseTitleOf(lead.topicCourse)],
    ['Topic (other)', lead.topicOther],
    ['Preferred period', preferredPeriod],
    // Dynamic form answers, already in form order (label/value written by createLead).
    ...(lead.formData ?? []).map(
      (row): [string, string | null | undefined] => [row.label?.trim() || 'Field', row.value],
    ),
  ]
  const rows = allRows.filter(
    (row): row is [string, string] => Boolean(row[1] && row[1].trim().length > 0),
  )

  const bodyHtml = `
    <h1 style="font-size:20px;margin:0 0 16px;">New ${escapeHtml(typeLabel)} lead</h1>
    <table role="presentation" width="100%" style="font-size:14px;">
      ${rows
        .map(
          ([label, value]) =>
            `<tr><td style="padding:4px 0;color:#666666;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:4px 0;text-align:right;">${escapeHtml(value)}</td></tr>`,
        )
        .join('')}
    </table>
    <p style="margin:16px 0 0;font-size:12px;color:#999999;">Lead reference: ${escapeHtml(String(lead.id))}</p>
  `

  const text = [
    `New ${typeLabel} lead`,
    ...rows.map(([label, value]) => `${label}: ${value}`),
    `Lead reference: ${lead.id}`,
  ].join('\n')

  const html = renderBaseLayout({ title: subject, bodyHtml })

  return { subject, html, text }
}
