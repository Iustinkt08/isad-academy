import './setup'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { slugify } from '../../src/fields/slug'
import config from '../../src/payload.config'

// Suffix per test run so unique course slugs never collide with a previous run against
// the same throwaway `isad_test` database (it is created once and reused, not reset).
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

describe('courses (int)', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterAll(async () => {
    await payload.db.destroy?.()
  })

  it('auto-generates a unique slug from the title on create', async () => {
    const title = `ISO/IEC 42001 Foundations ${RUN_ID}`
    const course = await payload.create({
      collection: 'courses',
      data: {
        title,
      },
      overrideAccess: true,
    })

    expect(course.slug).toBe(slugify(title))
  })

  it('does not overwrite a slug that was explicitly provided', async () => {
    const course = await payload.create({
      collection: 'courses',
      data: {
        title: `Custom Slug Course ${RUN_ID}`,
        slug: `my-custom-slug-${RUN_ID}`,
      },
      overrideAccess: true,
    })

    expect(course.slug).toBe(`my-custom-slug-${RUN_ID}`)
  })

  it('hides an unpublished (draft) course from public reads', async () => {
    const draft = await payload.create({
      collection: 'courses',
      data: {
        title: `Draft Only Course ${RUN_ID}`,
      },
      overrideAccess: true,
    })
    expect(draft._status).toBe('draft')

    const publicFind = await payload.find({
      collection: 'courses',
      where: { id: { equals: draft.id } },
      overrideAccess: false,
    })
    expect(publicFind.docs).toHaveLength(0)

    const publicFindByID = await payload.findByID({
      collection: 'courses',
      id: draft.id,
      overrideAccess: false,
      disableErrors: true,
    })
    expect(publicFindByID).toBeNull()
  })

  it('shows a published course to public reads', async () => {
    const published = await payload.create({
      collection: 'courses',
      data: {
        title: `Published Course ${RUN_ID}`,
        _status: 'published',
      },
      overrideAccess: true,
    })

    const publicFind = await payload.find({
      collection: 'courses',
      where: { id: { equals: published.id } },
      overrideAccess: false,
    })
    expect(publicFind.docs).toHaveLength(1)
    expect(publicFind.docs[0]?.id).toBe(published.id)
  })

  it('denies public creation of courses', async () => {
    await expect(
      payload.create({
        collection: 'courses',
        data: { title: `Should Not Be Created ${RUN_ID}` },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('populates the sessions join field from linked courseSessions', async () => {
    const course = await payload.create({
      collection: 'courses',
      data: {
        title: `Course With Sessions ${RUN_ID}`,
        _status: 'published',
      },
      overrideAccess: true,
    })

    const session = await payload.create({
      collection: 'courseSessions',
      data: {
        course: course.id,
        startDate: new Date().toISOString(),
        capacity: 10,
      },
      overrideAccess: true,
    })

    const withSessions = await payload.findByID({
      collection: 'courses',
      id: course.id,
      overrideAccess: true,
    })

    expect(withSessions.sessions?.docs?.map((doc) => (typeof doc === 'number' ? doc : doc.id))).toContain(session.id)
  })
})
