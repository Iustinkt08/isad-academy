import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import { sendReviewRequests } from '../src/lib/reviews/sendReviewRequests'

/**
 * Dev/local fallback for the daily review-request job (CLAUDE.md §10; docs/PLAN.md locked
 * cron decision, T13). In production, Vercel Cron hits Payload's own
 * `/api/payload-jobs/handle-schedules` + `/api/payload-jobs/run` endpoints on a schedule
 * (see vercel.json + the `jobs` config in payload.config.ts) — `jobs.autoRun` does NOT fire
 * on Vercel at all. Locally (or anywhere without Vercel Cron configured), run this once by
 * hand:
 *
 *   npm run jobs:run
 *
 * DECISION: this script calls `sendReviewRequests` DIRECTLY rather than going through
 * `payload.jobs.queue()` + `payload.jobs.run()` (the Payload Jobs Queue Local API). The queue
 * only matters for the cron-driven production path — the registered `sendReviewRequests` task
 * handler in payload.config.ts delegates to this exact same function. For a one-off manual
 * dev run there is no queue to drain and no job log to inspect afterwards; calling the
 * function directly is simpler and prints an immediate, readable summary against the DEV
 * database (`DATABASE_URI` from `.env`, mirroring scripts/seed.ts — never the throwaway
 * `isad_test` int-test database).
 */
async function main() {
  const payload = await getPayload({ config })
  const summary = await sendReviewRequests({ payload })
  payload.logger.info(`[reviews] jobs:run summary: ${JSON.stringify(summary)}`)
  await payload.db.destroy?.()
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[reviews] jobs:run failed:', err)
    process.exit(1)
  })
