import './setup'

import { getPayload, type Payload } from 'payload'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { deliverLeadMagnet } from '../../src/lib/blog/deliverLeadMagnet'
import type { Mailer, MailerResult, SendTransactionalInput } from '../../src/lib/email'
import { setMailerForTesting } from '../../src/lib/email'
import config from '../../src/payload.config'

const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

// Minimal single-page PDF so the gated file is a real `media` doc with a real URL.
const TINY_PDF = Buffer.from(
  ['%PDF-1.4', '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj', 'trailer<</Size 2/Root 1 0 R>>', '%%EOF'].join('\n'),
  'utf8',
)

/** Recording mailer (same pattern as tests/int/email-hooks.int.spec.ts). */
const createFakeMailer = (result: MailerResult = { ok: true }): Mailer & { sent: SendTransactionalInput[] } => {
  const sent: SendTransactionalInput[] = []
  return {
    name: 'fake',
    sent,
    async sendTransactional(input) {
      sent.push(input)
      return result
    },
    async addToNewsletterList() {
      return { ok: true as const }
    },
    async subscribeDoubleOptIn() {
      return result
    },
    async broadcastNewPost() {
      return result
    },
    async broadcastCampaign() {
      return result
    },
  }
}

describe('deliverLeadMagnet (int) — T12', () => {
  let payload: Payload
  let pdfFilename: string
  let gatedSlug: string
  let ungatedSlug: string
  let draftGatedSlug: string

  beforeAll(async () => {
    payload = await getPayload({ config })

    const media = await payload.create({
      collection: 'media',
      data: { alt: `Gated checklist PDF ${RUN_ID}` },
      file: {
        data: TINY_PDF,
        mimetype: 'application/pdf',
        name: `gated-checklist-${RUN_ID}.pdf`,
        size: TINY_PDF.length,
      },
      overrideAccess: true,
    })
    pdfFilename = media.filename ?? ''

    const gated = await payload.create({
      collection: 'blogPosts',
      data: {
        title: `Gated Post ${RUN_ID}`,
        _status: 'published',
        leadMagnet: { enabled: true, file: media.id },
      },
      overrideAccess: true,
    })
    gatedSlug = gated.slug ?? ''

    const ungated = await payload.create({
      collection: 'blogPosts',
      data: {
        title: `Ungated Post ${RUN_ID}`,
        _status: 'published',
        leadMagnet: { enabled: false },
      },
      overrideAccess: true,
    })
    ungatedSlug = ungated.slug ?? ''

    const draftGated = await payload.create({
      collection: 'blogPosts',
      data: {
        title: `Draft Gated Post ${RUN_ID}`,
        leadMagnet: { enabled: true, file: media.id },
      },
      overrideAccess: true,
    })
    expect(draftGated._status).toBe('draft')
    draftGatedSlug = draftGated.slug ?? ''
  })

  afterEach(() => {
    setMailerForTesting(null)
  })

  afterAll(async () => {
    await payload.db.destroy?.()
  })

  it('happy path: 200 + one transactional email to the requester with the ABSOLUTE file URL', async () => {
    const mailer = createFakeMailer()
    setMailerForTesting(mailer)

    const result = await deliverLeadMagnet(
      { slug: gatedSlug, email: 'reader@example.com' },
      { payload },
    )

    expect(result).toEqual({ status: 200, body: { ok: true } })
    expect(mailer.sent).toHaveLength(1)
    expect(mailer.sent[0]!.to).toBe('reader@example.com')
    expect(mailer.sent[0]!.subject).toBe('Your download from isad.academy')
    // Link, not attachment — and absolute (mail clients have no origin to resolve against).
    expect(mailer.sent[0]!.html).toMatch(/href="http/)
    expect(mailer.sent[0]!.html).toContain(pdfFilename)
    expect(mailer.sent[0]!.text).toMatch(/^Thanks for reading/)
    expect(mailer.sent[0]!.text).toContain(pdfFilename)
  })

  it('404 when the lead magnet is disabled — no email', async () => {
    const mailer = createFakeMailer()
    setMailerForTesting(mailer)

    const result = await deliverLeadMagnet(
      { slug: ungatedSlug, email: 'reader@example.com' },
      { payload },
    )

    expect(result.status).toBe(404)
    expect(mailer.sent).toHaveLength(0)
  })

  it('404 for a DRAFT post with an enabled magnet (public access rules apply) — no email', async () => {
    const mailer = createFakeMailer()
    setMailerForTesting(mailer)

    const result = await deliverLeadMagnet(
      { slug: draftGatedSlug, email: 'reader@example.com' },
      { payload },
    )

    expect(result.status).toBe(404)
    expect(mailer.sent).toHaveLength(0)
  })

  it('404 for an unknown slug — same message as disabled (no draft-existence oracle)', async () => {
    const mailer = createFakeMailer()
    setMailerForTesting(mailer)

    const unknown = await deliverLeadMagnet(
      { slug: `no-such-post-${RUN_ID}`, email: 'reader@example.com' },
      { payload },
    )
    const disabled = await deliverLeadMagnet(
      { slug: ungatedSlug, email: 'reader@example.com' },
      { payload },
    )

    expect(unknown).toEqual(disabled)
    expect(mailer.sent).toHaveLength(0)
  })

  it('400 for a malformed email, missing slug, non-object body or unexpected field — no email', async () => {
    const mailer = createFakeMailer()
    setMailerForTesting(mailer)

    for (const bad of [
      { slug: gatedSlug, email: 'not-an-email' },
      { slug: gatedSlug },
      { email: 'reader@example.com' },
      { slug: gatedSlug, email: 'reader@example.com', admin: true },
      'just a string',
      null,
      ['array'],
    ]) {
      const result = await deliverLeadMagnet(bad, { payload })
      expect(result.status, `body: ${JSON.stringify(bad)}`).toBe(400)
    }
    expect(mailer.sent).toHaveLength(0)
  })

  it('honeypot: filled "website" field returns the SAME 200 as success but sends nothing', async () => {
    const mailer = createFakeMailer()
    setMailerForTesting(mailer)

    const result = await deliverLeadMagnet(
      { slug: gatedSlug, email: 'bot@example.com', website: 'http://spam.example' },
      { payload },
    )

    expect(result).toEqual({ status: 200, body: { ok: true } })
    expect(mailer.sent).toHaveLength(0)
  })

  it('502 when the mailer reports a failure (visitor is told to retry, not left waiting)', async () => {
    const mailer = createFakeMailer({ ok: false, error: 'brevo down' })
    setMailerForTesting(mailer)

    const result = await deliverLeadMagnet(
      { slug: gatedSlug, email: 'reader@example.com' },
      { payload },
    )

    expect(result.status).toBe(502)
    expect(mailer.sent).toHaveLength(1)
  })
})
