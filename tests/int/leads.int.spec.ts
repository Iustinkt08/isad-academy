import './setup'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '../../src/payload.config'

// Suffix per test run so unique fields never collide with a previous run against the
// same throwaway `isad_test` database.
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

describe('leads (int)', () => {
  let payload: Payload
  let courseId: number

  beforeAll(async () => {
    payload = await getPayload({ config })

    const course = await payload.create({
      collection: 'courses',
      data: { title: `Course For Leads ${RUN_ID}`, _status: 'published' },
      overrideAccess: true,
    })
    courseId = course.id
  })

  afterAll(async () => {
    await payload.db.destroy?.()
  })

  it('allows public creation (contact + corporate lead forms submit anonymously)', async () => {
    const lead = await payload.create({
      collection: 'leads',
      data: {
        type: 'contact',
        name: `Anon Visitor ${RUN_ID}`,
        email: `anon-${RUN_ID}@example.com`,
        subject: 'course',
        message: 'Tell me more about the ISO 42001 course.',
      },
      overrideAccess: false,
    })

    expect(lead.id).toBeDefined()
  })

  it('denies public reads', async () => {
    await expect(payload.find({ collection: 'leads', overrideAccess: false })).rejects.toThrow()
  })

  it('rejects an invalid email format', async () => {
    await expect(
      payload.create({
        collection: 'leads',
        data: {
          type: 'contact',
          name: `Bad Email ${RUN_ID}`,
          email: 'not-an-email',
          subject: 'other',
        },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('persists contact-only fields on a contact lead', async () => {
    const lead = await payload.create({
      collection: 'leads',
      data: {
        type: 'contact',
        name: `Contact Lead ${RUN_ID}`,
        email: `contact-${RUN_ID}@example.com`,
        phone: '+40 700 000 000',
        subject: 'certification',
        message: 'What does the CPD credential cover?',
      },
      overrideAccess: false,
    })

    expect(lead.subject).toBe('certification')
  })

  it('persists corporate-only fields and resolves the topicCourse relationship', async () => {
    const lead = await payload.create({
      collection: 'leads',
      data: {
        type: 'corporate',
        name: `Corporate Contact ${RUN_ID}`,
        email: `corporate-${RUN_ID}@example.com`,
        companyName: 'Acme Bank SRL',
        contactPerson: 'Maria Ionescu',
        participantsRange: '10-20',
        topicCourse: courseId,
        preferredPeriod: { from: new Date().toISOString(), to: new Date(Date.now() + 30 * 86400000).toISOString() },
      },
      overrideAccess: false,
    })

    const fetched = await payload.findByID({
      collection: 'leads',
      id: lead.id,
      overrideAccess: true,
      depth: 1,
    })

    expect(fetched.companyName).toBe('Acme Bank SRL')
    expect(fetched.participantsRange).toBe('10-20')
    const relatedCourse = fetched.topicCourse
    const relatedCourseId = typeof relatedCourse === 'object' && relatedCourse ? relatedCourse.id : relatedCourse
    expect(relatedCourseId).toBe(courseId)
  })

  it('supports topicOther as a free-text alternative to topicCourse', async () => {
    const lead = await payload.create({
      collection: 'leads',
      data: {
        type: 'corporate',
        name: `Corporate Other Topic ${RUN_ID}`,
        email: `corporate-other-${RUN_ID}@example.com`,
        companyName: 'Other Topic SRL',
        contactPerson: 'Ion Popescu',
        participantsRange: '5-10',
        topicOther: 'Custom in-house fraud detection workshop',
      },
      overrideAccess: false,
    })

    expect(lead.topicOther).toBe('Custom in-house fraud detection workshop')
  })
})
