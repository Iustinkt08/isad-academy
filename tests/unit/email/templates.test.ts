import { describe, expect, it } from 'vitest'

import { renderCourseAnnouncementEmail } from '../../../src/lib/email/templates/courseAnnouncement'
import { renderNewsletterWelcomeEmail } from '../../../src/lib/email/templates/newsletterWelcome'
import { renderOrderReceivedEmail } from '../../../src/lib/email/templates/orderReceived'
import { renderPaymentConfirmationEmail } from '../../../src/lib/email/templates/paymentConfirmation'

/**
 * The four client-supplied e-mail templates (owner 2026-07-30, "templates isad.academy.pdf").
 * These assert the things that actually break silently: the exact subject/preheader the
 * client signed off on, that unset optional rows are OMITTED rather than sent as "[Format]"
 * placeholders, and that interpolated values are HTML-escaped.
 */

const ORDER_BASE = {
  orderId: 4211,
  buyerName: 'Jane Buyer',
  courseTitle: 'ISO/IEC 42001 Lead Implementer',
  startDate: '2026-09-14T09:00:00.000Z',
  participants: [{ name: 'Jane Buyer', email: 'jane@example.com' }],
  total: 1200,
  currency: 'EUR',
}

describe('newsletter welcome', () => {
  const mail = renderNewsletterWelcomeEmail()

  it('uses the approved subject and hides the preheader in the body', () => {
    expect(mail.subject).toBe('You’re subscribed to isad.academy')
    expect(mail.html).toContain('Thank you for joining the isad.academy community!')
    // Preheader must be inbox-preview only, never visible in the rendered message.
    expect(mail.html).toContain('display:none')
  })

  it('carries the unsubscribe notice required of a marketing e-mail', () => {
    expect(mail.html).toContain('You are receiving this email because you subscribed')
    expect(mail.html).toContain('unsubscribe at any time')
  })

  it('renders the brand wordmark in lowercase everywhere (CLAUDE.md §12)', () => {
    expect(mail.text).not.toContain('ISAD.academy')
    expect(mail.text).toContain('isad.academy')
  })
})

describe('order received (awaiting payment)', () => {
  const mail = renderOrderReceivedEmail(ORDER_BASE)

  it('is explicit that it is not an enrolment confirmation', () => {
    expect(mail.subject).toBe('We’ve received your isad.academy order')
    expect(mail.html).toContain('awaiting payment confirmation')
    expect(mail.html).toContain('does not constitute confirmation of payment or final enrolment')
  })

  it('reports the pending payment status and the order number', () => {
    expect(mail.text).toContain('Payment status: Pending confirmation')
    expect(mail.text).toContain('Order number: 4211')
    expect(mail.text).toContain('Order total: 1200.00 EUR')
  })

  it('omits Format entirely when the caller has no value for it', () => {
    expect(mail.text).not.toContain('Format')
    expect(mail.html).not.toContain('[Format]')

    const withFormat = renderOrderReceivedEmail({ ...ORDER_BASE, format: 'Live virtual' })
    expect(withFormat.text).toContain('Format: Live virtual')
  })

  it('escapes HTML in interpolated values', () => {
    const nasty = renderOrderReceivedEmail({ ...ORDER_BASE, buyerName: '<script>x</script>' })
    expect(nasty.html).not.toContain('<script>')
    expect(nasty.html).toContain('&lt;script&gt;')
  })
})

describe('order confirmed (after payment)', () => {
  const mail = renderPaymentConfirmationEmail({ ...ORDER_BASE, quantity: 1 })

  it('uses the approved subject and confirms payment', () => {
    expect(mail.subject).toBe('Your isad.academy course order is confirmed')
    expect(mail.html).toContain('Payment received. Your enrolment is now confirmed.')
    expect(mail.text).toContain('Payment status: Paid')
    expect(mail.text).toContain('Amount paid: 1200.00 EUR')
  })

  it('omits the optional rows and the CTA button when nothing is supplied', () => {
    expect(mail.text).not.toContain('Payment method')
    expect(mail.text).not.toContain('Duration')
    expect(mail.html).not.toContain('Access your course')
  })

  it('renders the optional rows and CTA when they are supplied', () => {
    const full = renderPaymentConfirmationEmail({
      ...ORDER_BASE,
      quantity: 3,
      format: 'Live virtual',
      time: '09:00–17:00 (EEST)',
      duration: '21 hours',
      paymentMethod: 'Card',
      courseUrl: 'https://isad.academy/cursuri/lead-implementer',
    })

    expect(full.text).toContain('Format: Live virtual')
    expect(full.text).toContain('Time: 09:00–17:00 (EEST)')
    expect(full.text).toContain('Payment method: Card')
    // Seats only appear for group orders, where the count is meaningful.
    expect(full.text).toContain('Seats: 3')
    expect(full.html).toContain('Access your course')
    expect(full.html).toContain('https://isad.academy/cursuri/lead-implementer')
  })
})

describe('course launch newsletter', () => {
  const mail = renderCourseAnnouncementEmail({
    courseName: 'AI Governance & Responsible AI',
    courseUrl: 'https://isad.academy/cursuri/ai-governance-responsible-ai',
  })

  it('defaults to the "Introducing" subject line and keeps the CTA', () => {
    expect(mail.subject).toBe('Introducing AI Governance & Responsible AI')
    expect(mail.html).toContain('View programme details')
    expect(mail.html).toContain('https://isad.academy/cursuri/ai-governance-responsible-ai')
  })

  it('offers the client’s other two subject-line options', () => {
    expect(
      renderCourseAnnouncementEmail({
        courseName: 'X',
        courseUrl: 'https://x.test',
        subjectVariant: 'newProgramme',
      }).subject,
    ).toBe('New executive programme from isad.academy')

    expect(
      renderCourseAnnouncementEmail({
        courseName: 'X',
        courseUrl: 'https://x.test',
        subjectVariant: 'enrolmentOpen',
      }).subject,
    ).toBe('Enrolment now open: X')
  })

  it('keeps the full programme-focus list', () => {
    expect(mail.text).toContain('organisational AI readiness;')
    expect(mail.text).toContain('practical implementation planning.')
  })

  it('never emits an empty placeholder row for missing course information', () => {
    for (const label of ['Format', 'Date', 'Duration', 'Language', 'Fee', 'Certification']) {
      expect(mail.text).not.toContain(`${label}:`)
    }

    const full = renderCourseAnnouncementEmail({
      courseName: 'AI Governance',
      courseUrl: 'https://x.test',
      format: 'Live online',
      date: '14 September 2026',
      duration: '21 hours',
      language: 'English',
      fee: '€1,200',
      certification: 'PECB certificate',
    })
    expect(full.text).toContain('Language: English')
    expect(full.text).toContain('Fee: €1,200')
  })

  it('escapes the course name', () => {
    const nasty = renderCourseAnnouncementEmail({
      courseName: '<b>bold</b>',
      courseUrl: 'https://x.test',
    })
    expect(nasty.html).not.toContain('<b>bold</b>')
    expect(nasty.html).toContain('&lt;b&gt;bold&lt;/b&gt;')
  })
})
