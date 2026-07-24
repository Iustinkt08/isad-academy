import './setup'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '../../src/payload.config'

// Suffix per test run so unique slugs never collide with a previous run against the same
// throwaway `isad_test` database (it is created once and reused, not reset).
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

/**
 * T14 — @payloadcms/plugin-seo integration: `meta.title` / `meta.description` /
 * `meta.image` persist on both `courses` and `blogPosts` (docs/PLAN.md locked decision:
 * fields live at `meta.*`, not `metaTitle`). The frontend generateMetadata functions
 * prefer these over the content fallbacks.
 */
describe('plugin-seo meta fields (int)', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterAll(async () => {
    await payload.db.destroy?.()
  })

  it('persists meta.title and meta.description on courses', async () => {
    const course = await payload.create({
      collection: 'courses',
      data: {
        title: `SEO Meta Course ${RUN_ID}`,
        meta: {
          title: 'Custom SEO title | isad.academy',
          description: 'Custom SEO description for the course.',
        },
      },
      overrideAccess: true,
    })

    const fetched = await payload.findByID({
      collection: 'courses',
      id: course.id,
      overrideAccess: true,
    })
    expect(fetched.meta?.title).toBe('Custom SEO title | isad.academy')
    expect(fetched.meta?.description).toBe('Custom SEO description for the course.')
  })

  it('persists meta fields on blogPosts and leaves them empty by default', async () => {
    const post = await payload.create({
      collection: 'blogPosts',
      data: {
        title: `SEO Meta Post ${RUN_ID}`,
        meta: { title: 'Post SEO title | isad.academy' },
      },
      overrideAccess: true,
    })
    expect(post.meta?.title).toBe('Post SEO title | isad.academy')

    const bare = await payload.create({
      collection: 'blogPosts',
      data: { title: `No Meta Post ${RUN_ID}` },
      overrideAccess: true,
    })
    expect(bare.meta?.title ?? null).toBeNull()
  })
})
