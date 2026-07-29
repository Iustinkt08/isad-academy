import { renderBaseLayout } from './base'
import type { RenderedEmail } from './paymentConfirmation'

/**
 * "You're subscribed" welcome email — client-supplied copy (owner 2026-07-30,
 * "templates isad.academy.pdf", §"Template abonare newsletter").
 *
 * Sent AFTER the double opt-in click, not on form submit: the visitor only becomes a
 * subscribed contact once they follow the link in Brevo's DOI email
 * (`BrevoMailer.subscribeDoubleOptIn`, src/lib/email/brevo.ts). Hence the copy states the
 * subscription "has been confirmed" in the past tense.
 *
 * Brand note: the client's document writes "ISAD.academy"; CLAUDE.md §12 mandates the
 * lowercase wordmark "isad.academy" everywhere, so the copy is reproduced with that casing.
 */
export const renderNewsletterWelcomeEmail = (): RenderedEmail => {
  const subject = 'You’re subscribed to isad.academy'
  const preheader = 'Thank you for joining the isad.academy community!'

  const paragraphs = [
    'Your subscription to isad.academy has been confirmed.',
    'You will now receive updates about AI readiness, AI audits, corporate training programmes, executive workshops, new courses and practical learning resources.',
    'We look forward to supporting your goals and witnessing your professional growth!',
    'Let the learning journey begin!',
  ]

  const bodyHtml = `
    <h1 style="font-size:20px;margin:0 0 16px;">Thank you for subscribing</h1>
    ${paragraphs.map((p) => `<p style="margin:0 0 16px;line-height:1.6;">${p}</p>`).join('')}
    <p style="margin:0;line-height:1.6;">Welcome aboard,<br />The isad.academy Team</p>
  `

  const text = [
    'Thank you for subscribing',
    ...paragraphs,
    'Welcome aboard,',
    'The isad.academy Team',
  ].join('\n\n')

  const html = renderBaseLayout({
    title: subject,
    preheader,
    bodyHtml,
    footerText:
      'You are receiving this email because you subscribed to updates from isad.academy. You can unsubscribe at any time using the link included in our emails.',
  })

  return { subject, html, text }
}
