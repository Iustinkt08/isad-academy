import { createHash, createSign, generateKeyPairSync } from 'crypto'
import { describe, expect, it } from 'vitest'

import { parseNetopiaPublicKey, verifyNetopiaIpn } from '../../../src/lib/payments/netopiaIpn'

/**
 * The IPN's `Verification-token` is a Netopia-signed JWT (RS512): `aud` = our POS
 * signature, `sub` = base64(sha512(raw body)). These tests forge tokens with a local RSA
 * key so every check (signature, issuer, audience, expiry, payload hash) is exercised
 * without Netopia's real certificate.
 */

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const { privateKey: strangerKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })

const PUBLIC_PEM = publicKey.export({ type: 'spki', format: 'pem' }).toString()
const POS_SIGNATURE = 'AAAA-BBBB-CCCC-DDDD-EEEE'

const b64url = (data: Buffer | string): string =>
  Buffer.from(data).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const signToken = (
  body: string,
  overrides: Record<string, unknown> = {},
  key = privateKey,
  alg = 'RS512',
): string => {
  const header = b64url(JSON.stringify({ alg, typ: 'JWT' }))
  const claims = b64url(
    JSON.stringify({
      iss: 'NETOPIA Payments',
      aud: [POS_SIGNATURE],
      sub: createHash('sha512').update(body).digest('base64'),
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...overrides,
    }),
  )
  const signature = createSign(alg === 'RS256' ? 'RSA-SHA256' : 'RSA-SHA512')
    .update(`${header}.${claims}`)
    .sign(key)
  return `${header}.${claims}.${b64url(signature)}`
}

const IPN_BODY = JSON.stringify({
  order: { orderID: 'isad-42-abc123', amount: 1490, currency: 'RON' },
  payment: { status: 3, ntpID: 'ntp-12345', amount: 1490, currency: 'RON' },
})

const verify = (body: string, token: string | null, publicKeyPem = PUBLIC_PEM) =>
  verifyNetopiaIpn(body, token, { publicKeyPem, posSignature: POS_SIGNATURE })

describe('verifyNetopiaIpn', () => {
  it('accepts a well-signed notification and returns the parsed payload', () => {
    const result = verify(IPN_BODY, signToken(IPN_BODY))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.payload.payment?.status).toBe(3)
      expect(result.payload.order?.orderID).toBe('isad-42-abc123')
    }
  })

  it('accepts a string (non-array) audience too', () => {
    const result = verify(IPN_BODY, signToken(IPN_BODY, { aud: POS_SIGNATURE }))
    expect(result.ok).toBe(true)
  })

  it('rejects a missing token', () => {
    const result = verify(IPN_BODY, null)
    expect(result).toMatchObject({ ok: false, reason: expect.stringMatching(/missing/i) })
  })

  it('rejects a token signed by someone else', () => {
    const result = verify(IPN_BODY, signToken(IPN_BODY, {}, strangerKey))
    expect(result).toMatchObject({ ok: false, reason: expect.stringMatching(/signature/i) })
  })

  it('rejects a tampered body (hash mismatch) — the seat-granting check', () => {
    const tampered = IPN_BODY.replace('"status":3', '"status":5').replace('1490', '1')
    const result = verify(tampered, signToken(IPN_BODY))
    expect(result).toMatchObject({ ok: false, reason: expect.stringMatching(/hash/i) })
  })

  it('rejects a wrong issuer', () => {
    const result = verify(IPN_BODY, signToken(IPN_BODY, { iss: 'Somebody Else' }))
    expect(result).toMatchObject({ ok: false, reason: expect.stringMatching(/issuer/i) })
  })

  it("rejects a token addressed to another merchant's POS", () => {
    const result = verify(IPN_BODY, signToken(IPN_BODY, { aud: ['OTHER-POS'] }))
    expect(result).toMatchObject({ ok: false, reason: expect.stringMatching(/audience|POS/i) })
  })

  it('rejects an expired token (past the clock leeway)', () => {
    const result = verify(IPN_BODY, signToken(IPN_BODY, { exp: Math.floor(Date.now() / 1000) - 3600 }))
    expect(result).toMatchObject({ ok: false, reason: expect.stringMatching(/expired/i) })
  })

  it('rejects malformed tokens and unsupported algorithms', () => {
    expect(verify(IPN_BODY, 'not-a-jwt').ok).toBe(false)
    const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const [, claims, sig] = signToken(IPN_BODY).split('.')
    expect(verify(IPN_BODY, `${header}.${claims}.${sig}`).ok).toBe(false)
  })

  it('also verifies with RS256 when the header says so', () => {
    const result = verify(IPN_BODY, signToken(IPN_BODY, {}, privateKey, 'RS256'))
    expect(result.ok).toBe(true)
  })
})

describe('parseNetopiaPublicKey — deploy-friendly env formats', () => {
  it('parses a raw PEM public key', () => {
    expect(parseNetopiaPublicKey(PUBLIC_PEM).type).toBe('public')
  })

  it('parses a PEM with escaped newlines (single-line env var)', () => {
    expect(parseNetopiaPublicKey(PUBLIC_PEM.replace(/\n/g, '\\n')).type).toBe('public')
  })

  it('parses a base64-encoded PEM (mangled multiline env editors)', () => {
    expect(parseNetopiaPublicKey(Buffer.from(PUBLIC_PEM).toString('base64')).type).toBe('public')
  })

  it('throws on garbage', () => {
    expect(() => parseNetopiaPublicKey('definitely not a key')).toThrow()
  })
})
