import type { CollectionAfterChangeHook } from 'payload'

import type { BlogPost } from '../../../payload-types'
import { getSiteUrl } from '../../seo/site'
import { getMailer } from '../index'

const PUBLISHED = 'published'

/**
 * `blogPosts` `afterChange` hook — broadcasts the "new post" newsletter campaign on the
 * FIRST publish only (CLAUDE.md §4 `blogPosts`, §10-11). Exactly-once semantics rely on two
 * things together:
 *
 *   1. The `broadcastSentAt` field (hidden, `admin.hidden: true`) — stamped once the
 *      broadcast has been ATTEMPTED. `firstPublish` requires it to still be empty, so a
 *      re-save (editing the body, fixing a typo) or a later re-publish never re-broadcasts.
 *   2. A `context.skipBroadcastHook` re-entrancy guard — stamping `broadcastSentAt` is
 *      itself a `payload.update()` call, which re-runs this SAME `afterChange` hook. Passing
 *      `context: { skipBroadcastHook: true }` on that nested call, and checking it FIRST
 *      here, makes the short-circuit explicit and hook-recursion-proof — this is Payload's
 *      own documented pattern for "an update inside a hook must not re-trigger itself"
 *      (see https://payloadcms.com/docs/hooks/context), preferred over a raw SQL column
 *      update (the alternative the build instructions also sanctioned) because `blogPosts`
 *      has `versions.drafts` enabled and a hand-rolled `UPDATE blog_posts SET ...` would
 *      have to account for that versioning machinery correctly — going through Payload's
 *      own `update()` does that for free. `req` is passed through so the stamp write joins
 *      the SAME transaction as the outer publish (never a separate one).
 *
 * Best-effort, no-retry — same philosophy as `sendOrderConfirmationEmail` /
 * `sendLeadNotificationEmail`: `broadcastSentAt` is stamped regardless of whether the
 * broadcast itself succeeded or failed (a failure is logged, not silently retried later),
 * because there is no retry mechanism anywhere else in this codebase either — CLAUDE.md
 * §7/§15 "email failure never breaks the request" also means it never blocks a publish.
 */
export const broadcastNewPostOnPublish: CollectionAfterChangeHook<BlogPost> = async ({ doc, previousDoc, req, context }) => {
  if (context?.skipBroadcastHook) return doc

  const prevStatus = previousDoc?._status
  const nextStatus = doc?._status
  const alreadyBroadcast = Boolean(doc?.broadcastSentAt)

  const firstPublish = nextStatus === PUBLISHED && prevStatus !== PUBLISHED && !alreadyBroadcast
  if (!firstPublish) return doc

  try {
    // `getSiteUrl()` (src/lib/seo/site.ts) falls back to the dev origin when
    // NEXT_PUBLIC_SITE_URL is unset — the broadcast link is never a broken relative path.
    const url = `${getSiteUrl()}/blog/${doc.slug}`

    const result = await getMailer().broadcastNewPost({
      title: String(doc.title ?? ''),
      excerpt: String(doc.excerpt ?? ''),
      url,
    })

    if (!result.ok) {
      req.payload.logger.warn(`[email] blogPost ${doc.id} broadcast failed: ${result.error}`)
    } else {
      req.payload.logger.info(`[email] blogPost ${doc.id} broadcast sent.`)
    }

    await req.payload.update({
      collection: 'blogPosts',
      id: doc.id,
      data: { broadcastSentAt: new Date().toISOString() },
      overrideAccess: true,
      context: { skipBroadcastHook: true },
      req,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    req.payload.logger.error(`[email] blogPost ${doc?.id} broadcast hook threw unexpectedly: ${message}`)
  }

  return doc
}
