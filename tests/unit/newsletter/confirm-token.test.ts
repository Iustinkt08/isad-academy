import { createHmac } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createConfirmToken, verifyConfirmToken } from '../../../src/lib/newsletter/confirmToken'

/**
 * Tokenul ăsta E dovada consimțământului GDPR și singurul lucru care stă între o adresă și
 * abonarea ei. Testele urmăresc atacurile plauzibile, nu doar drumul fericit: token cârpit,
 * semnătură împrumutată de la alt secret, link expirat, adresă schimbată în payload.
 */
const NOW = new Date('2026-08-06T12:00:00Z')

describe('newsletter confirm token', () => {
  let original: string | undefined

  beforeEach(() => {
    original = process.env.PAYLOAD_SECRET
    process.env.PAYLOAD_SECRET = 'secret-A'
    delete process.env.NEWSLETTER_TOKEN_SECRET
  })

  afterEach(() => {
    if (original === undefined) delete process.env.PAYLOAD_SECRET
    else process.env.PAYLOAD_SECRET = original
    delete process.env.NEWSLETTER_TOKEN_SECRET
  })

  it('round-trips the email and locale', () => {
    const token = createConfirmToken({ email: 'cititor@example.com', locale: 'ro' }, NOW)!
    const result = verifyConfirmToken(token, NOW)

    expect(result).toEqual({ ok: true, payload: { email: 'cititor@example.com', locale: 'ro' } })
  })

  it('refuses to mint a token when no secret is configured', () => {
    delete process.env.PAYLOAD_SECRET
    expect(createConfirmToken({ email: 'a@b.co', locale: 'en' }, NOW)).toBeNull()
  })

  it('rejects a payload edited to a different address', () => {
    // Atacul evident: iau linkul meu valid și schimb adresa cu a altcuiva, ca să-l abonez
    // fără voia lui. Semnătura acoperă payload-ul, deci nu se potrivește.
    const token = createConfirmToken({ email: 'mine@example.com', locale: 'en' }, NOW)!
    const [, signature] = token.split('.')
    const forgedBody = Buffer.from(
      JSON.stringify({ e: 'victim@example.com', l: 'en', x: 4_102_444_800 }),
    ).toString('base64url')

    expect(verifyConfirmToken(`${forgedBody}.${signature}`, NOW)).toEqual({
      ok: false,
      reason: 'badSignature',
    })
  })

  it('rejects a token signed with a different secret', () => {
    const token = createConfirmToken({ email: 'a@b.co', locale: 'en' }, NOW)!
    process.env.PAYLOAD_SECRET = 'secret-B'

    expect(verifyConfirmToken(token, NOW)).toEqual({ ok: false, reason: 'badSignature' })
  })

  it('rejects an expired link', () => {
    const token = createConfirmToken({ email: 'a@b.co', locale: 'en' }, NOW)!
    const later = new Date(NOW.getTime() + 49 * 60 * 60 * 1000) // TTL e 48h

    expect(verifyConfirmToken(token, later)).toEqual({ ok: false, reason: 'expired' })
  })

  it('still accepts the link one hour before it expires', () => {
    const token = createConfirmToken({ email: 'a@b.co', locale: 'en' }, NOW)!
    const later = new Date(NOW.getTime() + 47 * 60 * 60 * 1000)

    expect(verifyConfirmToken(token, later).ok).toBe(true)
  })

  it.each(['', 'garbage', 'only-one-part'])('rejects malformed input %j', (bad) => {
    expect(verifyConfirmToken(bad, NOW).ok).toBe(false)
  })

  it('falls back to EN when the signed locale is no longer recognised', () => {
    // Semnătura e validă, deci nu e atac — e un token emis înainte de o schimbare de limbi.
    process.env.NEWSLETTER_TOKEN_SECRET = 'rotating-secret'
    const body = Buffer.from(
      JSON.stringify({ e: 'a@b.co', l: 'de', x: Math.floor(NOW.getTime() / 1000) + 3600 }),
    ).toString('base64url')
    const signature = createHmac('sha256', 'rotating-secret').update(body).digest('base64url')

    const result = verifyConfirmToken(`${body}.${signature}`, NOW)

    expect(result).toEqual({ ok: true, payload: { email: 'a@b.co', locale: 'en' } })
  })

  it('prefers NEWSLETTER_TOKEN_SECRET over PAYLOAD_SECRET when both are set', () => {
    process.env.NEWSLETTER_TOKEN_SECRET = 'dedicated'
    const token = createConfirmToken({ email: 'a@b.co', locale: 'en' }, NOW)!

    delete process.env.NEWSLETTER_TOKEN_SECRET // acum ar cădea pe PAYLOAD_SECRET = secret-A
    expect(verifyConfirmToken(token, NOW).ok).toBe(false)
  })
})
