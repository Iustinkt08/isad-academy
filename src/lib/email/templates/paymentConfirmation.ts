import { escapeHtml, renderBaseLayout } from './base'

export type RenderedEmail = { subject: string; html: string; text: string }

export type PaymentConfirmationParticipant = { name: string; email: string }

export type PaymentConfirmationData = {
  orderId: number | string
  buyerName: string
  courseTitle: string
  startDate: string | Date | null | undefined
  quantity: number
  participants: PaymentConfirmationParticipant[]
  total: number
  currency: string
}

const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) return 'to be confirmed'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'to be confirmed'
  return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
}

/**
 * Order-confirmation email (CLAUDE.md §6 checkout/confirmation, §10-11): course, edition
 * date, quantity, participants, pricing total — real EN copy, no invoice content (§14 is a
 * separate track; invoicing/e-Factura is explicitly out of scope here).
 */
export const renderPaymentConfirmationEmail = (data: PaymentConfirmationData): RenderedEmail => {
  const courseTitle = data.courseTitle || 'your course'
  const startDate = formatDate(data.startDate)
  const participantsList = data.participants.map((p) => `${p.name} <${p.email}>`).join(', ') || '—'
  const seatsWord = data.quantity === 1 ? 'seat is' : 'seats are'

  const subject = `Your enrolment is confirmed — ${courseTitle}`

  const bodyHtml = `
    <h1 style="font-size:20px;margin:0 0 16px;">Enrolment confirmed</h1>
    <p style="margin:0 0 16px;line-height:1.6;">Hi ${escapeHtml(data.buyerName || 'there')},</p>
    <p style="margin:0 0 16px;line-height:1.6;">Thank you — your payment is confirmed and your ${seatsWord} reserved.</p>
    <table role="presentation" width="100%" style="margin:0 0 16px;font-size:14px;">
      <tr><td style="padding:4px 0;color:#666666;">Course</td><td style="padding:4px 0;text-align:right;">${escapeHtml(courseTitle)}</td></tr>
      <tr><td style="padding:4px 0;color:#666666;">Edition date</td><td style="padding:4px 0;text-align:right;">${escapeHtml(startDate)}</td></tr>
      <tr><td style="padding:4px 0;color:#666666;">Seats</td><td style="padding:4px 0;text-align:right;">${data.quantity}</td></tr>
      <tr><td style="padding:4px 0;color:#666666;">Participants</td><td style="padding:4px 0;text-align:right;">${escapeHtml(participantsList)}</td></tr>
      <tr><td style="padding:8px 0;color:#666666;font-weight:700;">Total paid</td><td style="padding:8px 0;text-align:right;font-weight:700;">${data.total.toFixed(2)} ${escapeHtml(data.currency)}</td></tr>
    </table>
    <p style="margin:0 0 8px;line-height:1.6;">A Google Meet invite will follow closer to the start date.</p>
    <p style="margin:0;font-size:12px;color:#999999;">Order reference: ${escapeHtml(String(data.orderId))}</p>
  `

  const text = [
    'Enrolment confirmed',
    `Hi ${data.buyerName || 'there'},`,
    `Thank you — your payment is confirmed and your ${seatsWord} reserved.`,
    `Course: ${courseTitle}`,
    `Edition date: ${startDate}`,
    `Seats: ${data.quantity}`,
    `Participants: ${participantsList}`,
    `Total paid: ${data.total.toFixed(2)} ${data.currency}`,
    'A Google Meet invite will follow closer to the start date.',
    `Order reference: ${data.orderId}`,
  ].join('\n')

  const html = renderBaseLayout({ title: subject, bodyHtml })

  return { subject, html, text }
}
