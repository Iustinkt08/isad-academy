/**
 * Per-category sender addresses (HANDOFF.md TODO #1 — "fiecare tip de email trimite de pe
 * adresa potrivită").
 *
 * WHY split at all: sender reputation accrues per address. A newsletter inevitably collects
 * "mark as spam" clicks; if it ships from the same address as payment confirmations, it
 * degrades deliverability exactly where it hurts most — someone paid and never got the
 * receipt. Separate addresses isolate the two flows.
 *
 * Fallback chain: the category-specific address → `BREVO_SENDER_EMAIL`. That lets
 * `notification` stay UNCONFIGURED at launch (it lands on the transactional address) and be
 * split off later with a single env var, no code change (CLAUDE.md §15 — open decisions are
 * config, never hardcoded).
 *
 * EXCEPTION — the newsletter double opt-in email does NOT go through here. Brevo sends it
 * via `POST /contacts/doubleOptinConfirmation`, which takes no `sender` field: the from
 * address comes from the `BREVO_DOI_TEMPLATE_ID` template, so it is set in the Brevo
 * dashboard, not from env. Don't look for it in this file.
 */

export type SenderKind =
  /** Emails the customer asked for: order received/confirmed, lead magnet, review request,
   *  admin password reset. Also the fallback for every other category. */
  | 'transactional'
  /** Internal alerts to the team (new lead, new event registration). Unconfigured by
   *  default — falls back to `transactional` until someone sets the env var. */
  | 'notification'
  /** Marketing: ad-hoc campaigns and the "new blog post" broadcast. */
  | 'newsletter'

export type Sender = { email: string; name: string }

/** Last-resort display name — brand is always lowercase (CLAUDE.md §12). */
export const DEFAULT_SENDER_NAME = 'isad.academy'

/** The subset of `BrevoConfig` this module needs. Declared structurally (not by importing
 * `BrevoConfig`) so `pickSender` stays a pure function testable without the Brevo client. */
export type SenderFields = {
  senderEmail: string
  senderName: string
  notificationSenderEmail?: string
  notificationSenderName?: string
  newsletterSenderEmail?: string
  newsletterSenderName?: string
}

/** Reads the sender env vars fresh — never cached at module load, mirroring
 * `readConfigFromEnv` in `./brevo.ts` so an env change takes effect on the next send. */
export const readSendersFromEnv = (): SenderFields => ({
  senderEmail: process.env.BREVO_SENDER_EMAIL?.trim() || '',
  senderName: process.env.BREVO_SENDER_NAME?.trim() || DEFAULT_SENDER_NAME,
  notificationSenderEmail: process.env.BREVO_SENDER_NOTIFICATION_EMAIL?.trim() || '',
  notificationSenderName: process.env.BREVO_SENDER_NOTIFICATION_NAME?.trim() || '',
  newsletterSenderEmail: process.env.BREVO_SENDER_NEWSLETTER_EMAIL?.trim() || '',
  newsletterSenderName: process.env.BREVO_SENDER_NEWSLETTER_NAME?.trim() || '',
})

/**
 * Resolves the `{ email, name }` pair for a category, applying the fallback chain. An empty
 * string counts as "not configured" (env vars that exist but are blank are the normal state
 * on a half-configured server), so a blank category never yields a blank sender.
 */
export const pickSender = (config: SenderFields, kind: SenderKind): Sender => {
  const specific: Sender =
    kind === 'newsletter'
      ? { email: config.newsletterSenderEmail ?? '', name: config.newsletterSenderName ?? '' }
      : kind === 'notification'
        ? { email: config.notificationSenderEmail ?? '', name: config.notificationSenderName ?? '' }
        : { email: '', name: '' }

  return {
    email: specific.email || config.senderEmail,
    name: specific.name || config.senderName || DEFAULT_SENDER_NAME,
  }
}
