import './setup'

import { getPayload, type Payload } from 'payload'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import type { Mailer, MailerResult } from '../../src/lib/email'
import { setMailerForTesting } from '../../src/lib/email'
import config from '../../src/payload.config'
import { POST as submitReviewRoute } from '../../src/app/api/reviews/submit/route'
import { sendReviewRequests } from '../../src/lib/reviews/sendReviewRequests'
import { createReviewToken } from '../../src/lib/reviews/token'

// Suffix per test run so unique fields (emails, course titles) never collide with leftovers
// from a previous run against the same throwaway `isad_test` database.
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
let emailCounter = 0
const uniqueEmail = (label: string): string => `${label}-${RUN_ID}-${emailCounter++}@example.com`

const DAY_MS = 24 * 60 * 60 * 1000
/** ISO date `days` from the real "now" — every fixture is expressed relative to whenever the
 * suite actually runs, never an absolute date. */
const isoOffset = (days: number): string => new Date(Date.now() + days * DAY_MS).toISOString()

type RecordedCall = { method: 'broadcastNewPost' | 'sendTransactional' | 'subscribeDoubleOptIn'; args: unknown }

/** A recording `Mailer` — never hits the network, just remembers every call (mirrors
 * tests/int/email-hooks.int.spec.ts's `createFakeMailer`). */
const createFakeMailer = (result: MailerResult = { ok: true }): Mailer & { calls: RecordedCall[] } => {
  const calls: RecordedCall[] = []
  return {
    name: 'fake',
    calls,
    async sendTransactional(input) {
      calls.push({ method: 'sendTransactional', args: input })
      return result
    },
    async subscribeDoubleOptIn(input) {
      calls.push({ method: 'subscribeDoubleOptIn', args: input })
      return result
    },
    async broadcastNewPost(input) {
      calls.push({ method: 'broadcastNewPost', args: input })
      return result
    },
  }
}

