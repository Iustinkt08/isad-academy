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
    // Titlul vine de pe pop-up-ul ÎNSCRIERII, nu dintr-un global. Înainte exista un singur
    // eveniment odată; acum coexistă mai multe, iar un global ar fi trimis tuturor numele
    // ultimului configurat (retragerea mecanismului vechi, 2026-08-07).
    const popupId = typeof doc.popup === 'object' ? doc.popup?.id : doc.popup
    const [popup, siteSettings] = await Promise.all([
      popupId
        ? req.payload
            .findByID({ collection: 'eventPopups', id: popupId, overrideAccess: true, depth: 0 })
            .catch(() => null)
        : Promise.resolve(null),
      req.payload.findGlobal({ slug: 'siteSettings', overrideAccess: true }).catch(() => null),
    ])

    const event: EventEmailContext = {
      eventTitle:
        `${popup?.titlePlain ?? ''}${popup?.titleGradient ?? ''}`.trim() || 'our live event',
      metaLine: popup?.metaLine ?? undefined,
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
    const notified = await mailer.sendTransactional({
      to: notifyEmail,
      ...notification,
      sender: 'notification',
    })
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
