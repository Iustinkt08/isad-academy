import './setup'

import { getPayload, type Payload } from 'payload'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import config from '../../src/payload.config'
import { POST } from '../../src/app/api/checkout/route'
import { computeOrderPricing } from '../../src/lib/pricing'
import { FAILING_TEST_EMAIL, getPaymentProvider } from '../../src/lib/payments'

// Suffix per test run so unique fields (emails, discount codes) never collide with
// leftovers from a previous run against the same throwaway `isad_test` database.
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
let emailCounter = 0
const uniqueEmail = (label: string): string => `${label}-${RUN_ID}-${emailCounter++}@example.com`

const DAY_MS = 24 * 60 * 60 * 1000
/** ISO date `days` from the real "now" — avoids hardcoding absolute dates while keeping
 * every window comfortably active/expired/past regardless of when the suite actually runs. */
const isoOffset = (days: number): string => new Date(Date.now() + days * DAY_MS).toISOString()

/** A Standard price window that is active no matter when this suite runs. */
const ACTIVE_STANDARD_WINDOW = { price: 200, startDate: isoOffset(-30), endDate: isoOffset(365) }

type JsonBody = Record<string, unknown>

describe('POST /api/checkout (int) — T6', () => {
  let payload: Payload
  let courseId: number

  beforeAll(async () => {
    payload = await getPayload({ config })

    const course = await payload.create({
      collection: 'courses',
      data: { title: `Checkout Course ${RUN_ID}`, _status: 'published' },
      overrideAccess: true,
    })
    courseId = course.id
  })

  afterAll(async () => {
    await payload.db.destroy?.()
  })

  const createSession = async (overrides: Record<string, unknown> = {}) => {
    return payload.create({
      collection: 'courseSessions',
      data: {
        course: courseId,
        startDate: isoOffset(60),
        capacity: 10,
        standard: ACTIVE_STANDARD_WINDOW,
        ...overrides,
      },
      overrideAccess: true,
    })
  }

  const seatsSoldOf = async (sessionId: number): Promise<number> => {
    const session = await payload.findByID({ collection: 'courseSessions', id: sessionId, overrideAccess: true })
    return session.seatsSold ?? 0
  }

  const ordersForSession = async (sessionId: number) => {
    const found = await payload.find({
      collection: 'orders',
      where: { session: { equals: sessionId } },
      overrideAccess: true,
      limit: 100,
    })
    return found.docs
  }

  const postCheckout = async (body: unknown): Promise<{ status: number; json: JsonBody }> => {
    const request = new Request('http://localhost/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const response = await POST(request)
    const json = (await response.json()) as JsonBody
    return { status: response.status, json }
  }

  const participantsFor = (quantity: number) =>
    Array.from({ length: quantity }, (_, i) => ({ name: `Participant ${i}`, email: uniqueEmail(`participant-${i}`) }))

  it('happy path: multi-participant checkout confirms, consumes seats, and snapshots the independently-computed pricing', async () => {
    const session = await createSession({ capacity: 10 })
    const buyerEmail = uniqueEmail('buyer-happy')

    const { status, json } = await postCheckout({
      sessionId: session.id,
      quantity: 3,
      buyer: { name: 'Group Buyer', email: buyerEmail },
      participants: participantsFor(3),
    })

    expect(status).toBe(200)
    expect(json.status).toBe('confirmed')
    expect(typeof json.orderId).toBe('number')

    const expected = computeOrderPricing({
      windows: { standard: ACTIVE_STANDARD_WINDOW },
      quantity: 3,
      code: null,
      isMember: false,
      policy: 'stackAll',
      memberDiscountPercent: 0,
      now: new Date(),
    })
    expect(expected.ok).toBe(true)
    if (!expected.ok) return

    expect(json.pricing).toMatchObject({
      basePrice: expected.pricing.basePrice,
      appliedWindow: expected.pricing.appliedWindow,
      groupDiscount: expected.pricing.groupDiscount,
      memberDiscount: expected.pricing.memberDiscount,
      codeDiscount: expected.pricing.codeDiscount,
      total: expected.pricing.total,
    })

    const order = await payload.findByID({ collection: 'orders', id: json.orderId as number, overrideAccess: true })
    expect(order.paymentStatus).toBe('confirmed')
    expect(order.participants).toHaveLength(3)
    expect(order.pricing?.total).toBe(expected.pricing.total)

    expect(await seatsSoldOf(session.id)).toBe(3)
  })

  it('quantity 1 with participants omitted auto-fills the sole participant from the buyer', async () => {
    const session = await createSession()
    const buyerEmail = uniqueEmail('buyer-solo')

    const { status, json } = await postCheckout({
      sessionId: session.id,
      quantity: 1,
      buyer: { name: 'Solo Buyer', email: buyerEmail },
    })

    expect(status).toBe(200)
    expect(json.participants).toEqual([{ name: 'Solo Buyer', email: buyerEmail }])

    const order = await payload.findByID({ collection: 'orders', id: json.orderId as number, overrideAccess: true })
    expect(order.participants).toHaveLength(1)
    expect(order.participants?.[0]).toMatchObject({ name: 'Solo Buyer', email: buyerEmail })
  })

  it('rejects a participants array whose length does not match quantity (400), and creates no order', async () => {
    const session = await createSession()

    const { status, json } = await postCheckout({
      sessionId: session.id,
      quantity: 2,
      buyer: { name: 'Mismatch Buyer', email: uniqueEmail('mismatch') },
      participants: participantsFor(1),
    })

    expect(status).toBe(400)
    expect(json.error).toMatch(/participants/i)
    expect(await ordersForSession(session.id)).toHaveLength(0)
  })

  it('rejects a company (B2B) buyer missing "cui" (400), and creates no order', async () => {
    const session = await createSession()

    const { status, json } = await postCheckout({
      sessionId: session.id,
      quantity: 1,
      buyer: {
        name: 'Company Buyer',
        email: uniqueEmail('company'),
        isCompany: true,
        companyName: 'Acme SRL',
      },
    })

    expect(status).toBe(400)
    expect(json.error).toMatch(/cui/i)
    expect(await ordersForSession(session.id)).toHaveLength(0)
  })

  it('rejects an unknown top-level field (400) — mass-assignment hygiene', async () => {
    const session = await createSession()

    const { status, json } = await postCheckout({
      sessionId: session.id,
      quantity: 1,
      buyer: { name: 'Buyer', email: uniqueEmail('unknown-field') },
      foo: 'bar',
    })

    expect(status).toBe(400)
    expect(json.error).toMatch(/foo/i)
    expect(await ordersForSession(session.id)).toHaveLength(0)
  })

  it('rejects an oversized request body (413) before any parsing/validation runs', async () => {
    const session = await createSession()

    const { status, json } = await postCheckout({
      sessionId: session.id,
      quantity: 1,
      buyer: { name: 'Buyer', email: uniqueEmail('oversized'), address: 'x'.repeat(25_000) },
    })

    expect(status).toBe(413)
    expect(json.error).toMatch(/too large/i)
    expect(await ordersForSession(session.id)).toHaveLength(0)
  })

  it('ignores tampered client-sent pricing/total/isMember fields — the persisted snapshot is always server-computed', async () => {
    const session = await createSession({ capacity: 10 })

    const { status, json } = await postCheckout({
      sessionId: session.id,
      quantity: 1,
      buyer: { name: 'Tamperer', email: uniqueEmail('tamper') },
      // Attempted tampering — must have ZERO effect on the outcome.
      pricing: { total: 1, basePrice: 1 },
      total: 999_999,
      isMember: true,
    })

    expect(status).toBe(200)

    const expected = computeOrderPricing({
      windows: { standard: ACTIVE_STANDARD_WINDOW },
      quantity: 1,
      code: null,
      isMember: false,
      policy: 'stackAll',
      memberDiscountPercent: 0,
      now: new Date(),
    })
    expect(expected.ok).toBe(true)
    if (!expected.ok) return

    const pricing = json.pricing as JsonBody
    expect(pricing.total).toBe(expected.pricing.total)
    expect(pricing.total).not.toBe(999_999)
    expect(pricing.memberDiscount).toBe(0)
  })

  describe('discount codes', () => {
    it('rejects a code that does not exist (400, detail "notFound"), and creates no order', async () => {
      const session = await createSession()

      const { status, json } = await postCheckout({
        sessionId: session.id,
        quantity: 1,
        buyer: { name: 'Buyer', email: uniqueEmail('code-notfound') },
        code: `DOES-NOT-EXIST-${RUN_ID}`,
      })

      expect(status).toBe(400)
      expect(json.detail).toBe('notFound')
      expect(await ordersForSession(session.id)).toHaveLength(0)
    })

    it('rejects an inactive code (400, detail "inactive"), and creates no order', async () => {
      const session = await createSession()
      const code = await payload.create({
        collection: 'discountCodes',
        data: { code: `INACTIVE-${RUN_ID}`, percentage: 10, type: 'general', isActive: false },
        overrideAccess: true,
      })

      const { status, json } = await postCheckout({
        sessionId: session.id,
        quantity: 1,
        buyer: { name: 'Buyer', email: uniqueEmail('code-inactive') },
        code: code.code,
      })

      expect(status).toBe(400)
      expect(json.detail).toBe('inactive')
      expect(await ordersForSession(session.id)).toHaveLength(0)
    })

    it('rejects an expired code (400, detail "expired"), and creates no order', async () => {
      const session = await createSession()
      const code = await payload.create({
        collection: 'discountCodes',
        data: {
          code: `EXPIRED-${RUN_ID}`,
          percentage: 10,
          type: 'general',
          isActive: true,
          expiresAt: isoOffset(-1),
        },
        overrideAccess: true,
      })

      const { status, json } = await postCheckout({
        sessionId: session.id,
        quantity: 1,
        buyer: { name: 'Buyer', email: uniqueEmail('code-expired') },
        code: code.code,
      })

      expect(status).toBe(400)
      expect(json.detail).toBe('expired')
      expect(await ordersForSession(session.id)).toHaveLength(0)
    })

    it('rejects a code that already hit its usage limit (400, detail "usageLimitReached"), and creates no order', async () => {
      const session = await createSession()
      const code = await payload.create({
        collection: 'discountCodes',
        data: {
          code: `LIMIT-REACHED-${RUN_ID}`,
          percentage: 10,
          type: 'general',
          isActive: true,
          usageLimit: 1,
          usageCount: 1,
        },
        overrideAccess: true,
      })

      const { status, json } = await postCheckout({
        sessionId: session.id,
        quantity: 1,
        buyer: { name: 'Buyer', email: uniqueEmail('code-limit') },
        code: code.code,
      })

      expect(status).toBe(400)
      expect(json.detail).toBe('usageLimitReached')
      expect(await ordersForSession(session.id)).toHaveLength(0)
    })

    it('increments usageCount exactly once for a valid code applied on a confirmed order', async () => {
      const session = await createSession({ capacity: 10 })
      const code = await payload.create({
        collection: 'discountCodes',
        data: { code: `VALID-${RUN_ID}`, percentage: 15, type: 'general', isActive: true },
        overrideAccess: true,
      })

      const { status } = await postCheckout({
        sessionId: session.id,
        quantity: 1,
        buyer: { name: 'Code Buyer', email: uniqueEmail('code-valid') },
        code: code.code,
      })

      expect(status).toBe(200)

      const reread = await payload.findByID({ collection: 'discountCodes', id: code.id, overrideAccess: true })
      expect(reread.usageCount).toBe(1)
    })
  })

  it('rejects checkout when neither price window is active (409)', async () => {
    const session = await createSession({ standard: undefined, earlyBird: undefined })

    const { status, json } = await postCheckout({
      sessionId: session.id,
      quantity: 1,
      buyer: { name: 'Buyer', email: uniqueEmail('no-window') },
    })

    expect(status).toBe(409)
    expect(json.error).toMatch(/not open/i)
    expect(await ordersForSession(session.id)).toHaveLength(0)
  })

  it('rejects checkout for a session that has already taken place (409)', async () => {
    const session = await createSession({ startDate: isoOffset(-100) })

    const { status, json } = await postCheckout({
      sessionId: session.id,
      quantity: 1,
      buyer: { name: 'Buyer', email: uniqueEmail('past-session') },
    })

    expect(status).toBe(409)
    expect(json.error).toMatch(/already taken place/i)
    expect(await ordersForSession(session.id)).toHaveLength(0)
  })

  it('pre-check: a session that is already fully sold out is rejected (409, soldOut) before any order is created', async () => {
    const session = await createSession({ capacity: 1, seatsSold: 1 })

    const { status, json } = await postCheckout({
      sessionId: session.id,
      quantity: 1,
      buyer: { name: 'Buyer', email: uniqueEmail('presold-out') },
    })

    expect(status).toBe(409)
    expect(json.soldOut).toBe(true)
    expect(await ordersForSession(session.id)).toHaveLength(0)
  })

  it('race at confirm-time: exactly one of two concurrent checkouts for the last seat is confirmed; the loser stays pending (409, soldOut) and seats are never oversold', async () => {
    const session = await createSession({ capacity: 1, seatsSold: 0 })

    const bodyA = {
      sessionId: session.id,
      quantity: 1,
      buyer: { name: 'Racer A', email: uniqueEmail('race-a') },
    }
    const bodyB = {
      sessionId: session.id,
      quantity: 1,
      buyer: { name: 'Racer B', email: uniqueEmail('race-b') },
    }

    const [resultA, resultB] = await Promise.all([postCheckout(bodyA), postCheckout(bodyB)])

    const results = [resultA, resultB]
    const confirmed = results.filter((r) => r.status === 200)
    const soldOut = results.filter((r) => r.status === 409)

    expect(confirmed).toHaveLength(1)
    expect(soldOut).toHaveLength(1)
    expect(soldOut[0]!.json.soldOut).toBe(true)

    expect(await seatsSoldOf(session.id)).toBe(1)

    const orders = await ordersForSession(session.id)
    expect(orders).toHaveLength(2)
    const statuses = orders.map((o) => o.paymentStatus).sort()
    expect(statuses).toEqual(['confirmed', 'pending'])
  })

  it('provider failure (fail@test.local) returns 402, marks the order "failed", and never consumes a seat', async () => {
    const session = await createSession({ capacity: 10 })

    const { status, json } = await postCheckout({
      sessionId: session.id,
      quantity: 1,
      buyer: { name: 'Failing Buyer', email: FAILING_TEST_EMAIL },
    })

    expect(status).toBe(402)
    expect(json.error).toMatch(/payment failed/i)

    const orders = await ordersForSession(session.id)
    expect(orders).toHaveLength(1)
    expect(orders[0]!.paymentStatus).toBe('failed')

    expect(await seatsSoldOf(session.id)).toBe(0)
  })

  describe('payment provider selection (PAYMENT_PROVIDER env)', () => {
    const originalProvider = process.env.PAYMENT_PROVIDER

    afterEach(() => {
      if (originalProvider === undefined) delete process.env.PAYMENT_PROVIDER
      else process.env.PAYMENT_PROVIDER = originalProvider
    })

    it('PAYMENT_PROVIDER=stripe resolves to the inert stub, which throws NotImplementedError on createPayment', async () => {
      process.env.PAYMENT_PROVIDER = 'stripe'
      const provider = getPaymentProvider()

      expect(provider.name).toBe('stripe')
      await expect(
        provider.createPayment({ orderId: 1, amount: 10, currency: 'EUR', buyerEmail: 'x@example.com' }),
      ).rejects.toThrow(/not implemented/i)
    })

    it('an unrecognized PAYMENT_PROVIDER value throws a clear error at call time', () => {
      process.env.PAYMENT_PROVIDER = 'some-unknown-vendor'
      expect(() => getPaymentProvider()).toThrow(/Unknown PAYMENT_PROVIDER/)
    })
  })
})
