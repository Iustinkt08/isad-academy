import { escapeHtml, renderBaseLayout } from './base'
import type { RenderedEmail } from './paymentConfirmation'

/**
 * "Order received" email — client-supplied copy (owner 2026-07-30,
 * "templates isad.academy.pdf", §"Template order receipt").
 *
 * Sent when an order is first recorded and is still awaiting payment confirmation, so it is
 * deliberately explicit that it is NOT an enrolment confirmation (the closing disclaimer is
 * the client's). The confirmation that DOES complete enrolment is
 * `renderPaymentConfirmationEmail` (./paymentConfirmation), sent on the transition into
 * `confirmed`.
 *
 * Note: the client's document repeats the confirmation email's subject line above this
 * template's own ("We've received your ISAD.academy order") — a copy/paste artefact. The
 * subject used here is the one that matches this email's content.
 */
export type OrderReceivedData = {
  orderId: number | string
  buyerName: string
  courseTitle: string
  startDate: string | Date | null | undefined
  /** Delivery format, when known (no such field exists in the schema — CLAUDE.md §4). */
  format?: string | null
  participants: Array<{ name: string; email: string }>
  total: number
  currency: string
  supportEmail?: string
}

const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) return 'to be confirmed'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'to be confirmed'
  return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
}

export const renderOrderReceivedEmail = (data: OrderReceivedData): RenderedEmail => {
  const courseTitle = data.courseTitle || 'your course'
  const startDate = formatDate(data.startDate)
  const participantsList = data.participants.map((p) => p.name).filter(Boolean).join(', ') || '-'
  // Documentul clientului scrie `support@isad.academy`, dar adresa aia nu e sender verificat
  // în Brevo — mapată pe `contact@`, inboxul monitorizat (decizie owner 2026-08-05).
  // ATENȚIE: textele legale (Termeni §retragere/reclamații, Privacy, Cookies) promit în
  // continuare `support@` — dacă adresa nu se creează, acolo rămâne o promisiune neonorată.
  const supportEmail = data.supportEmail || 'contact@isad.academy'

  const subject = 'We’ve received your isad.academy order'
  const preheader = 'Your course order has been recorded and is awaiting payment confirmation.'

  const rows: Array<[string, string]> = [
    ['Course', courseTitle],
    ...((data.format && data.format.trim() ? [['Format', data.format.trim()]] : []) as Array<[string, string]>),
    ['Start date', startDate],
    ['Participant', participantsList],
    ['Order number', String(data.orderId)],
    ['Order total', `${data.total.toFixed(2)} ${data.currency}`],
    ['Payment status', 'Pending confirmation'],
  ]

  const bodyHtml = `
    <h1 style="font-size:20px;margin:0 0 16px;">Order received</h1>
    <p style="margin:0 0 16px;line-height:1.6;">Hi ${escapeHtml(data.buyerName || 'there')},</p>
    <p style="margin:0 0 16px;line-height:1.6;">Thank you for placing an order with isad.academy.</p>
    <p style="margin:0 0 24px;line-height:1.6;">We have received your course registration request. Your order is currently awaiting payment confirmation.</p>

    <h2 style="font-size:16px;margin:0 0 8px;">Order details</h2>
    <table role="presentation" width="100%" style="margin:0 0 24px;font-size:14px;">
      ${rows
        .map(
          ([label, value]) =>
            `<tr><td style="padding:4px 0;color:#666666;">${label}</td><td style="padding:4px 0;text-align:right;">${escapeHtml(
              value,
            )}</td></tr>`,
        )
        .join('')}
    </table>

    <p style="margin:0 0 16px;line-height:1.6;">Your enrolment and course access will be confirmed once the payment has been successfully processed.</p>
    <p style="margin:0 0 16px;line-height:1.6;">After confirmation, you will receive the relevant joining instructions, course materials and preparation details.</p>
    <p style="margin:0 0 16px;line-height:1.6;">No further action is required where payment has already been initiated and confirmed from our side. Processing times may vary depending on the selected payment method.</p>
    <p style="margin:0 0 24px;line-height:1.6;">For questions about your order, contact <a href="mailto:${escapeHtml(
      supportEmail,
    )}" style="color:#1c5d99;">${escapeHtml(supportEmail)}</a> and include your order number.</p>
    <p style="margin:0;line-height:1.6;">Thank you,<br />The isad.academy Team</p>
  `

  const text = [
    'Order received',
    `Hi ${data.buyerName || 'there'},`,
    'Thank you for placing an order with isad.academy.',
    'We have received your course registration request. Your order is currently awaiting payment confirmation.',
    'Order details',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    'Your enrolment and course access will be confirmed once the payment has been successfully processed.',
    'After confirmation, you will receive the relevant joining instructions, course materials and preparation details.',
    'No further action is required where payment has already been initiated and confirmed from our side. Processing times may vary depending on the selected payment method.',
    `For questions about your order, contact ${supportEmail} and include your order number.`,
    'Thank you,',
    'The isad.academy Team',
  ].join('\n\n')

  const html = renderBaseLayout({
    title: subject,
    preheader,
    bodyHtml,
    footerText:
      'This email confirms receipt of your order. It does not constitute confirmation of payment or final enrolment.',
  })

  return { subject, html, text }
}
