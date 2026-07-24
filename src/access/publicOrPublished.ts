import type { Access } from 'payload'

/**
 * Standard Payload drafts + access pattern: authenticated admin users can read every
 * document (including drafts); anonymous/public requests only ever see documents whose
 * `_status` is `published`. Used by collections with `versions.drafts` enabled (e.g.
 * `courses`) that must stay invisible to the public site until Silviu publishes them.
 */
export const publicOrPublished: Access = ({ req: { user } }) => {
  if (user) return true

  return {
    _status: {
      equals: 'published',
    },
  }
}
