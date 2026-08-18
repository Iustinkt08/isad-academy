import './setup'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { applyPaymentOutcome } from '../../src/lib/checkout'
import config from '../../src/payload.config'
import type { Order } from '../../src/payload-types'

const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

/**
 * applyPaymentOutcome: regulile de tranziție + verificarea de sumă a IPN-ului.
 * Scrise după feedback-ul verificării Netopia (2026-08-18): testul lor retrimite
 * notificări pentru comenzi deja rezolvate, iar răspunsul corect e succes idempotent,
 * nu "amount mismatch"; iar o comandă refunded nu se mai re-confirmă niciodată.
 */
describe('applyPaymentOutcome (int)', () => {
  let payload: Payload
  let sessionId: number

  const createOrder = async (
    overrides: Partial<{ paymentStatus: Order['paymentStatus']; total: number; currency: 'EUR' | 'RON'; providerRef: string }> = {},
  ): Promise<Order> => {
    const { paymentStatus = 'pending', total = 100, currency = 'RON', providerRef = `ntp-${RUN_ID}` } = overrides
    return (await payload.create({
      collection: 'orders',
      data: {
        session: sessionId,
        quantity: 1,
        buyer: { name: 'Test Buyer', email: 'buyer@example.com' },
        participants: [{ name: 'Test Buyer', email: 'buyer@example.com' }],
        pricing: { basePrice: total, currency, total },
        paymentStatus,
        provider: 'netopia',
        providerRef,
      },
      overrideAccess: true,
    })) as Order
  }

  const confirm = (orderId: number, extra: { expectedAmount?: number | string; expectedCurrency?: string } = {}) =>
    applyPaymentOutcome({
      payload,
      orderId,
      outcome: 'confirmed',
      expectedProvider: 'netopia',
      expectedProviderRef: `ntp-${RUN_ID}`,
      ...extra,
    })

  const seatsSold = async (): Promise<number> => {
    const session = await payload.findByID({
      collection: 'courseSessions',
      id: sessionId,
      overrideAccess: true,
      depth: 0,
    })
    return (session as { seatsSold?: number | null }).seatsSold ?? 0
  }

  beforeAll(async () => {
    payload = await getPayload({ config })
    const course = await payload.create({
      collection: 'courses',
      data: { title: `Course For Outcomes ${RUN_ID}`, _status: 'published' },
      overrideAccess: true,
    })
    const session = await payload.create({
      collection: 'courseSessions',
      data: { course: course.id, startDate: new Date().toISOString(), capacity: 50 },
      overrideAccess: true,
    })
    sessionId = session.id
  })

  afterAll(async () => {
    await payload.db.destroy?.()
  })

  it('confirms a pending order when the reported amount and currency match', async () => {
    const order = await createOrder()
    const result = await confirm(order.id, { expectedAmount: 100, expectedCurrency: 'RON' })
    expect(result).toMatchObject({ ok: true, changed: true })
  })

  it('accepts a matching amount reported as a numeric string', async () => {
    const order = await createOrder()
    const result = await confirm(order.id, { expectedAmount: '100.00', expectedCurrency: 'ron' })
    expect(result).toMatchObject({ ok: true, changed: true })
  })

  it('refuses to confirm a pending order on amount mismatch and leaves it pending', async () => {
    const order = await createOrder()
    const result = await confirm(order.id, { expectedAmount: 1, expectedCurrency: 'RON' })
    expect(result).toMatchObject({ ok: false, reason: 'amountMismatch' })
    const after = (await payload.findByID({
      collection: 'orders',
      id: order.id,
      overrideAccess: true,
      depth: 0,
    })) as Order
    expect(after.paymentStatus).toBe('pending')
  })

  it('refuses to confirm on currency mismatch', async () => {
    const order = await createOrder({ currency: 'EUR' })
    const result = await confirm(order.id, { expectedAmount: 100, expectedCurrency: 'RON' })
    expect(result).toMatchObject({ ok: false, reason: 'amountMismatch' })
  })

  it('treats a replayed IPN for an ALREADY CONFIRMED order as an idempotent success, even with another amount', async () => {
    const order = await createOrder()
    await confirm(order.id, { expectedAmount: 100, expectedCurrency: 'RON' })
    // Replica testerului Netopia: aceeași comandă, sumă diferită. Comanda e deja
    // rezolvată, deci răspunsul e succes fără efect, nu amountMismatch.
    const replay = await confirm(order.id, { expectedAmount: 1, expectedCurrency: 'RON' })
    expect(replay).toMatchObject({ ok: true, changed: false })
  })

  it('never re-confirms a REFUNDED order from a late paid-IPN and does not re-consume the seat', async () => {
    const before = await seatsSold()
    const order = await createOrder()
    await confirm(order.id, { expectedAmount: 100, expectedCurrency: 'RON' })
    expect(await seatsSold()).toBe(before + 1)

    await payload.update({
      collection: 'orders',
      id: order.id,
      data: { paymentStatus: 'refunded' },
      overrideAccess: true,
    })
    expect(await seatsSold()).toBe(before)

    const replay = await confirm(order.id, { expectedAmount: 100, expectedCurrency: 'RON' })
    expect(replay).toMatchObject({ ok: false, reason: 'skipped' })
    const after = (await payload.findByID({
      collection: 'orders',
      id: order.id,
      overrideAccess: true,
      depth: 0,
    })) as Order
    expect(after.paymentStatus).toBe('refunded')
    expect(await seatsSold()).toBe(before)
  })

  it('still rejects a notification whose transaction ref does not match the stored one', async () => {
    const order = await createOrder()
    const result = await applyPaymentOutcome({
      payload,
      orderId: order.id,
      outcome: 'confirmed',
      expectedProvider: 'netopia',
      expectedProviderRef: 'ntp-someone-else',
      expectedAmount: 100,
      expectedCurrency: 'RON',
    })
    expect(result).toMatchObject({ ok: false, reason: 'refMismatch' })
  })
})
