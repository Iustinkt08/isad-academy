import './setup'

import { getPayload, type Payload } from 'payload'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import type { Mailer, MailerResult } from '../../src/lib/email'
import { setMailerForTesting } from '../../src/lib/email'
import config from '../../src/payload.config'

// Suffix per test run so unique fields (emails, titles) never collide with leftovers from a
// previous run against the same throwaway `isad_test` database.
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
let emailCounter = 0
const uniqueEmail = (label: string): string => `${label}-${RUN_ID}-${emailCounter++}@example.com`

type RecordedCall = { method: 'broadcastCampaign' | 'broadcastNewPost' | 'sendTransactional' | 'subscribeDoubleOptIn' | 'addToNewsletterList'; args: unknown }

/** A recording `Mailer` — never hits the network, just remembers every call so hooks can be
 * asserted on "exactly once"/"exactly zero" without any Brevo config. */
const createFakeMailer = (result: MailerResult = { ok: true }): Mailer & { calls: RecordedCall[] } => {
  const calls: RecordedCall[] = []
  return {
    name: 'fake',
    calls,
    async sendTransactional(input) {
      calls.push({ method: 'sendTransactional', args: input })
      return result
    },
    async addToNewsletterList(input) {
      calls.push({ method: 'addToNewsletterList', args: input })
      return { ok: true as const }
    },
    async subscribeDoubleOptIn(input) {
      calls.push({ method: 'subscribeDoubleOptIn', args: input })
      return result
    },
    async broadcastNewPost(input) {
      calls.push({ method: 'broadcastNewPost', args: input })
      return result
    },
    async broadcastCampaign(input) {
      calls.push({ method: 'broadcastCampaign', args: input })
      return result
    },
  }
}

