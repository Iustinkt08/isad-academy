import type { CollectionAfterChangeHook } from 'payload'

import type { Order } from '../../payload-types'
import { consumeSeats } from './consumeSeats'
import { extractRelationshipId } from './extractRelationshipId'

const CONFIRMED = 'confirmed'

/**
 * `orders` `afterChange` hook — the ONLY place seats are ever consumed/released
 * (CLAUDE.md §3.4, §8). Acts strictly on the TRANSITION between `previousDoc.paymentStatus`
 * and the just-saved `doc.paymentStatus`, never on the status value alone, so the hook is
 * idempotent under repeated writes:
 *
 *   - not-confirmed -> confirmed  => consume `quantity` seats (covers pending/failed/
 *     refunded -> confirmed, AND a brand-new order created directly with
 *     `paymentStatus: 'confirmed'` — Payload's `create` operation passes `previousDoc: {}`,
 *     so `previousDoc.paymentStatus` is `undefined`, which already satisfies
 *     "not confirmed").
 *   - confirmed -> not-confirmed  => release `quantity` seats. CLAUDE.md §4/§8 only names
 *     "refunded" explicitly, but this releases on ANY exit from `confirmed` (refunded,
 *     failed, or an admin manually resetting to pending) — a confirmed order no longer
 *     holding a seat must always give it back, regardless of which status it lands on
 *     next, or the seat leaks permanently.
 *   - confirmed -> confirmed (a same-status resave) => no-op.
 *   - anything -> anything that isn't a crossing of the `confirmed` boundary => no-op.
 *
 * Release uses `previousDoc`'s `session`/`quantity` (what was ACTUALLY consumed when the
 * order first became confirmed), not the new doc's — defensive in the hypothetical edge
 * case where an admin edits `quantity`/`session` in the same write that also changes
 * `paymentStatus` away from `confirmed`.
 *
 * Must be awaited (it is — Payload's `create`/`updateByID` operations run collection
 * `afterChange` hooks in a sequential, awaited `for` loop and only commit the transaction
 * once every hook settles): an unawaited hook here would let Payload commit the order's
 * status change even though the seat guard hadn't run yet, which is exactly the
 * false-success-on-rollback failure mode docs/PLAN.md warns about.
 */
export const consumeSeatsOnConfirm: CollectionAfterChangeHook<Order> = async ({ doc, previousDoc, req }) => {
  const payload = req.payload
  const prevStatus = previousDoc?.paymentStatus
  const nextStatus = doc?.paymentStatus

  const enteringConfirmed = nextStatus === CONFIRMED && prevStatus !== CONFIRMED
  const exitingConfirmed = prevStatus === CONFIRMED && nextStatus !== CONFIRMED

  if (enteringConfirmed) {
    const sessionId = extractRelationshipId(doc.session)
    if (sessionId != null) {
      await consumeSeats({
        payload,
        req,
        sessionId,
        quantity: Number(doc.quantity) || 0,
        direction: 'consume',
      })
    }
  } else if (exitingConfirmed) {
    const sessionId = extractRelationshipId(previousDoc.session)
    if (sessionId != null) {
      await consumeSeats({
        payload,
        req,
        sessionId,
        quantity: Number(previousDoc.quantity) || 0,
        direction: 'release',
      })
    }
  }

  return doc
}
