import './setup'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '../../src/payload.config'

const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

describe('homepage global (int)', () => {
  let payload: Payload
  let courseId: number

  beforeAll(async () => {
    payload = await getPayload({ config })

    const course = await payload.create({
      collection: 'courses',
      data: { title: `Featured Course ${RUN_ID}`, _status: 'published' },
      overrideAccess: true,
    })
    courseId = course.id
  })

  afterAll(async () => {
    await payload.db.destroy?.()
  })

  it('is publicly readable', async () => {
    const settings = await payload.findGlobal({
      slug: 'homepage',
      overrideAccess: false,
    })
    expect(settings).toBeDefined()
  })

  it('denies public updates', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'homepage',
        data: { hero: { title: 'Hacked title' } },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('resolves the featuredCourses relationship', async () => {
    await payload.updateGlobal({
      slug: 'homepage',
      data: {
        hero: { title: `Real title ${RUN_ID}` },
        featuredCourses: [courseId],
      },
      overrideAccess: true,
    })

    const fetched = await payload.findGlobal({
      slug: 'homepage',
      overrideAccess: true,
      depth: 1,
    })

    const ids = (fetched.featuredCourses ?? []).map((doc) => (typeof doc === 'object' && doc ? doc.id : doc))
    expect(ids).toContain(courseId)
    expect(fetched.hero?.title).toBe(`Real title ${RUN_ID}`)
  })
})
