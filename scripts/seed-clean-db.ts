import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../src/payload.config'

/**
 * Clean-database seed for the CLIENT HANDOVER dump (owner request 2026-08-08):
 * exactly one admin user, one lorem-ipsum course with two editions, and one
 * lorem-ipsum blog post. Nothing else: no event popups, no registrations, no
 * orders, no leads, no reviews, no FAQ, no media.
 *
 * SAFETY: refuses to run against anything but a local database. Point it at a
 * dedicated empty DB (e.g. `isad_clean`) via DATABASE_URI, run `payload migrate`
 * first, then this script, then pg_dump. See scripts/make-clean-db.sh.
 */

const uri = process.env.DATABASE_URI ?? ''
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(uri)) {
  console.error('[seed-clean-db] Refusing to run: DATABASE_URI is not a local database.')
  process.exit(1)
}

// HARD-DISABLE outbound email. Publishing the seeded blog post fires the Brevo broadcast
// hook, and on 2026-08-08 that sent a real lorem-ipsum campaign to the newsletter list.
// `getMailer()` reads this env at call time, so clearing it here forces the noop mailer.
process.env.BREVO_API_KEY = ''

const DAY_MS = 24 * 60 * 60 * 1000
const daysFromNow = (offsetDays: number): string =>
  new Date(Date.now() + offsetDays * DAY_MS).toISOString()

/** Minimal valid Lexical editor state — one paragraph per string. */
const richText = (paragraphs: string[]) => ({
  root: {
    type: 'root',
    children: paragraphs.map((text) => ({
      type: 'paragraph',
      children: [{ type: 'text', text, version: 1 }],
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
    })),
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    version: 1,
  },
})

const LOREM_1 =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
const LOREM_2 =
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
const LOREM_3 =
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.'

async function run(): Promise<void> {
  const payload = await getPayload({ config })

  // 1. Test admin user (short password, per owner request).
  await payload.create({
    collection: 'users',
    data: {
      email: 'contact@zup.digital',
      password: 'zup123',
      name: 'Test user',
      role: 'admin',
    },
    overrideAccess: true,
  })
  console.log('[seed-clean-db] user contact@zup.digital created')

  // 2. One course, lorem ipsum in both languages.
  const course = await payload.create({
    collection: 'courses',
    data: {
      title: 'Sample Course',
      slug: 'sample-course',
      durationHours: 16,
      description: richText([LOREM_1, LOREM_2]),
      audience: richText([LOREM_3]),
      _status: 'published',
    } as never,
    overrideAccess: true,
    locale: 'en',
  })
  await payload.update({
    collection: 'courses',
    id: course.id,
    data: {
      title: 'Curs exemplu',
      description: richText([LOREM_1, LOREM_2]),
      audience: richText([LOREM_3]),
    } as never,
    overrideAccess: true,
    locale: 'ro',
  })
  console.log('[seed-clean-db] course created:', course.id)

  // 3. Two future editions with open Early Bird + Standard windows.
  for (const [start, label] of [
    [30, 'first'],
    [60, 'second'],
  ] as const) {
    const session = await payload.create({
      collection: 'courseSessions',
      data: {
        course: course.id,
        startDate: daysFromNow(start),
        capacity: 10,
        seatsSold: 0,
        schedule: [
          { date: daysFromNow(start), startTime: '10:00', endTime: '14:00' },
          { date: daysFromNow(start + 1), startTime: '10:00', endTime: '14:00' },
        ],
        earlyBird: { price: 500, startDate: daysFromNow(-1), endDate: daysFromNow(start - 15) },
        standard: { price: 650, startDate: daysFromNow(start - 15), endDate: daysFromNow(start) },
      } as never,
      overrideAccess: true,
    })
    console.log(`[seed-clean-db] ${label} edition created:`, session.id)
  }

  // 4. One lorem-ipsum blog post, published, both languages.
  const post = await payload.create({
    collection: 'blogPosts',
    data: {
      title: 'Lorem ipsum dolor sit amet',
      slug: 'lorem-ipsum',
      excerpt: LOREM_1,
      body: richText([LOREM_1, LOREM_2, LOREM_3]),
      readingTime: 3,
      _status: 'published',
    } as never,
    overrideAccess: true,
    locale: 'en',
  })
  await payload.update({
    collection: 'blogPosts',
    id: post.id,
    data: {
      title: 'Lorem ipsum dolor sit amet',
      excerpt: LOREM_2,
      body: richText([LOREM_1, LOREM_2, LOREM_3]),
    } as never,
    overrideAccess: true,
    locale: 'ro',
  })
  console.log('[seed-clean-db] blog post created:', post.id)

  console.log('[seed-clean-db] done')
  process.exit(0)
}

run().catch((err) => {
  console.error('[seed-clean-db] failed:', err)
  process.exit(1)
})
