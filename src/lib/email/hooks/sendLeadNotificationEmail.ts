import type { CollectionAfterChangeHook } from 'payload'

import type { Lead } from '../../../payload-types'
import { getMailer } from '../index'
import { renderLeadNotificationEmail } from '../templates/leadNotification'

/**
 * `leads` `afterChange` hook — single-destination notification email on every NEW lead
 * (CLAUDE.md §4 `leads`, §6, §11: "one destination email for everything"). Only fires on
 * `operation === 'create'` — an admin editing/reviewing an existing lead in the dashboard
 * afterwards must never re-notify.
 *
 * The destination is `siteSettings.contact.email` (CLAUDE.md §13 — legal entity/contact are
 * config, not hardcoded): when unset, this logs a warning and skips gracefully rather than
 * failing the lead submission — a visitor's contact/corporate form must always succeed even
 * if nobody has configured a notification address yet.
 *
 * CLAUDE.md §7/§15: wrapped so an email failure (or an unexpected error anywhere in this
 * hook) never breaks the request — the lead is already persisted by the time `afterChange`
 * runs; this hook only ever logs, never throws.
 */
export const sendLeadNotificationEmail: CollectionAfterChangeHook<Lead> = async ({ doc, operation, req }) => {
  if (operation !== 'create') return doc

  try {
    const siteSettings = await req.payload
      .findGlobal({ slug: 'siteSettings', overrideAccess: true })
      .catch(() => null)
    const notifyEmail = siteSettings?.contact?.email

    if (!notifyEmail) {
      req.payload.logger.warn(
        `[email] lead ${doc?.id} created but siteSettings.contact.email is unset — skipping notification.`,
      )
      return doc
    }

    const { subject, html, text } = renderLeadNotificationEmail(doc)

    const result = await getMailer().sendTransactional({ to: notifyEmail, subject, html, text })

    if (!result.ok) {
      req.payload.logger.warn(`[email] lead ${doc.id} notification failed: ${result.error}`)
    } else {
      req.payload.logger.info(`[email] lead ${doc.id} notification sent to ${notifyEmail}`)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    req.payload.logger.error(`[email] lead ${doc?.id} notification hook threw unexpectedly: ${message}`)
  }

  return doc
}
