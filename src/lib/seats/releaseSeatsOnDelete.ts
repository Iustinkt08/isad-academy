import type { CollectionAfterDeleteHook } from 'payload'

import type { Order } from '../../payload-types'
import { consumeSeats } from './consumeSeats'
import { extractRelationshipId } from './extractRelationshipId'

/**
 * `orders` `afterDelete` hook — an admin deleting a still-`confirmed` order must release
 * its seat(s), or the session is permanently oversold-looking (`seatsSold` keeps counting
 * a seat with no order behind it). No-op for any order that wasn't `confirmed` at the time
 * of deletion (its seats were never consumed, or were already released on a prior status
 * change out of `confirmed`).
 */
export const releaseSeatsOnDelete: CollectionAfterDeleteHook<Order> = async ({ doc, req }) => {
  if (doc?.paymentStatus !== 'confirmed') return doc

  const sessionId = extractRelationshipId(doc.session)
  if (sessionId == null) return doc

  await consumeSeats({
    payload: req.payload,
    req,
    sessionId,
    quantity: Number(doc.quantity) || 0,
    direction: 'release',
  })

  return doc
}
