import type { CollectionAfterChangeHook } from 'payload'

import type { Newsletter } from '../../../payload-types'
import { getMailer } from '../index'
import { renderNewsletterEmail } from '../templates/newsletterBroadcast'

/**
 * `newsletters` `afterChange` hook — sends a hand-written newsletter to the subscriber list
 * when the editor ticks "Send now" and saves (owner 2026-07-29: compose in the admin, never
 * in Brevo).
 *
 * Exactly-once by construction, mirroring `broadcastNewPostOnPublish`:
 *   - `sentAt` is stamped on the first ATTEMPT; a doc that already carries it can never
 *     re-send, so re-saving to fix a typo afterwards is inert.
 *   - `sendNow` is cleared in the same stamping write, so the checkbox reads as "armed"
 *     rather than staying stuck on.
 *   - A `context.skipNewsletterHook` guard makes that nested `update()` non-re-entrant —
 *     Payload's documented pattern (https://payloadcms.com/docs/hooks/context).
 *
 * Best-effort and failure-tolerant like every other mail hook here (CLAUDE.md §7/§15): the
 * outcome is written to `lastResult` so the editor can SEE in the admin whether it left,
 * and the hook never throws — a provider outage must not roll back the save.
 */
export const sendNewsletterCampaign: CollectionAfterChangeHook<Newsletter> = async ({
  doc,
  req,
  context,
}) => {
  if (context?.skipNewsletterHook) return doc
  if (!doc?.sendNow) return doc
  if (doc?.sentAt) return doc

  let lastResult = ''

  try {
    // `doc` arrives with richtext upload nodes UNPOPULATED (bare media ids) — re-read at
    // depth 2 so images inside the body carry their url/alt and actually render in the
    // email (owner 2026-08-08). Falls back to the raw doc if the read fails.
    const populated = await req.payload
      .findByID({ collection: 'newsletters', id: doc.id, depth: 2, overrideAccess: true, req })
      .catch(() => null)

    const { subject, html } = renderNewsletterEmail({
      subject: String(doc.subject ?? ''),
      preheader: doc.preheader,
      body: populated?.body ?? doc.body,
    })

    const result = await getMailer().broadcastCampaign({
      name: `Newsletter: ${String(doc.subject ?? '')}`.slice(0, 120),
      subject,
      html,
    })

    lastResult = result.ok
      ? `Trimis către lista de abonați la ${new Date().toISOString()}.`
      : `EȘUAT: ${result.error}`

    if (!result.ok) {
      req.payload.logger.error(`[email] newsletter ${doc.id} broadcast failed: ${result.error}`)
    }
  } catch (error) {
    lastResult = `EȘUAT: ${error instanceof Error ? error.message : String(error)}`
    req.payload.logger.error(`[email] newsletter ${doc.id} broadcast threw: ${lastResult}`)
  }

  try {
    await req.payload.update({
      collection: 'newsletters',
      id: doc.id,
      data: { sendNow: false, sentAt: new Date().toISOString(), lastResult },
      context: { skipNewsletterHook: true },
      overrideAccess: true,
      req,
    })
  } catch (error) {
    req.payload.logger.error(
      `[email] newsletter ${doc.id} sent but could not be stamped: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  return doc
}
