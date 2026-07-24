import './setup'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { slugify } from '../../src/fields/slug'
import config from '../../src/payload.config'

// Suffix per test run so unique fields (slug, media alt) never collide with a previous
// run against the same throwaway `isad_test` database.
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

// Smallest valid 1x1 transparent PNG — used to create a real `media` doc so relationship
// (leadMagnet.file) and upload FK constraints resolve for real in Postgres.
const TINY_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000155273105000000004945454e44ae426082',
  'hex',
)

describe('blogPosts (int)', () => {
  let payload: Payload
  let courseId: number

  beforeAll(async () => {
    payload = await getPayload({ config })

    const course = await payload.create({
      collection: 'courses',
      data: { title: `Course For Blog ${RUN_ID}`, _status: 'published' },
      overrideAccess: true,
    })
    courseId = course.id
  })

  afterAll(async () => {
    await payload.db.destroy?.()
  })

  it('auto-generates a unique slug from the title on create', async () => {
    const title = `Why ISO 42001 Matters ${RUN_ID}`
    const post = await payload.create({
      collection: 'blogPosts',
      data: { title, excerpt: 'An excerpt.' },
      overrideAccess: true,
    })

    expect(post.slug).toBe(slugify(title))
  })

  it('hides a draft post from public reads', async () => {
    const draft = await payload.create({
      collection: 'blogPosts',
      data: { title: `Draft Post ${RUN_ID}` },
      overrideAccess: true,
    })
    expect(draft._status).toBe('draft')

    const publicFind = await payload.find({
      collection: 'blogPosts',
      where: { id: { equals: draft.id } },
      overrideAccess: false,
    })
    expect(publicFind.docs).toHaveLength(0)
  })

  it('shows a published post to public reads', async () => {
    const published = await payload.create({
      collection: 'blogPosts',
      data: { title: `Published Post ${RUN_ID}`, _status: 'published' },
      overrideAccess: true,
    })

    const publicFind = await payload.find({
      collection: 'blogPosts',
      where: { id: { equals: published.id } },
      overrideAccess: false,
    })
    expect(publicFind.docs).toHaveLength(1)
  })

  it('denies public creation', async () => {
    await expect(
      payload.create({
        collection: 'blogPosts',
        data: { title: `Should Not Be Created ${RUN_ID}` },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('defaults author to "Dr. Silviu Gresoi" but allows overriding it', async () => {
    const defaultAuthorPost = await payload.create({
      collection: 'blogPosts',
      data: { title: `Default Author Post ${RUN_ID}` },
      overrideAccess: true,
    })
    expect(defaultAuthorPost.author).toBe('Dr. Silviu Gresoi')

    const overriddenAuthorPost = await payload.create({
      collection: 'blogPosts',
      data: { title: `Overridden Author Post ${RUN_ID}`, author: 'Guest Author' },
      overrideAccess: true,
    })
    expect(overriddenAuthorPost.author).toBe('Guest Author')
  })

  it('persists the leadMagnet group (enabled + file) and resolves the relatedCourse relationship', async () => {
    const media = await payload.create({
      collection: 'media',
      data: { alt: `Lead magnet PDF ${RUN_ID}` },
      file: {
        data: TINY_PNG,
        mimetype: 'image/png',
        name: `lead-magnet-${RUN_ID}.png`,
        size: TINY_PNG.length,
      },
      overrideAccess: true,
    })

    const post = await payload.create({
      collection: 'blogPosts',
      data: {
        title: `Gated Article ${RUN_ID}`,
        _status: 'published',
        leadMagnet: { enabled: true, file: media.id },
        relatedCourse: courseId,
      },
      overrideAccess: true,
    })

    const fetched = await payload.findByID({
      collection: 'blogPosts',
      id: post.id,
      overrideAccess: true,
      depth: 1,
    })

    expect(fetched.leadMagnet?.enabled).toBe(true)
    const file = fetched.leadMagnet?.file
    const fileId = typeof file === 'object' && file ? file.id : file
    expect(fileId).toBe(media.id)

    const relatedCourse = fetched.relatedCourse
    const relatedCourseId = typeof relatedCourse === 'object' && relatedCourse ? relatedCourse.id : relatedCourse
    expect(relatedCourseId).toBe(courseId)
  })

  it('auto-computes readingTime from the body (~200 wpm) when left empty', async () => {
    const words = Array.from({ length: 450 }, (_, i) => `word${i}`).join(' ')
    const post = await payload.create({
      collection: 'blogPosts',
      data: {
        title: `Auto Reading Time ${RUN_ID}`,
        body: {
          root: {
            type: 'root',
            children: [
              { type: 'paragraph', children: [{ type: 'text', text: words, version: 1 }], version: 1 },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        },
      },
      overrideAccess: true,
    })

    // 450 words / 200 wpm = 2.25 → rounded up to 3
    expect(post.readingTime).toBe(3)
  })

  it('a manual readingTime always wins over the auto-estimate', async () => {
    const post = await payload.create({
      collection: 'blogPosts',
      data: {
        title: `Manual Reading Time ${RUN_ID}`,
        readingTime: 42,
        body: {
          root: {
            type: 'root',
            children: [
              { type: 'paragraph', children: [{ type: 'text', text: 'Short body.', version: 1 }], version: 1 },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        },
      },
      overrideAccess: true,
    })
    expect(post.readingTime).toBe(42)

    // Clearing it on update triggers a fresh estimate from the (unchanged) body.
    const cleared = await payload.update({
      collection: 'blogPosts',
      id: post.id,
      data: { readingTime: null },
      overrideAccess: true,
    })
    expect(cleared.readingTime).toBe(1)
  })

  it('leaves readingTime empty when there is no body to estimate from', async () => {
    const post = await payload.create({
      collection: 'blogPosts',
      data: { title: `No Body Reading Time ${RUN_ID}` },
      overrideAccess: true,
    })
    expect(post.readingTime ?? null).toBeNull()
  })

  it('rejects an enabled leadMagnet with no file attached', async () => {
    await expect(
      payload.create({
        collection: 'blogPosts',
        data: {
          title: `Broken Gated Article ${RUN_ID}`,
          leadMagnet: { enabled: true },
        },
        overrideAccess: true,
      }),
    ).rejects.toThrow()
  })
})