describe('email hooks (int) — T7', () => {
  let payload: Payload
  let courseId: number
  let originalContactEmail: string | null | undefined

  beforeAll(async () => {
    payload = await getPayload({ config })

    const course = await payload.create({
      collection: 'courses',
      data: { title: `Course For Email Hooks ${RUN_ID}`, _status: 'published' },
      overrideAccess: true,
    })
    courseId = course.id

    // Capture whatever `siteSettings.contact.email` was before this file touches it, so
    // `afterAll` can put it back — this global is shared by the whole int suite's throwaway
    // DB, not scoped to this file.
    const settings = await payload.findGlobal({ slug: 'siteSettings', overrideAccess: true })
    originalContactEmail = settings.contact?.email

    await payload.updateGlobal({
      slug: 'siteSettings',
      data: { contact: { email: `notify-${RUN_ID}@example.com` } },
      overrideAccess: true,
    })
  })

  afterAll(async () => {
    await payload.updateGlobal({
      slug: 'siteSettings',
      data: { contact: { email: originalContactEmail ?? '' } },
      overrideAccess: true,
    })
    await payload.db.destroy?.()
  })

  afterEach(() => {
    setMailerForTesting(null)
  })

  const createSession = async (capacity = 10): Promise<number> => {
    const session = await payload.create({
      collection: 'courseSessions',
      data: { course: courseId, startDate: new Date().toISOString(), capacity },
      overrideAccess: true,
    })
    return session.id as number
  }

  describe('orders -> sendOrderConfirmationEmail', () => {
    it('fires exactly one confirmation email on pending -> confirmed; a confirmed resave fires none', async () => {
      const fake = createFakeMailer()
      setMailerForTesting(fake)

      const sessionId = await createSession()
      const buyerEmail = uniqueEmail('buyer')

      const order = await payload.create({
        collection: 'orders',
        data: {
          session: sessionId,
          quantity: 1,
          buyer: { name: 'Jane Buyer', email: buyerEmail },
          participants: [{ name: 'Jane Buyer', email: buyerEmail }],
          paymentStatus: 'pending',
        },
        overrideAccess: true,
      })

      // Creating a pending order sends the "order received" receipt — and only that
      // (`sendOrderReceivedEmail`, owner 2026-07-30; before that template existed, creating
      // a pending order sent nothing at all).
      expect(fake.calls).toHaveLength(1)
      expect(fake.calls[0]!.method).toBe('sendTransactional')
      const receipt = fake.calls[0]!.args as { to: string; subject: string }
      expect(receipt.to).toBe(buyerEmail)
      expect(receipt.subject).toContain('received your isad.academy order')

      await payload.update({
        collection: 'orders',
        id: order.id,
        data: { paymentStatus: 'confirmed' },
        overrideAccess: true,
      })

      expect(fake.calls).toHaveLength(2)
      expect(fake.calls[1]!.method).toBe('sendTransactional')
      const confirmation = fake.calls[1]!.args as { to: string; subject: string }
      expect(confirmation.to).toBe(buyerEmail)
      expect(confirmation.subject).toContain('is confirmed')

      // Re-saving confirmed -> confirmed (a same-status resave) must not re-fire, and the
      // receipt must never fire again either (it is create-only).
      await payload.update({
        collection: 'orders',
        id: order.id,
        data: { paymentStatus: 'confirmed' },
        overrideAccess: true,
      })

      expect(fake.calls).toHaveLength(2)
    })

    it('does not fail the order update when the mailer reports failure', async () => {
      const fake = createFakeMailer({ ok: false, error: 'Brevo is down' })
      setMailerForTesting(fake)

      const sessionId = await createSession()
      const buyerEmail = uniqueEmail('buyer-fail')

      const order = await payload.create({
        collection: 'orders',
        data: {
          session: sessionId,
          quantity: 1,
          buyer: { name: 'Failing Buyer', email: buyerEmail },
          participants: [{ name: 'Failing Buyer', email: buyerEmail }],
          paymentStatus: 'pending',
        },
        overrideAccess: true,
      })

      const updated = await payload.update({
        collection: 'orders',
        id: order.id,
        data: { paymentStatus: 'confirmed' },
        overrideAccess: true,
      })

      expect(updated.paymentStatus).toBe('confirmed')
      // Both the receipt (on create) and the confirmation (on update) were attempted and
      // both reported failure — neither may break the order.
      expect(fake.calls).toHaveLength(2)

      const persisted = await payload.findByID({ collection: 'orders', id: order.id, overrideAccess: true })
      expect(persisted.paymentStatus).toBe('confirmed')
    })
  })

  describe('leads -> sendLeadNotificationEmail', () => {
    it('fires exactly one notification on create; updating an existing lead fires none', async () => {
      const fake = createFakeMailer()
      setMailerForTesting(fake)

      const lead = await payload.create({
        collection: 'leads',
        data: {
          type: 'contact',
          name: `Lead ${RUN_ID}`,
          email: uniqueEmail('lead'),
          subject: 'course',
          message: 'Tell me more.',
        },
        // Leads direct-create is admin-only since 72b59d9; the hook fires on create
        // regardless of the caller, exactly like the hardened createLead service.
        overrideAccess: true,
      })

      expect(fake.calls).toHaveLength(1)
      expect(fake.calls[0]!.method).toBe('sendTransactional')

      await payload.update({
        collection: 'leads',
        id: lead.id,
        data: { message: 'Updated message.' },
        overrideAccess: true,
      })

      expect(fake.calls).toHaveLength(1)
    })

    it('does not fail lead creation when the mailer reports failure', async () => {
      const fake = createFakeMailer({ ok: false, error: 'Brevo is down' })
      setMailerForTesting(fake)

      const lead = await payload.create({
        collection: 'leads',
        data: {
          type: 'contact',
          name: `Lead Fail ${RUN_ID}`,
          email: uniqueEmail('lead-fail'),
          subject: 'other',
        },
        // Leads direct-create is admin-only since 72b59d9; the hook fires on create
        // regardless of the caller, exactly like the hardened createLead service.
        overrideAccess: true,
      })

      expect(lead.id).toBeDefined()

      const persisted = await payload.findByID({ collection: 'leads', id: lead.id, overrideAccess: true })
      expect(persisted.id).toBe(lead.id)
    })

    it('skips gracefully (no throw, lead still persisted) when siteSettings.contact.email is unset', async () => {
      const fake = createFakeMailer()
      setMailerForTesting(fake)

      await payload.updateGlobal({ slug: 'siteSettings', data: { contact: { email: '' } }, overrideAccess: true })

      const lead = await payload.create({
        collection: 'leads',
        data: {
          type: 'contact',
          name: `No Notify Lead ${RUN_ID}`,
          email: uniqueEmail('no-notify'),
          subject: 'other',
        },
        // Leads direct-create is admin-only since 72b59d9; the hook fires on create
        // regardless of the caller, exactly like the hardened createLead service.
        overrideAccess: true,
      })

      expect(lead.id).toBeDefined()
      expect(fake.calls).toHaveLength(0)

      // Restore for any later test in this file.
      await payload.updateGlobal({
        slug: 'siteSettings',
        data: { contact: { email: `notify-${RUN_ID}@example.com` } },
        overrideAccess: true,
      })
    })
  })

  describe('blogPosts -> broadcastNewPostOnPublish', () => {
    it('fires exactly one broadcast on the first publish; editing + re-publishing fires none', async () => {
      const fake = createFakeMailer()
      setMailerForTesting(fake)

      const draft = await payload.create({
        collection: 'blogPosts',
        data: { title: `Broadcast Post ${RUN_ID}`, excerpt: 'An excerpt.' },
        overrideAccess: true,
      })
      expect(draft._status).toBe('draft')
      expect(fake.calls).toHaveLength(0)

      await payload.update({
        collection: 'blogPosts',
        id: draft.id,
        data: { _status: 'published' },
        overrideAccess: true,
      })

      expect(fake.calls).toHaveLength(1)
      expect(fake.calls[0]!.method).toBe('broadcastNewPost')

      // The hook stamps `broadcastSentAt` via a SEPARATE nested `payload.update()` call —
      // the object returned by THIS outer `update()` doesn't reflect that (it's a distinct
      // in-memory doc); re-fetch to observe the persisted stamp.
      const afterPublish = await payload.findByID({ collection: 'blogPosts', id: draft.id, overrideAccess: true })
      expect(afterPublish.broadcastSentAt).toBeTruthy()

      // Editing the (already published) post's content must not re-broadcast.
      await payload.update({
        collection: 'blogPosts',
        id: draft.id,
        data: { excerpt: 'An updated excerpt.' },
        overrideAccess: true,
      })
      expect(fake.calls).toHaveLength(1)

      // Re-publishing (still `_status: 'published'`, `broadcastSentAt` already set) must not
      // re-broadcast either.
      await payload.update({
        collection: 'blogPosts',
        id: draft.id,
        data: { _status: 'published' },
        overrideAccess: true,
      })
      expect(fake.calls).toHaveLength(1)
    })

    it('stamps broadcastSentAt (and does not fail the publish) even when the mailer reports failure', async () => {
      const fake = createFakeMailer({ ok: false, error: 'Brevo is down' })
      setMailerForTesting(fake)

      const draft = await payload.create({
        collection: 'blogPosts',
        data: { title: `Broadcast Fail Post ${RUN_ID}` },
        overrideAccess: true,
      })

      const published = await payload.update({
        collection: 'blogPosts',
        id: draft.id,
        data: { _status: 'published' },
        overrideAccess: true,
      })

      expect(published._status).toBe('published')
      expect(fake.calls).toHaveLength(1)

      const persisted = await payload.findByID({ collection: 'blogPosts', id: draft.id, overrideAccess: true })
      expect(persisted.broadcastSentAt).toBeTruthy()
    })
  })
})
