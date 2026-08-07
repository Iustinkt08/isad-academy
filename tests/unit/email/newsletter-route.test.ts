import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { setMailerForTesting } from '../../../src/lib/email'
import type { Mailer, SendTransactionalInput } from '../../../src/lib/email/types'
import { POST } from '../../../src/app/(frontend)/api/newsletter/route'

const jsonRequest = (body: unknown): Request =>
  new Request('http://localhost/api/newsletter', {
    method: 'POST',
    body: JSON.stringify(body),
  })

/**
 * Ruta trimite ACUM emailul de confirmare ea însăși (`sendTransactional`), nu prin funcția
 * DOI a Brevo — v. src/lib/newsletter/confirmToken.ts. Stub-urile de aici verifică exact
 * asta: ce pleacă, către cine, în ce limbă.
 */
const stubMailer = (overrides: Partial<Mailer> = {}): Mailer => ({
  name: 'fake',
  sendTransactional: async () => ({ ok: true }),
  subscribeDoubleOptIn: async () => ({ ok: true }),
  addToNewsletterList: async () => ({ ok: true }),
  broadcastNewPost: async () => ({ ok: true }),
  broadcastCampaign: async () => ({ ok: true }),
  ...overrides,
})

describe('POST /api/newsletter (unit) — T7', () => {
  let originalSecret: string | undefined

  beforeEach(() => {
    // Fără secret, ruta refuză să emită un link nesemnat (500). Producția are PAYLOAD_SECRET.
    originalSecret = process.env.PAYLOAD_SECRET
    process.env.PAYLOAD_SECRET = 'test-secret-for-newsletter-tokens'
  })

  afterEach(() => {
    setMailerForTesting(null)
    if (originalSecret === undefined) delete process.env.PAYLOAD_SECRET
    else process.env.PAYLOAD_SECRET = originalSecret
  })

  /** Instalează un mailer fals care înregistrează ce email s-ar fi trimis. */
  const recordingMailer = () => {
    const sent: SendTransactionalInput[] = []
    setMailerForTesting(
      stubMailer({
        sendTransactional: async (input) => {
          sent.push(input)
          return { ok: true }
        },
      }),
    )
    return sent
  }

  it('sends the confirmation email in the visitor’s language, to their address', async () => {
    const sent = recordingMailer()

    const response = await POST(jsonRequest({ email: 'cititor@example.com', locale: 'ro' }))

    expect(response.status).toBe(200)
    expect(sent[0]?.to).toBe('cititor@example.com')
    expect(sent[0]?.subject).toContain('Confirmă abonarea')
    // Marketing, deci expeditorul de newsletter — nu adresa de pe care pleacă chitanțele.
    expect(sent[0]?.sender).toBe('newsletter')
  })

  it('carries a signed confirmation link pointing at the confirm route', async () => {
    const sent = recordingMailer()

    await POST(jsonRequest({ email: 'reader@example.com' }))

    const rawToken = sent[0]?.html.match(/\/api\/newsletter\/confirm\?token=([^"&]+)/)?.[1]
    expect(rawToken).toBeTruthy()
    // body.signature — două segmente separate de punct, ambele nevide.
    const [body, signature] = decodeURIComponent(rawToken ?? '').split('.')
    expect(body).toBeTruthy()
    expect(signature).toBeTruthy()
  })

  it('falls back to English for an unrecognised locale instead of rejecting', async () => {
    // A bogus locale is a caller bug, not a reason to lose a real subscriber — never 400.
    const sent = recordingMailer()

    const response = await POST(jsonRequest({ email: 'reader@example.com', locale: 'de' }))

    expect(response.status).toBe(200)
    expect(sent[0]?.subject).toContain('Confirm your subscription')
  })

  it('does NOT subscribe anyone at this step — the address is only in the signed link', async () => {
    let added = 0
    setMailerForTesting(
      stubMailer({
        addToNewsletterList: async () => {
          added += 1
          return { ok: true }
        },
      }),
    )

    await POST(jsonRequest({ email: 'reader@example.com' }))

    expect(added).toBe(0)
  })

  it('returns 200 { ok: true } when the confirmation email goes out', async () => {
    setMailerForTesting(stubMailer())

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
    setMailerForTesting(
      stubMailer({ sendTransactional: async () => ({ ok: false, error: 'Brevo is down' }) }),
    )

    const response = await POST(jsonRequest({ email: 'reader@example.com' }))
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(body.ok).toBe(false)
  })

  it('returns 500 rather than mailing an unverifiable link when no signing secret exists', async () => {
    setMailerForTesting(stubMailer())
    delete process.env.PAYLOAD_SECRET

    const response = await POST(jsonRequest({ email: 'reader@example.com' }))

    expect(response.status).toBe(500)
  })
})
