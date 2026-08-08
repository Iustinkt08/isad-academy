import { escapeHtml, renderBaseLayout } from './base'
import type { RenderedEmail } from './paymentConfirmation'

/** Display slice of the event the registration belongs to (from the `eventPopup` global —
 * EN locale; emails are single-language like the rest of the transactional set). */
export type EventEmailContext = {
  eventTitle: string
  metaLine?: string | null
}

export type EventRegistrationData = {
  id: number | string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  occupation?: string | null
}

/** Participant-facing confirmation — "you're in, the invite link follows by email". */
export const renderEventRegistrationConfirmation = (
  registration: EventRegistrationData,
  event: EventEmailContext,
): RenderedEmail => {
  const subject = `You're in: ${event.eventTitle}`
  const firstName = registration.firstName?.trim() || 'there'

  const bodyHtml = `
    <h1 style="font-size:20px;margin:0 0 16px;">You're in. See you there.</h1>
    <p style="margin:0 0 12px;font-size:14px;">Hi ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 12px;font-size:14px;">
      Your spot for <strong>${escapeHtml(event.eventTitle)}</strong> is reserved.
      ${event.metaLine ? `<br />${escapeHtml(event.metaLine)}` : ''}
    </p>
    <p style="margin:0;font-size:14px;">The invite link is on its way. We'll send it to this address before the event starts.</p>
  `

  const text = [
    `You're in. See you there.`,
    ``,
    `Hi ${firstName},`,
    `Your spot for ${event.eventTitle} is reserved.`,
    ...(event.metaLine ? [event.metaLine] : []),
    `The invite link is on its way. We'll send it to this address before the event starts.`,
  ].join('\n')

  return { subject, html: renderBaseLayout({ title: subject, bodyHtml }), text }
}

/** Owner-facing notification — mirrors the lead notification's compact row table. */
export const renderEventRegistrationNotification = (
  registration: EventRegistrationData,
  event: EventEmailContext,
): RenderedEmail => {
  const subject = `New event registration: ${registration.firstName?.trim() || 'Visitor'}`

  const allRows: Array<[string, string | null | undefined]> = [
    ['Event', event.eventTitle],
    ['When', event.metaLine],
    ['First name', registration.firstName],
    ['Last name', registration.lastName],
    ['Email', registration.email],
    ['Occupation', registration.occupation],
  ]
  const rows = allRows.filter(
    (row): row is [string, string] => Boolean(row[1] && row[1].trim().length > 0),
  )

  const bodyHtml = `
    <h1 style="font-size:20px;margin:0 0 16px;">New event registration</h1>
    <table role="presentation" width="100%" style="font-size:14px;">
      ${rows
        .map(
          ([label, value]) =>
            `<tr><td style="padding:4px 0;color:#666666;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:4px 0;text-align:right;">${escapeHtml(value)}</td></tr>`,
        )
        .join('')}
    </table>
    <p style="margin:16px 0 0;font-size:12px;color:#999999;">Registration reference: ${escapeHtml(String(registration.id))}</p>
  `

  const text = [
    'New event registration',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    `Registration reference: ${registration.id}`,
  ].join('\n')

  return { subject, html: renderBaseLayout({ title: subject, bodyHtml }), text }
}
