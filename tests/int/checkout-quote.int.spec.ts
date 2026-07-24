import './setup'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '../../src/payload.config'
import { POST } from '../../src/app/api/checkout/quote/route'
import { computeOrderPricing } from '../../src/lib/pricing'

/**
 * T10 — `POST /api/checkout/quote` int suite.
 *
 * NOTE (build orchestration): written by T10 but NOT executed by it — `npm run test:int`
 * is reserved for the parallel T7 agent while both run (shared throwaway isad_test DB).
 * The orchestrator runs this suite after T7 finishes.
 *
 * Core invariant under test: the quote endpoint prices EXACTLY like `processCheckout`
 * (same lookups, same engine, same error contract) while creating NOTHING — no order, no
 * seat consumption, no discount-code usageCount bump.
 */

const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const DAY_MS = 24 * 60 * 60 * 1000
const isoOffset = (days: number): string => new Date(Date.now() + days * DAY_MS).toISOString()

const ACTIVE_STANDARD_WINDOW = { price: 200, startDate: isoOffset(-30), endDate: isoOffset(365) }

type JsonBody = Record<string, unknown>

describe('POST /api/checkout/quote (int) — T10', () => {
  let payload: Payload
  let courseId: number

  beforeAll(async () => {
    payload = await getPayload({ config })

    const course = await payload.create({
      collection: 'courses',
      data: { title: `Quote Course ${RUN_ID}`, _status: 'published' },
      overrideAccess: true,
    })
    courseId = course.id
  })

  afterAll(async () => {
    await payload.db.destroy?.()
  })

  const createSession = async (overrides: Record<string, unknown> = {}) =>
    payload.create({
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

  const postQuote = async (body: unknown): Promise<{ status: number; json: JsonBody }> => {
    const request = new Request('http://localhost/api/checkout/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const response = await POST(request)
    const json = (await response.json()) as JsonBody
    return { status: response.status, json }
  }

  const ordersCountForSession = async (sessionId: number): Promise<number> => {
    const found = await payload.find({
      collection: 'orders',
      where: { session: { equals: sessionId } },
      overrideAccess: true,
      limit: 1,
    })
    return found.totalDocs
  }

  it('happy path: returns the engine-computed pricing + session info, creates nothing, consumes nothing', async () => {
    const session = await createSession()

    const { status, json } = await postQuote({ sessionId: session.id, quantity: 3 })

    expect(status).toBe(200)

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
    expect(json.session).toMatchObject({
      id: session.id,
      courseTitle: `Quote Course ${RUN_ID}`,
    })
    expect(typeof (json.session as JsonBody).startDate).toBe('string')

    // Read-only guarantee: NO order created, NO seats consumed.
    expect(await ordersCountForSession(session.id)).toBe(0)
    const after = await payload.findByID({
      collection: 'courseSessions',
      id: session.id,
      overrideAccess: true,
    })
    expect(after.seatsSold ?? 0).toBe(0)
  })

  it('valid discount code: prices the discount but does NOT increment usageCount', async () => {
    const session = await createSession()
    const code = await payload.create({
      collection: 'discountCodes',
      data: {
        code: `QUOTE-OK-${RUN_ID}`,
        percentage: 10,
        type: 'general',
        isActive: true,
        usageCount: 0,
      },
      overrideAccess: true,
    })

    const { status, json } = await postQuote({
      sessionId: session.id,
      quantity: 1,
      code: code.code,
    })

    expect(status).toBe(200)
    expect((json.pricing as JsonBody).codeDiscount).toBeGreaterThan(0)

    const codeAfter = await payload.findByID({
      collection: 'discountCodes',
      id: code.id,
      overrideAccess: true,
    })
    expect(codeAfter.usageCount ?? 0).toBe(0)
  })

  // ——— Each invalid-code detail — same 400 body contract as POST /api/checkout ———

  it('unknown code → 400 detail "notFound"', async () => {
    const session = await createSession()

    const { status, json } = await postQuote({
      sessionId: session.id,
      quantity: 1,
      code: `QUOTE-MISSING-${RUN_ID}`,
    })

    expect(status).toBe(400)
    expect(json).toMatchObject({ error: 'Invalid or expired discount code.', detail: 'notFound' })
  })

  it('inactive code → 400 detail "inactive"', async () => {
    const session = await createSession()
    await payload.create({
      collection: 'discountCodes',
      data: {
        code: `QUOTE-INACTIVE-${RUN_ID}`,
        percentage: 10,
        type: 'general',
        isActive: false,
        usageCount: 0,
      },
      overrideAccess: true,
    })

    const { status, json } = await postQuote({
      sessionId: session.id,
      quantity: 1,
      code: `QUOTE-INACTIVE-${RUN_ID}`,
    })

    expect(status).toBe(400)
    expect(json).toMatchObject({ error: 'Invalid or expired discount code.', detail: 'inactive' })
  })

  it('expired code → 400 detail "expired"', async () => {
    const session = await createSession()
    await payload.create({
      collection: 'discountCodes',
      data: {
        code: `QUOTE-EXPIRED-${RUN_ID}`,
        percentage: 10,
        type: 'general',
        isActive: true,
        usageCount: 0,
        expiresAt: isoOffset(-1),
      },
      overrideAccess: true,
    })

    const { status, json } = await postQuote({
      sessionId: session.id,
      quantity: 1,
      code: `QUOTE-EXPIRED-${RUN_ID}`,
    })

    expect(status).toBe(400)
    expect(json).toMatchObject({ error: 'Invalid or expired discount code.', detail: 'expired' })
  })

  it('usage-limit-reached code → 400 detail "usageLimitReached"', async () => {
    const session = await createSession()
    await payload.create({
      collection: 'discountCodes',
      data: {
        code: `QUOTE-LIMIT-${RUN_ID}`,
        percentage: 10,
        type: 'general',
        isActive: true,
        usageLimit: 2,
        usageCount: 2,
      },
      overrideAccess: true,
    })

    const { status, json } = await postQuote({
      sessionId: session.id,
      quantity: 1,
      code: `QUOTE-LIMIT-${RUN_ID}`,
    })

    expect(status).toBe(400)
    expect(json).toMatchObject({
      error: 'Invalid or expired discount code.',
      detail: 'usageLimitReached',
    })
  })

  // ——— Session-state errors — same statuses/bodies as POST /api/checkout ———

  it('no active price window → 409 "Enrolment is not open for this edition."', async () => {
    const session = await createSession({
      standard: { price: 200, startDate: isoOffset(30), endDate: isoOffset(59) },
    })

    const { status, json } = await postQuote({ sessionId: session.id, quantity: 1 })

    expect(status).toBe(409)
    expect(json).toMatchObject({ error: 'Enrolment is not open for this edition.' })
    expect(json.soldOut).toBeUndefined()
  })

  it('sold-out session → 409 with soldOut: true', async () => {
    const session = await createSession({ capacity: 5, seatsSold: 5 })

    const { status, json } = await postQuote({ sessionId: session.id, quantity: 1 })

    expect(status).toBe(409)
    expect(json).toMatchObject({ error: 'This edition is sold out.', soldOut: true })
  })

  it('past session → 409 "This edition has already taken place."', async () => {
    const session = await createSession({
      startDate: isoOffset(-10),
      standard: { price: 200, startDate: isoOffset(-40), endDate: isoOffset(-11) },
    })

    const { status, json } = await postQuote({ sessionId: session.id, quantity: 1 })

    expect(status).toBe(409)
    expect(json).toMatchObject({ error: 'This edition has already taken place.' })
  })

  it('unknown session id → 404', async () => {
    const { status, json } = await postQuote({ sessionId: 99_999_999, quantity: 1 })

    expect(status).toBe(404)
    expect(json).toMatchObject({ error: 'Course session not found.' })
  })

  // ——— Input validation (same spirit as validateCheckoutInput, quote's three fields) ———

  it('rejects a missing sessionId, non-integer quantity and unknown fields with 400', async () => {
    const session = await createSession()

    expect((await postQuote({ quantity: 1 })).status).toBe(400)
    expect((await postQuote({ sessionId: session.id, quantity: 0 })).status).toBe(400)
    expect((await postQuote({ sessionId: session.id, quantity: 1.5 })).status).toBe(400)
    expect((await postQuote({ sessionId: session.id, quantity: 1, buyer: {} })).status).toBe(400)
    expect((await postQuote({ sessionId: session.id, quantity: 1, code: '' })).status).toBe(400)
  })
})
