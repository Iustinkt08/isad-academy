import './setup'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '../../src/payload.config'
import { POST } from '../../src/app/api/leads/submit/route'

// Suffix per test run so lookups never collide with leftovers from a previous run against
// the same throwaway `isad_test` database.
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
let emailCounter = 0
const uniqueEmail = (label: string): string => `${label}-${RUN_ID}-${emailCounter++}@example.com`

type JsonBody = { ok?: boolean; error?: string }

const postLead = async (body: unknown): Promise<{ status: number; json: JsonBody }> => {
  const request = new Request('http://localhost/api/leads/submit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const response = await POST(request)
  return { status: response.status, json: (await response.json()) as JsonBody }
}

describe('POST /api/leads/submit (int) — T11', () => {
  let payload: Payload
  let publishedCourseId: number
  let draftCourseId: number

  beforeAll(async () => {
    payload = await getPayload({ config })

    const published = await payload.create({
      collection: 'courses',
      data: { title: `Leads Route Course ${RUN_ID}`, _status: 'published' },
      overrideAccess: true,
    })
    publishedCourseId = published.id

    const draft = await payload.create({
      collection: 'courses',
      data: { title: `Leads Route Draft ${RUN_ID}`, _status: 'draft' },
      overrideAccess: true,
    })
    draftCourseId = draft.id
  })

  afterAll(async () => {
    await payload.db.destroy?.()
  })

  const leadsByEmail = async (email: string) => {
    const found = await payload.find({
      collection: 'leads',
      where: { email: { equals: email } },
      overrideAccess: true,
      limit: 10,
    })
    return found.docs
  }

  it('creates a contact lead (201) with all contact fields persisted', async () => {
    const email = uniqueEmail('contact-happy')
    const { status, json } = await postLead({
      type: 'contact',
      name: 'Happy Contact',
      email,
      phone: '+40 700 000 001',
      subject: 'certification',
      message: 'How do CPD credits work?',
      website: '', // empty honeypot — a legitimate browser submission
    })

    expect(status).toBe(201)
    expect(json).toEqual({ ok: true })

    const [lead] = await leadsByEmail(email)
    expect(lead).toMatchObject({
      type: 'contact',
      name: 'Happy Contact',
      phone: '+40 700 000 001',
      subject: 'certification',
      message: 'How do CPD credits work?',
    })
  })

  it('creates a corporate lead (201) with a validated topicCourse; contactPerson doubles as name', async () => {
    const email = uniqueEmail('corporate-happy')
    const { status, json } = await postLead({
      type: 'corporate',
      companyName: 'Acme Bank SRL',
      contactPerson: 'Maria Ionescu',
      email,
      participantsRange: '6–10',
      topicCourse: publishedCourseId,
      preferredPeriod: { from: '2026-09-01', to: '2026-09-30' },
    })

    expect(status).toBe(201)
    expect(json).toEqual({ ok: true })

    const [lead] = await leadsByEmail(email)
    expect(lead).toMatchObject({
      type: 'corporate',
      name: 'Maria Ionescu', // leads.name is required — the contact person doubles as it
      companyName: 'Acme Bank SRL',
      contactPerson: 'Maria Ionescu',
      participantsRange: '6–10',
    })
    const topicCourse = lead!.topicCourse
    const topicCourseId = typeof topicCourse === 'object' && topicCourse ? topicCourse.id : topicCourse
    expect(topicCourseId).toBe(publishedCourseId)
    expect(lead!.preferredPeriod?.from).toBeTruthy()
    expect(lead!.preferredPeriod?.to).toBeTruthy()
  })

  it('creates a corporate lead with topicOther instead of topicCourse', async () => {
    const email = uniqueEmail('corporate-other')
    const { status } = await postLead({
      type: 'corporate',
      companyName: 'Other Topic SRL',
      contactPerson: 'Ion Popescu',
      email,
      participantsRange: '3–5',
      topicOther: 'Custom anti-fraud analytics workshop',
    })

    expect(status).toBe(201)
    const [lead] = await leadsByEmail(email)
    expect(lead!.topicOther).toBe('Custom anti-fraud analytics workshop')
    expect(lead!.topicCourse ?? null).toBeNull()
  })

  it('rejects a topicCourse that does not exist (400, no lead created)', async () => {
    const email = uniqueEmail('corporate-bad-course')
    const { status, json } = await postLead({
      type: 'corporate',
      companyName: 'Ghost Course SRL',
      contactPerson: 'Ana Ghost',
      email,
      topicCourse: 99_999_999,
    })

    expect(status).toBe(400)
    expect(json.ok).toBe(false)
    expect(json.error).toContain('topicCourse')
    expect(await leadsByEmail(email)).toHaveLength(0)
  })

  it('rejects a DRAFT course as topicCourse — public form only ever offers published ones', async () => {
    const email = uniqueEmail('corporate-draft-course')
    const { status, json } = await postLead({
      type: 'corporate',
      companyName: 'Draft Course SRL',
      contactPerson: 'Dan Draft',
      email,
      topicCourse: draftCourseId,
    })

    expect(status).toBe(400)
    expect(json.ok).toBe(false)
    expect(await leadsByEmail(email)).toHaveLength(0)
  })

  it('rejects a bad contact subject (400, no lead created)', async () => {
    const email = uniqueEmail('contact-bad-subject')
    const { status, json } = await postLead({
      type: 'contact',
      name: 'Bad Subject',
      email,
      subject: 'sales',
      message: 'Hello.',
    })

    expect(status).toBe(400)
    expect(json.ok).toBe(false)
    expect(json.error).toContain('"subject"')
    expect(await leadsByEmail(email)).toHaveLength(0)
  })

  it('rejects missing required fields per type (400)', async () => {
    // contact without a message
    const contactEmail = uniqueEmail('contact-missing')
    const contact = await postLead({
      type: 'contact',
      name: 'No Message',
      email: contactEmail,
      subject: 'course',
    })
    expect(contact.status).toBe(400)
    expect(await leadsByEmail(contactEmail)).toHaveLength(0)

    // corporate without a companyName
    const corporateEmail = uniqueEmail('corporate-missing')
    const corporate = await postLead({
      type: 'corporate',
      contactPerson: 'No Company',
      email: corporateEmail,
      topicOther: 'Anything',
    })
    expect(corporate.status).toBe(400)
    expect(await leadsByEmail(corporateEmail)).toHaveLength(0)
  })

  it('honeypot: non-empty "website" pretends success (201) but creates NO lead', async () => {
    const email = uniqueEmail('honeypot-bot')
    const { status, json } = await postLead({
      type: 'contact',
      name: 'Bot McBotface',
      email,
      subject: 'other',
      message: 'Buy cheap widgets!',
      website: 'https://spam.example.com',
    })

    // Indistinguishable from a real success — the bot learns nothing.
    expect(status).toBe(201)
    expect(json).toEqual({ ok: true })
    expect(await leadsByEmail(email)).toHaveLength(0)
  })

  it('rejects unknown fields at the top level (400, mass-assignment hygiene)', async () => {
    const email = uniqueEmail('contact-unknown-field')
    const { status, json } = await postLead({
      type: 'contact',
      name: 'Unknown Field',
      email,
      subject: 'other',
      message: 'Hello.',
      isAdmin: true,
    })

    expect(status).toBe(400)
    expect(json.error).toContain('isAdmin')
    expect(await leadsByEmail(email)).toHaveLength(0)
  })

  it('rejects a preferredPeriod with from after to (400)', async () => {
    const email = uniqueEmail('corporate-bad-period')
    const { status } = await postLead({
      type: 'corporate',
      companyName: 'Backwards Period SRL',
      contactPerson: 'Tim Traveler',
      email,
      topicOther: 'AI governance intro',
      preferredPeriod: { from: '2026-10-01', to: '2026-09-01' },
    })

    expect(status).toBe(400)
    expect(await leadsByEmail(email)).toHaveLength(0)
  })

  it('rejects malformed JSON (400) and an oversized body (413)', async () => {
    const malformed = await POST(
      new Request('http://localhost/api/leads/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{not json',
      }),
    )
    expect(malformed.status).toBe(400)

    const oversized = await POST(
      new Request('http://localhost/api/leads/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'contact', message: 'x'.repeat(25_000) }),
      }),
    )
    expect(oversized.status).toBe(413)
  })
})
