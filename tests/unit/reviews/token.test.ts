import { beforeEach, describe, expect, it } from 'vitest'

import { createReviewToken, verifyReviewToken } from '../../../src/lib/reviews/token'

const NOW = new Date('2026-07-06T12:00:00.000Z').getTime()
const DAY_MS = 24 * 60 * 60 * 1000

describe('review token (T13) — sign/verify', () => {
  beforeEach(() => {
    process.env.PAYLOAD_SECRET = 'unit-test-review-token-secret-0123456789'
  })

  it('round-trips a valid token: verify() recovers exactly what was signed', () => {
    const token = createReviewToken({ sessionId: 42, email: 'Jane@Example.com' }, NOW)
    const result = verifyReviewToken(token, NOW)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.payload.sessionId).toBe(42)
      // Email is normalized (trimmed + lowercased) at sign time — verify must return the
      // SAME normalized form, since it is what the duplicate-guard hash is computed from.
      expect(result.payload.email).toBe('jane@example.com')
    }
  })

  it('accepts a string sessionId (relationship ids can be strings on some adapters)', () => {
    const token = createReviewToken({ sessionId: 'abc123', email: 'buyer@example.com' }, NOW)
    const result = verifyReviewToken(token, NOW)

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.payload.sessionId).toBe('abc123')
  })

  it('rejects a token signed with a DIFFERENT secret (tampered/forged)', () => {
    const token = createReviewToken({ sessionId: 42, email: 'jane@example.com' }, NOW)

    process.env.PAYLOAD_SECRET = 'a-completely-different-secret-9876543210'
    const result = verifyReviewToken(token, NOW)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('tampered')
  })

  it('rejects a token whose payload was altered after signing (signature no longer matches)', () => {
    const token = createReviewToken({ sessionId: 42, email: 'jane@example.com' }, NOW)
    const [body, signature] = token.split('.') as [string, string]

    // Flip the session id embedded in the (base64url) body without re-signing.
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    decoded.sessionId = 999
    const forgedBody = Buffer.from(JSON.stringify(decoded)).toString('base64url')
    const forgedToken = `${forgedBody}.${signature}`

    const result = verifyReviewToken(forgedToken, NOW)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('tampered')
  })

  it('rejects malformed tokens (missing separator, empty string, garbage)', () => {
    expect(verifyReviewToken('', NOW).ok).toBe(false)
    expect(verifyReviewToken('not-a-real-token', NOW).ok).toBe(false)
    expect(verifyReviewToken('abc.def.ghi', NOW).ok).toBe(false)

    const malformed = verifyReviewToken('not-a-real-token', NOW)
    if (!malformed.ok) expect(malformed.reason).toBe('malformed')
  })

  it('accepts a token still within the 90-day expiry window', () => {
    const token = createReviewToken({ sessionId: 1, email: 'a@example.com' }, NOW)
    const justUnderExpiry = NOW + 90 * DAY_MS - 1000
    const result = verifyReviewToken(token, justUnderExpiry)
    expect(result.ok).toBe(true)
  })

  it('rejects a token past the 90-day expiry window', () => {
    const token = createReviewToken({ sessionId: 1, email: 'a@example.com' }, NOW)
    const justOverExpiry = NOW + 90 * DAY_MS + 1000
    const result = verifyReviewToken(token, justOverExpiry)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('expired')
  })

  it('produces URL-safe tokens (no "+", "/" or "=" characters)', () => {
    const token = createReviewToken({ sessionId: 12345, email: 'someone.with+plus@example.com' }, NOW)
    expect(token).not.toMatch(/[+/=]/)
  })
})
