import { sql, type SQL } from '@payloadcms/db-postgres/drizzle'
import { APIError, type Payload, type PayloadRequest } from 'payload'

export type SeatDirection = 'consume' | 'release'

export type ConsumeSeatsArgs = {
  /** Number of seats to consume/release. `<= 0` is a no-op (defensive — callers should
   * never construct an order with `quantity <= 0`, but this guards the seat ledger even
   * if one somehow exists). */
  quantity: number
  direction: SeatDirection
  payload: Payload
  req: PayloadRequest
  sessionId: number | string
}

/**
 * Minimal shape of the Postgres/Drizzle adapter surface this module depends on. `payload.db`
 * is statically typed as the DB-agnostic `DatabaseAdapter` interface (Payload supports
 * Mongo/SQLite/Postgres), so it does not expose `drizzle`/`sessions` — those are specific
 * to `@payloadcms/db-postgres` (see `DrizzleAdapter` in `@payloadcms/drizzle`). We only
 * depend on the two properties the locked pattern (docs/PLAN.md) actually needs, rather
 * than importing that whole (transitive, not-a-direct-dependency) type.
 */
type DrizzleExecutor = {
  execute: (query: SQL) => Promise<{ rows: Array<Record<string, unknown>> }>
}

type PostgresAdapterWithDrizzle = {
  drizzle: DrizzleExecutor
  sessions: Record<string, { db: DrizzleExecutor } | undefined>
}

/**
 * Atomically consumes or releases seats on a `courseSessions` row, via a guarded
 * conditional `UPDATE` executed against the CURRENT request's transaction (when one is
 * open) — never the base connection directly. Joining the request's transaction is what
 * makes this "atomic" in the sense CLAUDE.md §3.4/§8 requires: if the guard fails (or
 * anything else later in the same request throws), Payload rolls back the whole
 * transaction, so the order's own status change is undone together with the seat write —
 * never one without the other.
 *
 * Pattern locked in docs/PLAN.md: `payload.db.sessions[await req.transactionID]?.db ??
 * payload.db.drizzle`. Payload's `beginTransaction` (`@payloadcms/drizzle`) stores the live
 * `db.transaction()` callback argument (a Drizzle transaction handle) at
 * `sessions[transactionID].db`; `req.transactionID` resolves (via `initTransaction`) to
 * that very same id once one has been opened for the request. Falling back to
 * `payload.db.drizzle` (the adapter's base instance) only matters when no transaction is
 * open at all — Payload's own `create`/`updateByID`/`deleteByID` operations always open
 * one around their hooks, so in practice every path that reaches this function from an
 * `orders` hook is transactional.
 *
 * `consume`: `UPDATE course_sessions SET seats_sold = seats_sold + $qty WHERE id = $id AND
 * seats_sold + $qty <= capacity RETURNING id` — the `AND` guard is what prevents oversell
 * under concurrency: two simultaneous transactions each evaluate the guard against
 * Postgres's row-level locking for the `UPDATE`, so only as many can succeed as there are
 * seats left, no matter how many fire at once. Zero rows returned means the guard failed
 * (not enough seats) and we throw an `APIError` so Payload rolls back the transaction.
 *
 * `release`: `UPDATE course_sessions SET seats_sold = GREATEST(seats_sold - $qty, 0)
 * WHERE id = $id RETURNING id` — unconditional (nothing to guard against when giving seats
 * back), clamped at zero as a defensive floor.
 */
export const consumeSeats = async ({ quantity, direction, payload, req, sessionId }: ConsumeSeatsArgs): Promise<void> => {
  if (!(quantity > 0)) return

  // Structural cast verified against payload@3.85.2 internals (`@payloadcms/drizzle`'s
  // adapter exposes exactly these `drizzle`/`sessions` members) — re-verify on upgrade.
  const adapter = payload.db as unknown as PostgresAdapterWithDrizzle
  const transactionID = await req.transactionID
  const db = (transactionID != null ? adapter.sessions[String(transactionID)]?.db : undefined) ?? adapter.drizzle

  if (direction === 'release') {
    await db.execute(
      sql`UPDATE course_sessions SET seats_sold = GREATEST(seats_sold - ${quantity}, 0) WHERE id = ${sessionId} RETURNING id`,
    )
    return
  }

  const result = await db.execute(
    sql`UPDATE course_sessions SET seats_sold = seats_sold + ${quantity} WHERE id = ${sessionId} AND seats_sold + ${quantity} <= capacity RETURNING id`,
  )

  if (result.rows.length === 0) {
    throw new APIError('Not enough seats available for this session.', 409)
  }
}
