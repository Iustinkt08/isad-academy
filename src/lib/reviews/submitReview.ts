import { createHash } from 'node:crypto'

import type { Payload } from 'payload'

import { verifyReviewToken } from './token'

const MIN_TEXT_LENGTH = 10
const MAX_TEXT_LENGTH = 2000
const MAX_NAME_LENGTH = 200
const MAX_ROLE_LENGTH = 200

const ALLOWED_KEYS = ['token', 'text', 'authorName', 'roleCompany']

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Strips any HTML tags from user-submitted free text (CLAUDE.md quality floor — reviews are
 * plain text, never rich text) before it is stored or length-checked, so a submission padded
 * with markup can't sneak past the length bounds below with a shorter "real" message than it
 * appears to have, and so no markup ever reaches the admin/frontend unescaped. */
const stripHtml = (value: string): string => value.replace(/<[^>]*>/g, '').trim()

/** Duplicate-submission guard key (CLAUDE.md §10, T13): the same (session, email) pair may
 * submit at most once. Stored on `reviews.submissionKey` (unique) — the hash never reveals
 * the participant's email in the admin UI even though the field is queryable. */
export const submissionKeyFor = (sessionId: number | string, email: string): string =>
  createHash('sha256').update(`${sessionId}:${email.trim().toLowerCase()}`).digest('hex')

export type SubmitReviewSuccessBody = { ok: true }
export type SubmitReviewFailureBody = { ok: false; error: string }

export type SubmitReviewResult =
  | { status: 200; body: SubmitReviewSuccessBody }
  | { status: 400 | 401 | 404 | 409; body: SubmitReviewFailureBody }

export type SubmitReviewDeps = {
  payload: Payload
  /** Injected clock — lets tests pin "now" against a token's expiry deterministically. */
  now?: Date
}

/**
 * Core logic for `POST /api/reviews/submit` (CLAUDE.md §10, T13) — kept separate from the
 * thin route handler so it is directly integration-testable (mirrors `processCheckout`).
 *
 * Flow:
 *   a. Validate the raw body shape (allow-listed keys only — mirrors
 *      `validateCheckoutInput`'s mass-assignment hygiene).
 *   b. Verify the token (`verifyReviewToken`) — invalid/tampered/expired -> 401. This is the
 *      ONLY authorization check; there are no accounts (§3).
 *   c. Validate + sanitize `text` (10–2000 chars after HTML-stripping) and the optional
 *      `authorName`/`roleCompany`.
 *   d. Load the session (for its `course` relationship) — not found -> 404.
 *   e. Duplicate guard: an existing review with the same `submissionKey` -> 409.
 *   f. Create the review via the Local API with `overrideAccess: true` (Reviews' own
 *      `create` access stays admin-only, CLAUDE.md — this route is the one deliberate,
 *      token-gated exception, same pattern as the checkout API writing `orders`).
 */
export const submitReview = async (raw: unknown, deps: SubmitReviewDeps): Promise<SubmitReviewResult> => {
  const { payload } = deps
  const now = deps.now ?? new Date()

  if (!isPlainObject(raw)) {
    return { status: 400, body: { ok: false, error: 'Request body must be a JSON object.' } }
  }

  const unknownKeys = Object.keys(raw).filter((key) => !ALLOWED_KEYS.includes(key))
  if (unknownKeys.length > 0) {
    return { status: 400, body: { ok: false, error: `Unknown field(s): ${unknownKeys.join(', ')}.` } }
  }

  const { token, text, authorName, roleCompany } = raw

  if (typeof token !== 'string' || token.length === 0) {
    return { status: 401, body: { ok: false, error: 'A valid review link is required.' } }
  }

  const verified = verifyReviewToken(token, now.getTime())
  if (!verified.ok) {
    return { status: 401, body: { ok: false, error: 'This review link is invalid or has expired.' } }
  }
  const { sessionId, email } = verified.payload

  if (typeof text !== 'string') {
    return { status: 400, body: { ok: false, error: '"text" is required.' } }
  }
  const cleanedText = stripHtml(text)
  if (cleanedText.length < MIN_TEXT_LENGTH || cleanedText.length > MAX_TEXT_LENGTH) {
    return {
      status: 400,
      body: {
        ok: false,
        error: `"text" must be between ${MIN_TEXT_LENGTH} and ${MAX_TEXT_LENGTH} characters.`,
      },
    }
  }

  let cleanedAuthorName: string | undefined
  if (authorName !== undefined) {
    if (typeof authorName !== 'string' || authorName.length > MAX_NAME_LENGTH) {
      return { status: 400, body: { ok: false, error: '"authorName" must be a string.' } }
    }
    cleanedAuthorName = stripHtml(authorName) || undefined
  }

  let cleanedRoleCompany: string | undefined
  if (roleCompany !== undefined) {
    if (typeof roleCompany !== 'string' || roleCompany.length > MAX_ROLE_LENGTH) {
      return { status: 400, body: { ok: false, error: '"roleCompany" must be a string.' } }
    }
    cleanedRoleCompany = stripHtml(roleCompany) || undefined
  }

  const session = await payload
    .findByID({ collection: 'courseSessions', id: sessionId, overrideAccess: true, depth: 0 })
    .catch(() => null)

  if (!session) {
    return { status: 404, body: { ok: false, error: 'This course edition could not be found.' } }
  }

  const courseId =
    session.course && typeof session.course === 'object'
      ? (session.course as { id: unknown }).id
      : session.course

  const submissionKey = submissionKeyFor(sessionId, email)

  const existing = await payload.find({
    collection: 'reviews',
    where: { submissionKey: { equals: submissionKey } },
    overrideAccess: true,
    limit: 1,
  })
  if (existing.docs.length > 0) {
    return { status: 409, body: { ok: false, error: 'You have already submitted a review for this edition.' } }
  }

  try {
    await payload.create({
      collection: 'reviews',
      data: {
        text: cleanedText,
        authorName: cleanedAuthorName,
        roleCompany: cleanedRoleCompany,
        course: (courseId as number | undefined) ?? undefined,
        source: 'emailForm',
        showOnHome: false,
        submissionKey,
      },
      overrideAccess: true,
    })
  } catch {
    // Lost a race against a concurrent submit for the exact same (session, email) pair — the
    // pre-check above is best-effort; the DB-level unique constraint on `submissionKey` is
    // the actual source of truth, and this is the one error shape it can produce here.
    return { status: 409, body: { ok: false, error: 'You have already submitted a review for this edition.' } }
  }

  return { status: 200, body: { ok: true } }
}
