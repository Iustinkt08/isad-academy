import type { CollectionAfterChangeHook } from 'payload'

import type { EventRegistration } from '../../../payload-types'
import { getMailer } from '../index'
import {
  renderEventRegistrationConfirmation,
  renderEventRegistrationNotification,
  type EventEmailContext,
} from '../templates/eventRegistration'

/**
 * `eventRegistrations` `afterChange` hook — two emails on every NEW registration:
 *   1. participant confirmation ("you're in — invite link on its way"), and
 *   2. the single-destination owner notification (`siteSettings.contact.email`, same
 *      channel as leads; skipped gracefully when unset).
 * Fires on `operation === 'create'` only. CLAUDE.md §7/§15: the registration is already
 * persisted by the time this runs — the hook only ever logs, never throws, so an email
 * provider outage can never fail a visitor's sign-up.
 */
export const sendEventRegistrationEmails: CollectionAfterChangeHook<EventRegistration> = async ({
  doc,
  operation,
  req,
}) => {
  if (operation !== 'create') return doc

  try {
    const [eventPopup, siteSettings] = await Promise.all([
      req.payload.findGlobal({ slug: 'eventPopup', overrideAccess: true }).catch(() => null),
      req.payload.findGlobal({ slug: 'siteSettings', overrideAccess: true }).catch(() => null),
    ])

    const event: EventEmailContext = {
      eventTitle:
        `${eventPopup?.titlePlain ?? ''}${eventPopup?.titleGradient ?? ''}`.trim() || 'our live event',
      metaLine: eventPopup?.metaLine,
    }
    const mailer = getMailer()

    if (doc.email) {
      const confirmation = renderEventRegistrationConfirmation(doc, event)
      const sent = await mailer.sendTransactional({ to: doc.email, ...confirmation })
      if (!sent.ok) {
        req.payload.logger.warn(
          `[email] event registration ${doc.id} participant confirmation failed: ${sent.error}`,
        )
      } else {
        req.payload.logger.info(`[email] event registration ${doc.id} confirmation sent`)
      }
    }

    const notifyEmail = siteSettings?.contact?.email
    if (!notifyEmail) {
      req.payload.logger.warn(
        `[email] event registration ${doc.id} created but siteSettings.contact.email is unset — skipping owner notification.`,
      )
      return doc
    }

    const notification = renderEventRegistrationNotification(doc, event)
    const notified = await mailer.sendTransactional({ to: notifyEmail, ...notification })
    if (!notified.ok) {
      req.payload.logger.warn(
        `[email] event registration ${doc.id} owner notification failed: ${notified.error}`,
      )
    } else {
      req.payload.logger.info(
        `[email] event registration ${doc.id} owner notification sent to ${notifyEmail}`,
      )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    req.payload.logger.error(
      `[email] event registration ${doc?.id} email hook threw unexpectedly: ${message}`,
    )
  }

  return doc
}
