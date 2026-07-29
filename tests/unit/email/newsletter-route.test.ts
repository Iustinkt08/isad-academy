import { afterEach, describe, expect, it } from 'vitest'

import { setMailerForTesting } from '../../../src/lib/email'
import { POST } from '../../../src/app/(frontend)/api/newsletter/route'

const jsonRequest = (body: unknown): Request =>
  new Request('http://localhost/api/newsletter', {
    method: 'POST',
    body: JSON.stringify(body),
  })

describe('POST /api/newsletter (unit) — T7', () => {
  afterEach(() => {
    setMailerForTesting(null)
  })

  it('returns 200 { ok: true } when the mailer subscribes successfully', async () => {
    setMailerForTesting({
      name: 'fake',
      sendTransactional: async () => ({ ok: true }),
      subscribeDoubleOptIn: async () => ({ ok: true }),
      broadcastNewPost: async () => ({ ok: true }),
      broadcastCampaign: async () => ({ ok: true }),
    })

    const response = await POST(jsonRequest({ email: 'reader@example.com' }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ ok: true })
  })

  it('returns 200 { ok: true } when Brevo is not configured (NoopMailer graceful degradation)', async () => {
    setMailerForTesting(null)
    const originalApiKey = process.env.BREVO_API_KEY
    delete process.env.BREVO_API_KEY

    try {
      const response = await POST(jsonRequest({ email: 'reader@example.com' }))
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body).toEqual({ ok: true })
    } finally {
      process.env.BREVO_API_KEY = originalApiKey
    }
  })

  it('returns 400 { ok: false } for a missing email', async () => {
    const response = await POST(jsonRequest({}))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.ok).toBe(false)
    expect(body.error).toBeTruthy()
  })

  it('returns 400 { ok: false } for a malformed email', async () => {
    const response = await POST(jsonRequest({ email: 'not-an-email' }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.ok).toBe(false)
  })

  it('returns 413 { ok: false } for an oversized body (T16 — aligned with the other POST routes)', async () => {
    const response = await POST(jsonRequest({ email: `${'x'.repeat(3_000)}@example.com` }))
    const body = await response.json()

    expect(response.status).toBe(413)
    expect(body.ok).toBe(false)
  })

  it('returns 400 { ok: false } for a non-JSON body', async () => {
    const response = await POST(
      new Request('http://localhost/api/newsletter', { method: 'POST', body: '{not json' }),
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.ok).toBe(false)
  })

  it('returns 502 { ok: false } when the mailer reports a real failure', async () => {
    setMailerForTesting({
      name: 'fake',
      sendTransactional: async () => ({ ok: true }),
      subscribeDoubleOptIn: async () => ({ ok: false, error: 'Brevo is down' }),
      broadcastNewPost: async () => ({ ok: true }),
      broadcastCampaign: async () => ({ ok: true }),
    })

    const response = await POST(jsonRequest({ email: 'reader@example.com' }))
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(body.ok).toBe(false)
  })
})
