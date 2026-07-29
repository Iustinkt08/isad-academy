import type { CollectionAfterChangeHook } from 'payload'

import type { Order } from '../../../payload-types'
import { maskEmail } from '../../checkout/maskEmail'
import { extractRelationshipId } from '../../seats'
import { getMailer } from '../index'
import { renderOrderReceivedEmail } from '../templates/orderReceived'

const PENDING = 'pending'

/**
 * `orders` `afterChange` hook — sends the "order received, awaiting payment" email
 * (client-supplied template, owner 2026-07-30).
 *
 * Fires ONLY on create-with-pending:
 *
 *   - create + pending  => send the receipt once.
 *   - create + confirmed/failed (a provider that settles synchronously, e.g. MockProvider)
 *     => no-op, because the buyer would otherwise get a "pending" receipt moments before
 *     the confirmation email contradicts it.
 *   - any update (pending -> confirmed, resaves, refunds) => no-op. The confirmation email
 *     is `sendOrderConfirmationEmail`'s job.
 *
 * Consumes no seats and touches no accounting. Like its sibling hook it NEVER throws:
 * every branch that can fail is wrapped so a Brevo outage cannot roll back a created order
 * (CLAUDE.md §7/§15 — "email failure never breaks the request").
 */
export const sendOrderReceivedEmail: CollectionAfterChangeHook<Order> = async ({
  doc,
  operation,
  req,
}) => {
  if (operation !== 'create') return doc
  if (doc?.paymentStatus !== PENDING) return doc

  try {
    const buyerEmail: string | undefined = doc?.buyer?.email
    if (!buyerEmail) {
      req.payload.logger.warn(
        `[email] order ${doc?.id} created but has no buyer.email — skipping receipt email.`,
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
        courseTitle =
          course && typeof course === 'object' && 'title' in course ? String(course.title ?? '') : ''
      }
    }

    const currency = doc?.pricing?.currency || 'EUR'

    const { subject, html, text } = renderOrderReceivedEmail({
      orderId: doc.id,
      buyerName: doc?.buyer?.name ?? '',
      courseTitle,
      startDate,
      participants: Array.isArray(doc?.participants) ? doc.participants : [],
      total: Number(doc?.pricing?.total) || 0,
      currency,
    })

    const result = await getMailer().sendTransactional({ to: buyerEmail, subject, html, text })

    if (!result.ok) {
      req.payload.logger.warn(`[email] order ${doc.id} receipt email failed: ${result.error}`)
    } else {
      req.payload.logger.info(
        `[email] order ${doc.id} receipt email sent to ${maskEmail(buyerEmail)}`,
      )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    req.payload.logger.error(
      `[email] order ${doc?.id} receipt email hook threw unexpectedly: ${message}`,
    )
  }

  return doc
}
