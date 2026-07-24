import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../src/payload.config'

/**
 * Dev-only helper (owner review 2026-07-12): give the four launch courses ONE placeholder
 * upcoming edition each so the Home preview cards render their smart start-date / seats-left
 * chip and the course-detail enrolment flow is exercisable. Prices/dates are PLACEHOLDERS for
 * Silviu to replace. One edition is deliberately near-sold-out (2 seats) to demo the chip.
 *
 * Idempotent: deletes each course's existing sessions (and any orders on them) first, so it's
 * safe to re-run. Run with: `npx tsx scripts/seed-sample-sessions.ts`
 */

const iso = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m - 1, d)).toISOString()

// Active-now Early Bird window + a later Standard window (placeholder EUR prices).
const EARLY_BIRD = { price: 900, startDate: iso(2026, 7, 1), endDate: iso(2026, 12, 1) }
const STANDARD = { price: 1200, startDate: iso(2026, 12, 1), endDate: iso(2027, 6, 1) }

const day = (y: number, m: number, d: number) => ({
  date: iso(y, m, d),
  startTime: '09:00',
  endTime: '17:00',
})

const EDITIONS: {
  slug: string
  startDate: string
  schedule: { date: string; startTime: string; endTime: string }[]
  capacity: number
  seatsSold: number
}[] = [
  {
    slug: 'ai-governance-responsible-ai',
    startDate: iso(2026, 7, 28),
    schedule: [day(2026, 7, 28), day(2026, 7, 29)],
    capacity: 12,
    seatsSold: 0,
  },
  {
    // Deliberately near-sold-out → chip shows "2 seats left" instead of the start date.
    slug: 'artificial-intelligence-management-system',
    startDate: iso(2026, 8, 11),
    schedule: [day(2026, 8, 11)],
    capacity: 15,
    seatsSold: 13,
  },
  {
    slug: 'lead-implementer',
    startDate: iso(2026, 9, 15),
    schedule: [day(2026, 9, 15), day(2026, 9, 16), day(2026, 9, 17), day(2026, 9, 18), day(2026, 9, 19)],
    capacity: 12,
    seatsSold: 0,
  },
  {
    slug: 'lead-auditor',
    startDate: iso(2026, 10, 20),
    schedule: [day(2026, 10, 20), day(2026, 10, 21), day(2026, 10, 22), day(2026, 10, 23), day(2026, 10, 24)],
    capacity: 12,
    seatsSold: 0,
  },
]

async function main() {
  const payload = await getPayload({ config })

  for (const edition of EDITIONS) {
    const found = await payload.find({
      collection: 'courses',
      where: { slug: { equals: edition.slug } },
      limit: 1,
      overrideAccess: true,
      depth: 0,
    })
    const course = found.docs[0]
    if (!course) {
      console.log(`SKIP ${edition.slug}: course not found`)
      continue
    }

    // Clear existing editions (+ any orders on them) so re-runs stay clean.
    const sessions = await payload.find({
      collection: 'courseSessions',
      where: { course: { equals: course.id } },
      pagination: false,
      overrideAccess: true,
      depth: 0,
    })
    if (sessions.totalDocs > 0) {
      const ids = sessions.docs.map((s) => s.id)
      await payload.delete({ collection: 'orders', where: { session: { in: ids } }, overrideAccess: true })
      await payload.delete({ collection: 'courseSessions', where: { id: { in: ids } }, overrideAccess: true })
    }

    const created = await payload.create({
      collection: 'courseSessions',
      overrideAccess: true,
      data: {
        course: course.id,
        startDate: edition.startDate,
        schedule: edition.schedule,
        capacity: edition.capacity,
        seatsSold: edition.seatsSold,
        earlyBird: EARLY_BIRD,
        standard: STANDARD,
      },
    })
    console.log(
      `Session ${created.id} → ${edition.slug} (start ${edition.startDate.slice(0, 10)}, ` +
        `${edition.capacity - edition.seatsSold} seats left)`,
    )
  }

  console.log('Done.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
