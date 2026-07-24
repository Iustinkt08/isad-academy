import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * HMAC-signed review-submission link (CLAUDE.md §3.1/§10 — no accounts: this token itself is
 * the entire authorization for a one-time public review submission). Format:
 * `<base64url(JSON payload)>.<base64url(HMAC-SHA256 signature)>` — deliberately NOT a JWT
 * library dependency, this repo has none; the shape is simple enough to hand-roll and keep
 * fully test-visible (mirrors the "no schema library" stance in
 * src/lib/checkout/validateCheckoutInput.ts).
 *
 * Signed with `PAYLOAD_SECRET` (already the app-wide signing secret, CLAUDE.md §2) rather
 * than introducing a second secret to provision/rotate.
 */

export type ReviewTokenPayload = {
  sessionId: number | string
  email: string
}

export type VerifiedReviewTokenPayload = ReviewTokenPayload & { issuedAt: number }

export type VerifyReviewTokenResult =
  | { ok: true; payload: VerifiedReviewTokenPayload }
  | { ok: false; reason: 'malformed' | 'tampered' | 'expired' }

/** 90 days (CLAUDE.md-adjacent spec for T13) — long enough that a participant who receives
 * the request email right after their session still has ample time to respond, short enough
 * that a leaked/old link doesn't stay valid indefinitely. */
export const REVIEW_TOKEN_EXPIRY_MS = 90 * 24 * 60 * 60 * 1000

const getSigningSecret = (): string => {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) {
    throw new Error('PAYLOAD_SECRET must be set to sign/verify review tokens.')
  }
  return secret
}

const sign = (encodedBody: string, secret: string): string =>
  createHmac('sha256', secret).update(encodedBody).digest('base64url')

/**
 * Signs a `{ sessionId, email }` pair into a URL-safe token. The email is normalized
 * (trimmed + lowercased) BEFORE signing so `verifyReviewToken` always returns a value in the
 * exact form the duplicate-submission guard (`submissionKeyFor`, ./submitReview) hashes.
 */
export const createReviewToken = (payload: ReviewTokenPayload, issuedAt: number = Date.now()): string => {
  const normalized: VerifiedReviewTokenPayload = {
    sessionId: payload.sessionId,
    email: payload.email.trim().toLowerCase(),
    issuedAt,
  }
  const encodedBody = Buffer.from(JSON.stringify(normalized)).toString('base64url')
  const signature = sign(encodedBody, getSigningSecret())
  return `${encodedBody}.${signature}`
}

const isVerifiedPayloadShape = (value: unknown): value is VerifiedReviewTokenPayload => {
  if (typeof value !== 'object' || value === null) return false
  const { sessionId, email, issuedAt } = value as Record<string, unknown>
  return (
    (typeof sessionId === 'number' || typeof sessionId === 'string') &&
    typeof email === 'string' &&
    typeof issuedAt === 'number'
  )
}

/**
 * Verifies signature integrity, then payload shape, then expiry — in that order, so a
 * tampered/forged token is always reported as `'tampered'` rather than leaking anything about
 * why its (attacker-controlled, at that point unverified) payload failed to parse.
 */
export const verifyReviewToken = (token: string, now: number = Date.now()): VerifyReviewTokenResult => {
  if (typeof token !== 'string' || token.length === 0) {
    return { ok: false, reason: 'malformed' }
  }

  const [encodedBody, signature, ...rest] = token.split('.')
  if (rest.length > 0 || !encodedBody || !signature) {
    return { ok: false, reason: 'malformed' }
  }

  const expectedSignature = sign(encodedBody, getSigningSecret())
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  // Signatures are both fixed-length base64url(SHA-256) — a length mismatch alone already
  // means "not a signature this server produced", so it's safe to short-circuit without
  // calling `timingSafeEqual` (which requires equal-length buffers and would throw here).
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return { ok: false, reason: 'tampered' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(encodedBody, 'base64url').toString('utf8'))
  } catch {
    return { ok: false, reason: 'malformed' }
  }

  if (!isVerifiedPayloadShape(parsed)) {
    return { ok: false, reason: 'malformed' }
  }

  if (now - parsed.issuedAt > REVIEW_TOKEN_EXPIRY_MS) {
    return { ok: false, reason: 'expired' }
  }

  return { ok: true, payload: parsed }
}
