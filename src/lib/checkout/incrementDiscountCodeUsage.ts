import { sql, type SQL } from '@payloadcms/db-postgres/drizzle'
import type { Payload } from 'payload'

/** Mirrors the minimal Drizzle surface `src/lib/seats/consumeSeats.ts` depends on — see that
 * file's comment for why this is hand-typed rather than importing `@payloadcms/drizzle`'s
 * (transitive, not-a-direct-dependency) adapter type. */
type DrizzleExecutor = {
  execute: (query: SQL) => Promise<{ rows: Array<Record<string, unknown>> }>
}

type PostgresAdapterWithDrizzle = {
  drizzle: DrizzleExecutor
}

/**
 * Guarded atomic increment of `discountCodes.usageCount`, run directly against the
 * adapter's BASE `drizzle` instance rather than joining a Payload transaction (unlike
 * `consumeSeats`, which runs from inside an `orders` collection hook while a transaction is
 * still open). This call happens in the checkout SERVICE, strictly after `processCheckout`
 * has already awaited `payload.update(... paymentStatus: 'confirmed')` to completion — by
 * that point the order's own transaction has committed, so there is nothing left to join;
 * a single guarded `UPDATE` against the pool is already atomic on its own.
 *
 * `UPDATE discount_codes SET usage_count = usage_count + 1 WHERE id = $id AND (usage_limit
 * IS NULL OR usage_count < usage_limit) RETURNING id` — same shape as the seat-consumption
 * guard. Returns `true` when the increment applied, `false` when the guard rejected it (the
 * code's `usageLimit` was consumed by a concurrent order between checkout's own validation
 * and this call). Never throws for that expected race — see `processCheckout` for what the
 * caller does with a `false` result.
 */
export const incrementDiscountCodeUsage = async (
  payload: Payload,
  codeId: number | string,
): Promise<boolean> => {
  // Structural cast verified against payload@3.85.2 internals (`@payloadcms/drizzle`'s
  // adapter exposes exactly this `drizzle` member) — re-verify on upgrade.
  const adapter = payload.db as unknown as PostgresAdapterWithDrizzle

  const result = await adapter.drizzle.execute(
    sql`UPDATE discount_codes SET usage_count = usage_count + 1 WHERE id = ${codeId} AND (usage_limit IS NULL OR usage_count < usage_limit) RETURNING id`,
  )

  return result.rows.length > 0
}
