import './setup'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '../../src/payload.config'

// Suffix per test run so unique fields never collide with leftovers from a previous run
// against the same throwaway `isad_test` database.
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
let emailCounter = 0
const uniqueEmail = (label: string): string => `${label}-${RUN_ID}-${emailCounter++}@example.com`

type PaymentStatus = 'confirmed' | 'failed' | 'pending' | 'refunded'

describe('atomic seat consumption (int) — T5', () => {
  let payload: Payload
  let courseId: number

  beforeAll(async () => {
    payload = await getPayload({ config })

    const course = await payload.create({
      collection: 'courses',
      data: { title: `Course For Seats ${RUN_ID}`, _status: 'published' },
      overrideAccess: true,
    })
    courseId = course.id
  })

  afterAll(async () => {
    await payload.db.destroy?.()
  })

  /** A fresh `courseSessions` row per test/iteration, so tests never share seat state. */
  const createSession = async (capacity: number, seatsSold = 0): Promise<number> => {
    const session = await payload.create({
      collection: 'courseSessions',
      data: { course: courseId, startDate: new Date().toISOString(), capacity, seatsSold },
      overrideAccess: true,
    })
    return session.id as number
  }

  const seatsSoldOf = async (sessionId: number): Promise<number> => {
    const session = await payload.findByID({ collection: 'courseSessions', id: sessionId, overrideAccess: true })
    return session.seatsSold ?? 0
  }

  const createOrder = async (sessionId: number, quantity: number, paymentStatus: PaymentStatus = 'pending') => {
    const participants = Array.from({ length: quantity }, (_, i) => ({
      name: `Participant ${i}`,
      email: uniqueEmail(`participant-${i}`),
    }))

    return payload.create({
      collection: 'orders',
      data: {
        session: sessionId,
        quantity,
        buyer: { name: 'Buyer', email: uniqueEmail('buyer') },
        participants,
        paymentStatus,
      },
      overrideAccess: true,
    })
  }

  const confirm = (orderId: number) =>
    payload.update({ collection: 'orders', id: orderId, data: { paymentStatus: 'confirmed' }, overrideAccess: true })

  it('a pending order created does not consume seats', async () => {
    const sessionId = await createSession(10)
    await createOrder(sessionId, 2, 'pending')

    expect(await seatsSoldOf(sessionId)).toBe(0)
  })

  it('pending -> confirmed consumes `quantity` seats; re-writing confirmed again is a no-op', async () => {
    const sessionId = await createSession(10)
    const order = await createOrder(sessionId, 3, 'pending')

    await confirm(order.id)
    expect(await seatsSoldOf(sessionId)).toBe(3)

    // Same-status rewrite (confirmed -> confirmed): no transition, must not double-consume.
    await confirm(order.id)
    expect(await seatsSoldOf(sessionId)).toBe(3)
  })

  it('confirmed -> refunded releases seats; refunded -> confirmed re-consumes them (guarded)', async () => {
    const sessionId = await createSession(10)
    const order = await createOrder(sessionId, 2, 'pending')

    await confirm(order.id)
    expect(await seatsSoldOf(sessionId)).toBe(2)

    await payload.update({ collection: 'orders', id: order.id, data: { paymentStatus: 'refunded' }, overrideAccess: true })
    expect(await seatsSoldOf(sessionId)).toBe(0)

    await confirm(order.id)
    expect(await seatsSoldOf(sessionId)).toBe(2)
  })

  it('confirmed -> failed and confirmed -> pending also release seats (symmetric exit from confirmed)', async () => {
    const sessionIdFailed = await createSession(10)
    const orderFailed = await createOrder(sessionIdFailed, 1, 'pending')
    await confirm(orderFailed.id)
    expect(await seatsSoldOf(sessionIdFailed)).toBe(1)
    await payload.update({
      collection: 'orders',
      id: orderFailed.id,
      data: { paymentStatus: 'failed' },
      overrideAccess: true,
    })
    expect(await seatsSoldOf(sessionIdFailed)).toBe(0)

    const sessionIdPending = await createSession(10)
    const orderPending = await createOrder(sessionIdPending, 1, 'pending')
    await confirm(orderPending.id)
    expect(await seatsSoldOf(sessionIdPending)).toBe(1)
    await payload.update({
      collection: 'orders',
      id: orderPending.id,
      data: { paymentStatus: 'pending' },
      overrideAccess: true,
    })
    expect(await seatsSoldOf(sessionIdPending)).toBe(0)
  })

  it('rejects an oversell confirmation, and the order stays un-confirmed in the DB (rollback verified)', async () => {
    const sessionId = await createSession(5, 4) // 1 seat left
    const order = await createOrder(sessionId, 2, 'pending') // needs 2

    await expect(confirm(order.id)).rejects.toThrow(/not enough seats/i)

    // Re-read from the DB (not the rejected promise's value) to prove the rollback actually
    // happened, not just that the promise rejected.
    const reread = await payload.findByID({ collection: 'orders', id: order.id, overrideAccess: true })
    expect(reread.paymentStatus).toBe('pending')
    expect(await seatsSoldOf(sessionId)).toBe(4)
  })

  it('an order created directly with paymentStatus "confirmed" consumes seats immediately (admin manual entry)', async () => {
    const sessionId = await createSession(10)
    await createOrder(sessionId, 4, 'confirmed')

    expect(await seatsSoldOf(sessionId)).toBe(4)
  })

  it('deleting a confirmed order releases its seats', async () => {
    const sessionId = await createSession(10)
    const order = await createOrder(sessionId, 3, 'pending')
    await confirm(order.id)
    expect(await seatsSoldOf(sessionId)).toBe(3)

    await payload.delete({ collection: 'orders', id: order.id, overrideAccess: true })
    expect(await seatsSoldOf(sessionId)).toBe(0)
  })

  it('deleting a never-confirmed (pending) order does not touch seatsSold', async () => {
    const sessionId = await createSession(10)
    const order = await createOrder(sessionId, 2, 'pending')

    await payload.delete({ collection: 'orders', id: order.id, overrideAccess: true })
    expect(await seatsSoldOf(sessionId)).toBe(0)
  })

  describe('concurrency (zero-oversell guarantee)', () => {
    // Run several fresh iterations so the race is actually exercised rather than passing by
    // luck on a single lightly-loaded run.
    const ITERATIONS = 5

    it('exactly one of two concurrent confirmations for the LAST seat succeeds', async () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const sessionId = await createSession(5, 4) // 1 seat left
        const orderA = await createOrder(sessionId, 1, 'pending')
        const orderB = await createOrder(sessionId, 1, 'pending')

        const results = await Promise.allSettled([confirm(orderA.id), confirm(orderB.id)])

        const fulfilled = results.filter((r) => r.status === 'fulfilled')
        const rejected = results.filter((r) => r.status === 'rejected')

        expect(fulfilled).toHaveLength(1)
        expect(rejected).toHaveLength(1)
        expect(await seatsSoldOf(sessionId)).toBe(5)
      }
    })

    it('exactly two of three concurrent confirmations succeed when only two seats remain', async () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const sessionId = await createSession(5, 3) // 2 seats left
        const orders = await Promise.all([
          createOrder(sessionId, 1, 'pending'),
          createOrder(sessionId, 1, 'pending'),
          createOrder(sessionId, 1, 'pending'),
        ])

        const results = await Promise.allSettled(orders.map((order) => confirm(order.id)))

        const fulfilled = results.filter((r) => r.status === 'fulfilled')
        const rejected = results.filter((r) => r.status === 'rejected')

        expect(fulfilled).toHaveLength(2)
        expect(rejected).toHaveLength(1)
        expect(await seatsSoldOf(sessionId)).toBe(5)
      }
    })
  })
})