const postSubmit = async (body: unknown): Promise<{ status: number; json: Record<string, unknown> }> => {
  const request = new Request('http://localhost/api/reviews/submit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const response = await submitReviewRoute(request)
  const json = (await response.json()) as Record<string, unknown>
  return { status: response.status, json }
}

describe('reviews pipeline (int) — T13', () => {
  let payload: Payload
  let courseId: number

  beforeAll(async () => {
    payload = await getPayload({ config })

    const course = await payload.create({
      collection: 'courses',
      data: { title: `Course For Reviews Pipeline ${RUN_ID}`, _status: 'published' },
      overrideAccess: true,
    })
    courseId = course.id
  })

  afterAll(async () => {
    await payload.db.destroy?.()
  })

  afterEach(() => {
    setMailerForTesting(null)
  })

  const createSession = async (startDateOffsetDays: number): Promise<number> => {
    const session = await payload.create({
      collection: 'courseSessions',
      data: { course: courseId, startDate: isoOffset(startDateOffsetDays), capacity: 20 },
      overrideAccess: true,
    })
    return session.id as number
  }

  const createOrder = async (
    sessionId: number,
    participants: { name: string; email: string }[],
    paymentStatus: 'confirmed' | 'failed' | 'pending',
  ) => {
    return payload.create({
      collection: 'orders',
      data: {
        session: sessionId,
        quantity: participants.length,
        buyer: { name: participants[0]!.name, email: participants[0]!.email },
        participants,
        paymentStatus,
      },
      overrideAccess: true,
    })
  }

  const reviewRequestSentAtOf = async (sessionId: number): Promise<string | null> => {
    const session = await payload.findByID({ collection: 'courseSessions', id: sessionId, overrideAccess: true })
    return session.reviewRequestSentAt ?? null
  }

  describe('task registration (payload.config)', () => {
    it('registers the sendReviewRequests task on the daily "nightly" queue', () => {
      const tasks = payload.config.jobs?.tasks ?? []
      const task = tasks.find((t) => t.slug === 'sendReviewRequests')

      expect(task).toBeDefined()
      expect(task?.schedule?.[0]?.queue).toBe('nightly')
      expect(task?.schedule?.[0]?.cron).toBe('0 8 * * *')
    })
  })

  describe('sendReviewRequests (daily job)', () => {
    it(
      'emails every unique confirmed participant exactly once, excludes pending/failed orders, ' +
        'dedupes by email across orders, stamps reviewRequestSentAt, and is idempotent on a second run',
      async () => {
        const fake = createFakeMailer()
        setMailerForTesting(fake)

        const sessionId = await createSession(-1) // ended yesterday

        const participantA = { name: 'Alice A.', email: uniqueEmail('alice') }
        const participantB = { name: 'Bob B.', email: uniqueEmail('bob') }
        const participantC = { name: 'Cara C.', email: uniqueEmail('cara') }
        const participantD = { name: 'Dana D. (pending)', email: uniqueEmail('dana-pending') }
        const participantE = { name: 'Eve E. (failed)', email: uniqueEmail('eve-failed') }

        // Confirmed orders — B appears in BOTH, to prove dedupe-by-email across orders.
        await createOrder(sessionId, [participantA, participantB], 'confirmed')
        await createOrder(sessionId, [participantB, participantC], 'confirmed')
        // Excluded: pending and failed orders must never generate a review-request email.
        await createOrder(sessionId, [participantD], 'pending')
        await createOrder(sessionId, [participantE], 'failed')

        // Creating CONFIRMED orders above already fired T7's unrelated order-confirmation
        // email (src/lib/email/hooks/sendOrderConfirmationEmail) on the same fake mailer —
        // clear those out so only THIS job's sends are asserted below.
        fake.calls.length = 0

        const summary = await sendReviewRequests({ payload, lookbackDays: 7 })

        expect(summary.sessionsProcessed).toBeGreaterThanOrEqual(1)
        expect(summary.emailsSent).toBe(3) // A, B (deduped), C — not D or E
        expect(summary.emailsFailed).toBe(0)

        const sentTo = fake.calls
          .filter((c) => c.method === 'sendTransactional')
          .map((c) => (c.args as { to: string }).to)
          .sort()
        expect(sentTo).toEqual([participantA.email, participantB.email, participantC.email].sort())
        expect(sentTo).not.toContain(participantD.email)
        expect(sentTo).not.toContain(participantE.email)

        const stampedAt = await reviewRequestSentAtOf(sessionId)
        expect(stampedAt).toBeTruthy()

        // Second run: the session is now stamped — must send ZERO further emails.
        fake.calls.length = 0
        const secondSummary = await sendReviewRequests({ payload, lookbackDays: 7 })
        const emailsForThisSession = fake.calls.filter((c) => c.method === 'sendTransactional')
        expect(emailsForThisSession).toHaveLength(0)
        // (secondSummary itself may count zero sessions if this was the only stamped one, or
        // may reflect other sessions from sibling tests in this file — assert only what this
        // test owns: no NEW emails for participants A/B/C were sent on the second pass.)
        void secondSummary
      },
    )

    it('skips a session that ended outside the lookback window (never stamped, never emailed)', async () => {
      const fake = createFakeMailer()
      setMailerForTesting(fake)

      const sessionId = await createSession(-10) // ended 10 days ago
      const participant = { name: 'Old Attendee', email: uniqueEmail('old-attendee') }
      await createOrder(sessionId, [participant], 'confirmed')
      // Clear T7's order-confirmation email fired by the create above (unrelated to this job).
      fake.calls.length = 0

      const summary = await sendReviewRequests({ payload, lookbackDays: 7 })

      const sentToOld = fake.calls
        .filter((c) => c.method === 'sendTransactional')
        .map((c) => (c.args as { to: string }).to)
      expect(sentToOld).not.toContain(participant.email)

      const stampedAt = await reviewRequestSentAtOf(sessionId)
      expect(stampedAt).toBeNull()
      void summary
    })

    it('skips a session that has not finished yet (future startDate)', async () => {
      const fake = createFakeMailer()
      setMailerForTesting(fake)

      const sessionId = await createSession(1) // starts tomorrow, unfinished
      const participant = { name: 'Future Attendee', email: uniqueEmail('future-attendee') }
      await createOrder(sessionId, [participant], 'confirmed')
      // Clear T7's order-confirmation email fired by the create above (unrelated to this job).
      fake.calls.length = 0

      await sendReviewRequests({ payload, lookbackDays: 7 })

      const sentToFuture = fake.calls
        .filter((c) => c.method === 'sendTransactional')
        .map((c) => (c.args as { to: string }).to)
      expect(sentToFuture).not.toContain(participant.email)

      const stampedAt = await reviewRequestSentAtOf(sessionId)
      expect(stampedAt).toBeNull()
    })
  })

  describe('POST /api/reviews/submit', () => {
    it('creates a review (source emailForm, showOnHome false) for a valid token, and rejects a duplicate resubmission', async () => {
      const sessionId = await createSession(-1)
      const email = uniqueEmail('reviewer')
      const token = createReviewToken({ sessionId, email })

      const first = await postSubmit({ token, text: 'This course was excellent and very practical.' })
      expect(first.status).toBe(200)
      expect(first.json).toEqual({ ok: true })

      const allForCourse = await payload.find({
        collection: 'reviews',
        where: { course: { equals: courseId } },
        overrideAccess: true,
        sort: '-createdAt',
        limit: 50,
      })
      const created = allForCourse.docs.find((r) => r.text === 'This course was excellent and very practical.')
      expect(created).toBeDefined()
      expect(created?.source).toBe('emailForm')
      expect(created?.showOnHome).toBe(false)

      const second = await postSubmit({ token, text: 'Trying to submit again for the same edition.' })
      expect(second.status).toBe(409)
      expect(second.json.ok).toBe(false)
    })

    it('rejects a tampered token with 401', async () => {
      const sessionId = await createSession(-1)
      const token = createReviewToken({ sessionId, email: uniqueEmail('tamper-target') })
      const [body, signature] = token.split('.') as [string, string]
      const tampered = `${body}.${signature.slice(0, -1)}${signature.at(-1) === 'a' ? 'b' : 'a'}`

      const result = await postSubmit({ token: tampered, text: 'This should never be stored.' })
      expect(result.status).toBe(401)
      expect(result.json.ok).toBe(false)
    })

    it('validates text length (10–2000 chars)', async () => {
      const sessionId = await createSession(-1)

      const tooShortToken = createReviewToken({ sessionId, email: uniqueEmail('too-short') })
      const tooShort = await postSubmit({ token: tooShortToken, text: 'short' })
      expect(tooShort.status).toBe(400)

      const tooLongToken = createReviewToken({ sessionId, email: uniqueEmail('too-long') })
      const tooLong = await postSubmit({ token: tooLongToken, text: 'x'.repeat(2001) })
      expect(tooLong.status).toBe(400)

      const justRightToken = createReviewToken({ sessionId, email: uniqueEmail('just-right') })
      const justRight = await postSubmit({ token: justRightToken, text: 'This is a perfectly fine length.' })
      expect(justRight.status).toBe(200)
    })
  })
})
