import type { BroadcastCampaignInput, BroadcastNewPostInput, Mailer, MailerResult, SendTransactionalInput, SubscribeDoubleOptInInput } from './types'

const ok = (): MailerResult => ({ ok: true })

/**
 * `NoopMailer` — the default `Mailer` when `BREVO_API_KEY` is unset (CLAUDE.md §11: dev
 * keeps working with zero config). Every method logs, at `warn` level, exactly what WOULD
 * have been sent ("log loudly" per the T7 build instructions) so an unconfigured
 * environment is never silently mistaken for "email works" — then reports success, so
 * nothing upstream (a checkout, a lead submission, a blog publish) ever blocks on email
 * being configured.
 */
export const createNoopMailer = (): Mailer => ({
  name: 'noop',

  async sendTransactional(input: SendTransactionalInput): Promise<MailerResult> {
    console.warn(
      `[NoopMailer] BREVO_API_KEY is not set — sendTransactional to="${input.to}" subject="${input.subject}" was NOT actually sent.`,
    )
    return ok()
  },

  async subscribeDoubleOptIn(input: SubscribeDoubleOptInInput): Promise<MailerResult> {
    console.warn(
      `[NoopMailer] BREVO_API_KEY is not set — subscribeDoubleOptIn email="${input.email}" was NOT actually subscribed.`,
    )
    return ok()
  },

  async broadcastNewPost(input: BroadcastNewPostInput): Promise<MailerResult> {
    console.warn(
      `[NoopMailer] BREVO_API_KEY is not set — broadcastNewPost title="${input.title}" url="${input.url}" was NOT actually sent.`,
    )
    return ok()
  },

  async broadcastCampaign(input: BroadcastCampaignInput): Promise<MailerResult> {
    console.warn(
      `[NoopMailer] BREVO_API_KEY is not set — broadcastCampaign subject="${input.subject}" was NOT actually sent.`,
    )
    return ok()
  },
})
