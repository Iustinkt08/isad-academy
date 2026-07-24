import type { Payload } from 'payload'

import { getMailer } from '../email'
import { renderLeadMagnetEmail } from '../email/templates/leadMagnet'
import { HONEYPOT_FIELD } from '../leads/validateLeadInput'
import type { Media } from '../../payload-types'

const MAX_EMAIL_LENGTH = 254
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ALLOWED_KEYS = new Set(['slug', 'email', HONEYPOT_FIELD])

export type DeliverLeadMagnetResult =
  | { status: 200; body: { ok: true } }
  | { status: 400 | 404 | 502; body: { ok: false; error: string } }

/** One message for "no such post", "draft" and "lead magnet disabled" alike — the public
 * response never reveals whether a hidden draft exists at that slug. */
const NOT_FOUND: DeliverLeadMagnetResult = {
  status: 404,
  body: { ok: false, error: 'This article has no downloadable resource.' },
}

/**
 * `POST /api/blog/lead-magnet` service (CLAUDE.md §4 `blogPosts.leadMagnet`) — separated
 * from the route handler so it is integration-testable by direct invocation (mirrors
 * `createLead`). Flow:
 *
 *   1. Honeypot (same shared `website` field as the lead forms): a non-empty value returns
 *      the SAME 200 `{ ok: true }` as a real submission but silently skips the email.
 *   2. Strict allow-listed validation: `{ slug, email }` only, valid email format.
 *   3. Post lookup with `overrideAccess: false` (no user) — drafts are invisible, so a
 *      draft slug 404s exactly like an unknown one. The lead magnet must be `enabled` with
 *      a populated file, else 404 (indistinguishable, no oracle for gated-vs-missing).
 *   4. Email the ABSOLUTE file URL via `getMailer().sendTransactional` (Brevo behind the
 *      `Mailer` interface — no attachment, just the link). A mailer-reported failure maps
 *      to 502 like /api/newsletter — the visitor is told to retry rather than left waiting
 *      for an email that never comes.
 */
export async function deliverLeadMagnet(
  raw: unknown,
  deps: { payload: Payload },
): Promise<DeliverLeadMagnetResult> {
  const { payload } = deps

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { status: 400, body: { ok: false, error: 'Request body must be a JSON object.' } }
  }
  const input = raw as Record<string, unknown>

  for (const key of Object.keys(input)) {
    if (!ALLOWED_KEYS.has(key)) {
      return { status: 400, body: { ok: false, error: `Unexpected field "${key}".` } }
    }
  }

  const honeypot = input[HONEYPOT_FIELD]
  if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
    return { status: 200, body: { ok: true } }
  }

  const slug = input.slug
  if (typeof slug !== 'string' || slug.trim().length === 0) {
    return { status: 400, body: { ok: false, error: '"slug" is required.' } }
  }

  const email = input.email
  if (
    typeof email !== 'string' ||
    email.length > MAX_EMAIL_LENGTH ||
    !EMAIL_RE.test(email.trim())
  ) {
    return { status: 400, body: { ok: false, error: 'A valid email address is required.' } }
  }

  const posts = await payload.find({
    collection: 'blogPosts',
    where: { slug: { equals: slug.trim() } },
    limit: 1,
    depth: 1,
    overrideAccess: false,
  })
  const post = posts.docs[0]
  if (!post || !post.leadMagnet?.enabled) return NOT_FOUND

  const file = post.leadMagnet.file
  const media: Media | null = file != null && typeof file === 'object' ? file : null
  if (!media?.url) return NOT_FOUND

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000').replace(
    /\/+$/,
    '',
  )
  const downloadUrl = media.url.startsWith('http') ? media.url : `${siteUrl}${media.url}`

  const rendered = renderLeadMagnetEmail({ postTitle: post.title, downloadUrl })
  const result = await getMailer().sendTransactional({
    to: email.trim(),
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  })

  if (!result.ok) {
    payload.logger.warn(`[email] lead magnet for "${slug}" failed to send: ${result.error}`)
    return {
      status: 502,
      body: { ok: false, error: 'Could not send the download link. Please try again later.' },
    }
  }

  return { status: 200, body: { ok: true } }
}
