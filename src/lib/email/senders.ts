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
 * Emailul de confirmare a abonării trece PRIN aici, categoria `newsletter` (din 2026-08-06:
 * îl trimitem noi, nu funcția DOI a Brevo — v. docs/EMAIL.md). Nota veche care spunea că e o
 * excepție nu mai e valabilă.
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
 * Reply-To pentru emailurile automate de newsletter (confirmarea abonării).
 *
 * De ce separat de `BREVO_REPLY_TO_EMAIL`: aceea e adresa monitorizată (`contact@`) și e
 * corectă pentru chitanțe și confirmări de comandă — cine răspunde la factură TREBUIE să
 * ajungă la un om. Confirmarea abonării e însă un email de mașină: nu are sens ca un „Reply"
 * la el să deschidă un fir de discuție.
 *
 * Fallback pe `BREVO_SENDER_EMAIL` (`no-reply@isad.academy`) — și e important că NU întoarce
 * niciodată gol degeaba: dacă nu trimitem deloc câmpul, Brevo pune tăcut adresa cu care a
 * fost creat contul (`silviu.gresoi@isad.ai`), adică o adresă personală, pe alt domeniu,
 * neautentificat. Exact asta s-a și întâmplat în producție (owner 2026-08-07).
 */
export const readNewsletterReplyTo = (): string =>
  process.env.BREVO_REPLY_TO_NEWSLETTER_EMAIL?.trim() || process.env.BREVO_SENDER_EMAIL?.trim() || ''

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
