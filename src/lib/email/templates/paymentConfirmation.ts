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
  /** Fields below have no schema counterpart for every order (CLAUDE.md §4) — each is
   * omitted from the details table when absent rather than shown as an empty placeholder. */
  format?: string | null
  time?: string | null
  duration?: string | null
  paymentMethod?: string | null
  /** Absolute URL for the optional "Access your course" button. */
  courseUrl?: string | null
  supportEmail?: string
}

const BLUE = '#1c5d99'

const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) return 'to be confirmed'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'to be confirmed'
  return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
}

/**
 * Order-confirmation email — client-supplied copy (owner 2026-07-30,
 * "templates isad.academy.pdf", §"Template order confirmed after payment"). Sent on the
 * transition into `confirmed` (src/lib/email/hooks/sendOrderConfirmationEmail.ts).
 *
 * Carries no invoice content — invoicing/e-Factura is a separate track (CLAUDE.md §14).
 * The companion email for orders still awaiting payment is `renderOrderReceivedEmail`
 * (./orderReceived).
 */
export const renderPaymentConfirmationEmail = (data: PaymentConfirmationData): RenderedEmail => {
  const courseTitle = data.courseTitle || 'your course'
  const startDate = formatDate(data.startDate)
  const participantsList = data.participants.map((p) => p.name).filter(Boolean).join(', ') || '—'
  // Vezi nota din ./orderReceived — `support@` din documentul clientului e mapat pe
  // `contact@`, singurul inbox monitorizat și sender verificat (owner 2026-08-05).
  const supportEmail = data.supportEmail || 'contact@isad.academy'

  const subject = 'Your isad.academy course order is confirmed'
  const preheader = 'Payment received. Your enrolment is now confirmed.'

  const optional = (label: string, value: string | null | undefined): Array<[string, string]> =>
    value && String(value).trim() ? [[label, String(value).trim()]] : []

  const rows: Array<[string, string]> = [
    ['Course', courseTitle],
    ...optional('Format', data.format),
    ['Start date', startDate],
    ...optional('Time', data.time),
    ...optional('Duration', data.duration),
    ['Participant', participantsList],
    // Group orders buy several named seats — worth stating explicitly, single seats aren't.
    ...(data.quantity > 1 ? ([['Seats', String(data.quantity)]] as Array<[string, string]>) : []),
    ['Order number', String(data.orderId)],
    ['Amount paid', `${data.total.toFixed(2)} ${data.currency}`],
    ...optional('Payment method', data.paymentMethod),
    ['Payment status', 'Paid'],
  ]

  const courseUrl = data.courseUrl?.trim()

  const bodyHtml = `
    <h1 style="font-size:20px;margin:0 0 16px;">Order confirmed</h1>
    <p style="margin:0 0 16px;line-height:1.6;">Hi ${escapeHtml(data.buyerName || 'there')},</p>
    <p style="margin:0 0 16px;line-height:1.6;">Thank you for your purchase from isad.academy.</p>
    <p style="margin:0 0 24px;line-height:1.6;">We have received your payment, and your enrolment is now confirmed.</p>

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

    <p style="margin:0 0 16px;line-height:1.6;">You will receive the course access details, joining instructions, learning materials and any preparation requirements before the training begins.</p>
    <p style="margin:0 0 16px;line-height:1.6;">For self-paced courses, access may be provided immediately or in a separate email.</p>
    <p style="margin:0 0 16px;line-height:1.6;">Please keep this confirmation for your records.</p>
    <p style="margin:0 0 24px;line-height:1.6;">For questions about your order, contact <a href="mailto:${escapeHtml(
      supportEmail,
    )}" style="color:${BLUE};">${escapeHtml(supportEmail)}</a> and include your order number.</p>
    ${
      courseUrl
        ? `<p style="margin:0 0 24px;"><a href="${escapeHtml(
            courseUrl,
          )}" style="display:inline-block;background-color:${BLUE};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:15px;font-weight:600;">Access your course</a></p>`
        : ''
    }
    <p style="margin:0;line-height:1.6;">Welcome aboard,<br />The isad.academy Team</p>
  `

  const text = [
    'Order confirmed',
    `Hi ${data.buyerName || 'there'},`,
    'Thank you for your purchase from isad.academy.',
    'We have received your payment, and your enrolment is now confirmed.',
    'Order details',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    'You will receive the course access details, joining instructions, learning materials and any preparation requirements before the training begins.',
    'For self-paced courses, access may be provided immediately or in a separate email.',
    'Please keep this confirmation for your records.',
    `For questions about your order, contact ${supportEmail} and include your order number.`,
    ...(courseUrl ? [`Access your course: ${courseUrl}`] : []),
    'Welcome aboard,',
    'The isad.academy Team',
  ].join('\n\n')

  const html = renderBaseLayout({
    title: subject,
    preheader,
    bodyHtml,
    footerText:
      'This email confirms that your payment has been received and your enrolment has been completed.',
  })

  return { subject, html, text }
}
