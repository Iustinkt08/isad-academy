import type { EmailAdapter } from 'payload'

import { getMailer } from './index'

/**
 * Payload email adapter that delegates to the project's own `Mailer` (CLAUDE.md §11/§15 —
 * Brevo when `BREVO_API_KEY` is set, `NoopMailer` otherwise). Without this, Payload has no
 * transport at all and its account emails (admin password reset via `/admin/forgot`, and
 * `/admin/reset/:token`) are only written to the server console — i.e. an admin who forgets
 * their password can never actually receive the link.
 *
 * `getMailer()` is resolved per send, not at init, so flipping `BREVO_API_KEY` takes effect
 * without a restart — same contract as everywhere else in the email module.
 */
export const payloadMailerAdapter: EmailAdapter<{ ok: boolean }> = () => ({
  name: 'isad-mailer',
  defaultFromAddress: process.env.BREVO_SENDER_EMAIL?.trim() || 'no-reply@isad.academy',
  defaultFromName: process.env.BREVO_SENDER_NAME?.trim() || 'isad.academy',
  async sendEmail(message) {
    // Payload's `to` is nodemailer-shaped (string | Address | array); the Mailer takes a
    // plain address list, so flatten whatever arrives into comma-separated addresses.
    const toAddress = (Array.isArray(message.to) ? message.to : [message.to])
      .map((entry) =>
        typeof entry === 'string' ? entry : ((entry as { address?: string })?.address ?? ''),
      )
      .filter(Boolean)
      .join(',')

    if (!toAddress) return { ok: false }

    const html = typeof message.html === 'string' ? message.html : ''
    const text = typeof message.text === 'string' ? message.text : ''

    const mailer = getMailer()
    const result = await mailer.sendTransactional({
      to: toAddress,
      subject: message.subject ?? '',
      html: html || text,
      // Brevo wants a text part; derive one from the HTML when Payload only sends HTML.
      text: text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    })

    // Payload swallows the adapter's return value, so a provider rejection (bad key, IP
    // restriction, unverified sender, quota) would otherwise vanish without a trace and
    // look exactly like a successful send. Log it loudly — same contract as NoopMailer.
    if (!result.ok) {
      console.error(
        `[email] ${mailer.name} REJECTED "${message.subject ?? ''}" to="${toAddress}": ${result.error}`,
      )
    }

    return { ok: result.ok }
  },
})
