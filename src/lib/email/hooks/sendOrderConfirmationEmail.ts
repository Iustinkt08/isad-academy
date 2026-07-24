import type { CollectionAfterChangeHook } from 'payload'

import type { Order } from '../../../payload-types'
import { maskEmail } from '../../checkout/maskEmail'
import { extractRelationshipId } from '../../seats'
import { getMailer } from '../index'
import { renderPaymentConfirmationEmail } from '../templates/paymentConfirmation'

const CONFIRMED = 'confirmed'

/**
 * `orders` `afterChange` hook — sends the payment-confirmation transactional email
 * (CLAUDE.md §6, §10-11). Added ALONGSIDE `consumeSeatsOnConfirm` (T5,
 * `src/lib/seats/consumeSeatsOnConfirm.ts`) — that file's seat-consumption logic is
 * untouched; this hook only reuses its documented TRANSITION-detection shape (not-confirmed
 * -> confirmed), independently, so an email failure can never affect seat accounting:
 *
 *   - not-confirmed -> confirmed  => send the confirmation email once.
 *   - confirmed -> confirmed (a same-status resave)  => no-op (exactly once).
 *   - any other transition (pending, failed, refunded, confirmed -> refunded, etc.) => no-op.
 *
 * CLAUDE.md §7/§15 — "email failure never breaks the request": every branch that can throw
 * (the nested `findByID` for the session/course title, template rendering, the mailer call
 * itself — even though `Mailer` methods already never throw) is wrapped in a try/catch that
 * only logs. This hook NEVER throws and NEVER re-raises, so a Brevo outage can never roll
 * back an otherwise-successful order confirmation (and, by extension, seat consumption).
 */
export const sendOrderConfirmationEmail: CollectionAfterChangeHook<Order> = async ({ doc, previousDoc, req }) => {
  const prevStatus = previousDoc?.paymentStatus
  const nextStatus = doc?.paymentStatus
  const enteringConfirmed = nextStatus === CONFIRMED && prevStatus !== CONFIRMED

  if (!enteringConfirmed) return doc

  try {
    const buyerEmail: string | undefined = doc?.buyer?.email
    if (!buyerEmail) {
      req.payload.logger.warn(
        `[email] order ${doc?.id} confirmed but has no buyer.email — skipping confirmation email.`,
      )
      return doc
    }

    let courseTitle = ''
    let startDate: string | null = null

    const sessionId = extractRelationshipId(doc.session)
    if (sessionId != null) {
      const session = await req.payload
        .findByID({ collection: 'courseSessions', id: sessionId, depth: 1, overrideAccess: true })
        .catch(() => null)

      if (session) {
        startDate = session.startDate ?? null
        const course = session.course
        courseTitle = course && typeof course === 'object' && 'title' in course ? String(course.title ?? '') : ''
      }
    }

    let currency = 'EUR'
    const siteSettings = await req.payload
      .findGlobal({ slug: 'siteSettings', overrideAccess: true })
      .catch(() => null)
    if (siteSettings?.currency) currency = siteSettings.currency

    const { subject, html, text } = renderPaymentConfirmationEmail({
      orderId: doc.id,
      buyerName: doc?.buyer?.name ?? '',
      courseTitle,
      startDate,
      quantity: Number(doc?.quantity) || 0,
      participants: Array.isArray(doc?.participants) ? doc.participants : [],
      total: Number(doc?.pricing?.total) || 0,
      currency,
    })

    const result = await getMailer().sendTransactional({ to: buyerEmail, subject, html, text })

    if (!result.ok) {
      req.payload.logger.warn(`[email] order ${doc.id} confirmation email failed: ${result.error}`)
    } else {
      req.payload.logger.info(`[email] order ${doc.id} confirmation email sent to ${maskEmail(buyerEmail)}`)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    req.payload.logger.error(`[email] order ${doc?.id} confirmation email hook threw unexpectedly: ${message}`)
  }

  return doc
}
