import './setup'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '../../src/payload.config'

// Suffix per test run so unique fields (course slug, discount code) never collide with
// leftovers from a previous run against the same throwaway `isad_test` database.
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

describe('orders (int)', () => {
  let payload: Payload
  let sessionId: number
  let discountCodeId: number

  beforeAll(async () => {
    payload = await getPayload({ config })

    const course = await payload.create({
      collection: 'courses',
      data: { title: `Course For Orders ${RUN_ID}`, _status: 'published' },
      overrideAccess: true,
    })

    const session = await payload.create({
      collection: 'courseSessions',
      data: { course: course.id, startDate: new Date().toISOString(), capacity: 10 },
      overrideAccess: true,
    })
    sessionId = session.id

    const discountCode = await payload.create({
      collection: 'discountCodes',
      data: { code: `ORDERS-TEST-10-${RUN_ID}`, percentage: 10, type: 'general', isActive: true },
      overrideAccess: true,
    })
    discountCodeId = discountCode.id
  })

  afterAll(async () => {
    await payload.db.destroy?.()
  })

  it('is never publicly readable', async () => {
    await payload.create({
      collection: 'orders',
      data: {
        session: sessionId,
        quantity: 1,
        buyer: { name: 'Jane Buyer', email: 'jane@example.com' },
        participants: [{ name: 'Jane Buyer', email: 'jane@example.com' }],
        paymentStatus: 'pending',
      },
      overrideAccess: true,
    })

    // `isAdmin` resolves to a plain boolean, so Payload rejects the read outright
    // (rather than silently filtering to an empty list) unless `disableErrors` is passed.
    await expect(payload.find({ collection: 'orders', overrideAccess: false })).rejects.toThrow()
  })

  it('denies public creation of orders', async () => {
    await expect(
      payload.create({
        collection: 'orders',
        data: {
          session: sessionId,
          quantity: 1,
          buyer: { name: 'Anon', email: 'anon@example.com' },
          participants: [{ name: 'Anon', email: 'anon@example.com' }],
          paymentStatus: 'pending',
        },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('rejects a participants array whose length does not match quantity', async () => {
    await expect(
      payload.create({
        collection: 'orders',
        data: {
          session: sessionId,
          quantity: 2,
          buyer: { name: 'Mismatch Buyer', email: 'mismatch@example.com' },
          participants: [{ name: 'Only One', email: 'only-one@example.com' }],
          paymentStatus: 'pending',
        },
        overrideAccess: true,
      }),
    ).rejects.toThrow()
  })

  it('accepts a matching participants array and persists the pricing snapshot', async () => {
    const order = await payload.create({
      collection: 'orders',
      data: {
        session: sessionId,
        quantity: 3,
        buyer: { name: 'Group Buyer', email: 'group@example.com', isCompany: false },
        participants: [
          { name: 'Participant One', email: 'p1@example.com' },
          { name: 'Participant Two', email: 'p2@example.com' },
          { name: 'Participant Three', email: 'p3@example.com' },
        ],
        pricing: {
          basePrice: 1000,
          appliedWindow: 'standard',
          groupDiscount: 10,
          memberDiscount: 0,
          code: discountCodeId,
          codeDiscount: 10,
          total: 2430,
        },
        paymentStatus: 'confirmed',
        provider: 'mock',
        providerRef: 'mock-ref-123',
      },
      overrideAccess: true,
      depth: 0, // keep relationships as raw IDs so the snapshot assertion is unambiguous
    })

    expect(order.participants).toHaveLength(3)
    expect(order.pricing?.basePrice).toBe(1000)
    expect(order.pricing?.appliedWindow).toBe('standard')
    expect(order.pricing?.groupDiscount).toBe(10)
    expect(order.pricing?.codeDiscount).toBe(10)
    expect(order.pricing?.total).toBe(2430)
    expect(order.pricing?.code).toBe(discountCodeId)
    expect(order.paymentStatus).toBe('confirmed')
  })

  it('accepts quantity 1 where the buyer doubles as the sole participant', async () => {
    const order = await payload.create({
      collection: 'orders',
      data: {
        session: sessionId,
        quantity: 1,
        buyer: { name: 'Solo Buyer', email: 'solo@example.com' },
        participants: [{ name: 'Solo Buyer', email: 'solo@example.com' }],
        paymentStatus: 'pending',
      },
      overrideAccess: true,
    })

    expect(order.participants).toHaveLength(1)
  })
})
