import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@payload-config'

/**
 * Draft preview entry (CLAUDE.md §4 blogPosts "preview înainte de publicare") — the target
 * of `admin.preview` on the `blogPosts` collection. Standard Payload 3 + Next pattern:
 *
 *   1. Authenticate the PAYLOAD ADMIN via `payload.auth(headers)` — the admin panel opens
 *      this URL in the same browser session, so the `users` auth cookie rides along. No
 *      user -> 401, draft mode is never enabled (public draft URLs stay 404; access is not
 *      weakened for anyone else).
 *   2. Enable Next draft mode (sets the bypass cookie).
 *   3. Redirect to the article, which fetches with `draft: true` + `overrideAccess: true`
 *      ONLY while draft mode is on (see src/app/(frontend)/blog/[slug]/page.tsx).
 *
 * Only a `slug` param is accepted (never a free-form redirect path) — no open-redirect
 * surface.
 */
export async function GET(request: Request): Promise<Response> {
  const payload = await getPayload({ config })

  const { user } = await payload.auth({ headers: request.headers })
  if (!user) {
    return new Response('You must be logged in to the admin panel to preview drafts.', {
      status: 401,
    })
  }

  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  if (!slug) {
    return new Response('Missing "slug" query parameter.', { status: 400 })
  }

  const draft = await draftMode()
  draft.enable()

  redirect(`/blog/${encodeURIComponent(slug)}`)
}
