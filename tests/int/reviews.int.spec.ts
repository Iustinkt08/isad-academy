import './setup'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '../../src/payload.config'

// Suffix per test run so unique fields never collide with a previous run against the
// same throwaway `isad_test` database (it is created once and reused, not reset).
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

describe('reviews (int)', () => {
  let payload: Payload
  let courseId: number

  beforeAll(async () => {
    payload = await getPayload({ config })

    const course = await payload.create({
      collection: 'courses',
      data: { title: `Course For Reviews ${RUN_ID}`, _status: 'published' },
      overrideAccess: true,
    })
    courseId = course.id
  })

  afterAll(async () => {
    await payload.db.destroy?.()
  })

  it('public read is limited to showOnHome=true (T16); admin-style reads see everything', async () => {
    const curated = await payload.create({
      collection: 'reviews',
      data: {
        text: `Great course! ${RUN_ID}`,
        authorName: 'Jane Reviewer',
        source: 'manual',
        showOnHome: true,
      },
      overrideAccess: true,
    })
    const uncurated = await payload.create({
      collection: 'reviews',
      data: {
        text: `Not yet curated ${RUN_ID}`,
        authorName: 'John Uncurated',
        source: 'manual',
        showOnHome: false,
      },
      overrideAccess: true,
    })

    // Curated review: publicly readable.
    const publicCurated = await payload.find({
      collection: 'reviews',
      where: { id: { equals: curated.id } },
      overrideAccess: false,
    })
    expect(publicCurated.docs).toHaveLength(1)

    // Uncurated review: invisible to anonymous reads…
    const publicUncurated = await payload.find({
      collection: 'reviews',
      where: { id: { equals: uncurated.id } },
      overrideAccess: false,
    })
    expect(publicUncurated.docs).toHaveLength(0)

    // …but still visible to an AUTHENTICATED admin user with access rules fully applied
    // (overrideAccess: false + a real user, not an access bypass).
    const admin = await payload.create({
      collection: 'users',
      data: {
        email: `reviews-admin-${RUN_ID}@example.com`,
        password: 'test-password-123',
        role: 'admin',
      },
      overrideAccess: true,
    })
    const adminUncurated = await payload.find({
      collection: 'reviews',
      where: { id: { equals: uncurated.id } },
      overrideAccess: false,
      user: { ...admin, collection: 'users' },
    })
    expect(adminUncurated.docs).toHaveLength(1)
  })

  it('denies public creation (the public submit route arrives in T13 via Local API)', async () => {
    await expect(
      payload.create({
        collection: 'reviews',
        data: { text: `Should not be created ${RUN_ID}`, source: 'emailForm' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('defaults showOnHome to false and has no rating field', async () => {
    const review = await payload.create({
      collection: 'reviews',
      data: { text: `No rating here ${RUN_ID}`, source: 'manual' },
      overrideAccess: true,
    })

    expect(review.showOnHome).toBe(false)
    expect((review as unknown as { rating?: unknown }).rating).toBeUndefined()
  })

  it('resolves the course relationship', async () => {
    const review = await payload.create({
      collection: 'reviews',
      data: {
        text: `Loved the AI governance module ${RUN_ID}`,
        source: 'manual',
        course: courseId,
      },
      overrideAccess: true,
    })

    const fetched = await payload.findByID({
      collection: 'reviews',
      id: review.id,
      overrideAccess: true,
      depth: 1,
    })

    const relatedCourse = fetched.course
    const relatedCourseId = typeof relatedCourse === 'object' && relatedCourse ? relatedCourse.id : relatedCourse
    expect(relatedCourseId).toBe(courseId)
  })
})
