import './setup'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '../../src/payload.config'

const DAY_MS = 24 * 60 * 60 * 1000
const iso = (offsetDays: number): string => new Date(Date.now() + offsetDays * DAY_MS).toISOString()

// Suffix per test run so the unique course slug never collides with a previous run
// against the same throwaway `isad_test` database.
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

describe('courseSessions (int)', () => {
  let payload: Payload
  let courseId: number

  beforeAll(async () => {
    payload = await getPayload({ config })

    const course = await payload.create({
      collection: 'courses',
      data: { title: `Course For Sessions ${RUN_ID}`, _status: 'published' },
      overrideAccess: true,
    })
    courseId = course.id
  })

  afterAll(async () => {
    await payload.db.destroy?.()
  })

  it('is publicly readable when the parent course is published', async () => {
    const session = await payload.create({
      collection: 'courseSessions',
      data: { course: courseId, startDate: iso(30), capacity: 10 },
      overrideAccess: true,
    })

    const publicFind = await payload.find({
      collection: 'courseSessions',
      where: { id: { equals: session.id } },
      overrideAccess: false,
    })
    expect(publicFind.docs).toHaveLength(1)
  })

  it('hides a DRAFT course\'s sessions from anonymous reads; an authenticated admin sees both (T16)', async () => {
    const draftCourse = await payload.create({
      collection: 'courses',
      data: { title: `Draft Course For Sessions ${RUN_ID}`, _status: 'draft' },
      overrideAccess: true,
    })
    const draftSession = await payload.create({
      collection: 'courseSessions',
      data: { course: draftCourse.id, startDate: iso(30), capacity: 10 },
      overrideAccess: true,
    })
    const publishedSession = await payload.create({
      collection: 'courseSessions',
      data: { course: courseId, startDate: iso(31), capacity: 10 },
      overrideAccess: true,
    })

    // Anonymous: the draft course's session is invisible — by id…
    const publicById = await payload.find({
      collection: 'courseSessions',
      where: { id: { equals: draftSession.id } },
      overrideAccess: false,
    })
    expect(publicById.docs).toHaveLength(0)

    // …and in an unfiltered list (the /api/courseSessions enumeration shape).
    const publicList = await payload.find({
      collection: 'courseSessions',
      limit: 1000,
      overrideAccess: false,
    })
    const publicIds = publicList.docs.map((doc) => doc.id)
    expect(publicIds).not.toContain(draftSession.id)
    expect(publicIds).toContain(publishedSession.id)

    // An authenticated admin (real user, access rules applied — NOT an override) sees both.
    const admin = await payload.create({
      collection: 'users',
      data: {
        email: `sessions-admin-${RUN_ID}@example.com`,
        password: 'test-password-123',
        role: 'admin',
      },
      overrideAccess: true,
    })
    const adminList = await payload.find({
      collection: 'courseSessions',
      limit: 1000,
      overrideAccess: false,
      user: { ...admin, collection: 'users' },
    })
    const adminIds = adminList.docs.map((doc) => doc.id)
    expect(adminIds).toContain(draftSession.id)
    expect(adminIds).toContain(publishedSession.id)
  })

  it('computes seatsRemaining as capacity - seatsSold', async () => {
    const session = await payload.create({
      collection: 'courseSessions',
      data: { course: courseId, startDate: iso(30), capacity: 20, seatsSold: 5 },
      overrideAccess: true,
    })

    const fetched = await payload.findByID({
      collection: 'courseSessions',
      id: session.id,
      overrideAccess: true,
    })

    expect(fetched.seatsRemaining).toBe(15)
  })

  it('status = "upcoming" when seats remain and a price window is active', async () => {
    const session = await payload.create({
      collection: 'courseSessions',
      data: {
        course: courseId,
        startDate: iso(30),
        schedule: [{ date: iso(30), startTime: '09:00', endTime: '17:00' }],
        capacity: 10,
        seatsSold: 0,
        standard: { price: 500, startDate: iso(-5), endDate: iso(60) },
      },
      overrideAccess: true,
    })

    const fetched = await payload.findByID({ collection: 'courseSessions', id: session.id, overrideAccess: true })
    expect(fetched.status).toBe('upcoming')
  })

  it('status = "past" once the last scheduled day has fully elapsed (even if startDate is earlier)', async () => {
    const session = await payload.create({
      collection: 'courseSessions',
      data: {
        course: courseId,
        startDate: iso(-10),
        schedule: [
          { date: iso(-10), startTime: '09:00', endTime: '17:00' },
          { date: iso(-2), startTime: '09:00', endTime: '17:00' },
        ],
        capacity: 10,
        seatsSold: 8,
        standard: { price: 500, startDate: iso(-20), endDate: iso(-3) },
      },
      overrideAccess: true,
    })

    const fetched = await payload.findByID({ collection: 'courseSessions', id: session.id, overrideAccess: true })
    expect(fetched.status).toBe('past')
  })

  it('status = "soldOut" when no seats remain, even while a price window is active', async () => {
    const session = await payload.create({
      collection: 'courseSessions',
      data: {
        course: courseId,
        startDate: iso(30),
        capacity: 5,
        seatsSold: 5,
        standard: { price: 500, startDate: iso(-5), endDate: iso(60) },
      },
      overrideAccess: true,
    })

    const fetched = await payload.findByID({ collection: 'courseSessions', id: session.id, overrideAccess: true })
    expect(fetched.seatsRemaining).toBe(0)
    expect(fetched.status).toBe('soldOut')
  })

  it('status = "noActiveWindow" when seats remain but neither price window is on sale yet', async () => {
    const session = await payload.create({
      collection: 'courseSessions',
      data: {
        course: courseId,
        startDate: iso(60),
        capacity: 10,
        seatsSold: 0,
        earlyBird: { price: 400, startDate: iso(40), endDate: iso(50) },
        standard: { price: 500, startDate: iso(51), endDate: iso(59) },
      },
      overrideAccess: true,
    })

    const fetched = await payload.findByID({ collection: 'courseSessions', id: session.id, overrideAccess: true })
    expect(fetched.status).toBe('noActiveWindow')
  })

  it('denies public creation of courseSessions', async () => {
    await expect(
      payload.create({
        collection: 'courseSessions',
        data: { course: courseId, startDate: iso(30), capacity: 10 },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })
})
