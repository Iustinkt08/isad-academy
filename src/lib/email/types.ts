/**
 * Vendor-agnostic email contract (CLAUDE.md §2 env vars, §11, §15 — "Mailer is an
 * interface"). Brevo is the concrete provider (`./brevo.ts`), but nothing outside
 * `src/lib/email/**` may reference Brevo directly — collection hooks and API routes only
 * ever see this shape via `getMailer()` (`./index.ts`).
 *
 * Every method returns a `MailerResult` and NEVER throws — a failed send is data, not an
 * exception, so every caller (a collection `afterChange` hook, a Next.js API route) can
 * log-and-continue without wrapping business logic in a try/catch just to survive an email
 * provider being down (CLAUDE.md §7/§15 — "email failure never breaks the request").
 */
export type MailerResult = { ok: true } | { ok: false; error: string }

export type SendTransactionalInput = {
  to: string
  subject: string
  html: string
  text: string
}

export type SubscribeDoubleOptInInput = {
  email: string
}

export type BroadcastNewPostInput = {
  title: string
  excerpt: string
  url: string
}

export interface Mailer {
  /** Short, human-readable identifier for logging (e.g. `'brevo'`, `'noop'`). Not used for
   * branching logic anywhere outside `src/lib/email/**`. */
  name: string
  /** A single transactional email — payment confirmation, lead notification. */
  sendTransactional(input: SendTransactionalInput): Promise<MailerResult>
  /** Newsletter double opt-in: sends the confirmation email; the contact is only actually
   * subscribed once the recipient clicks through. */
  subscribeDoubleOptIn(input: SubscribeDoubleOptInInput): Promise<MailerResult>
  /** Broadcasts a "new blog post" campaign to the newsletter list. */
  broadcastNewPost(input: BroadcastNewPostInput): Promise<MailerResult>
}
