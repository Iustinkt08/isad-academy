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
import type { Locale } from '../i18n/config'
import type { SenderKind } from './senders'

export type MailerResult = { ok: true } | { ok: false; error: string }

export type SendTransactionalInput = {
  to: string
  subject: string
  html: string
  text: string
  /** Which sender address this email ships from (`./senders.ts`). Defaults to
   * `'transactional'`; internal team alerts pass `'notification'`. Broadcasts don't use this
   * — they are newsletter by definition, so the provider picks that sender itself. */
  sender?: SenderKind
  /** Unde ajunge un Reply al destinatarului. Providerul cade înapoi pe adresa globală de
   * reply-to din env (BREVO_REPLY_TO_EMAIL) când lipsește; util per-mesaj la notificările
   * de lead, unde Reply trebuie să meargă direct la emailul lead-ului. */
  replyTo?: string
}

export type SubscribeDoubleOptInInput = {
  email: string
  /** Language the visitor subscribed in. Decides where the confirmation link lands: EN is
   * unprefixed, RO goes to `/ro/newsletter/confirmed`. Omitted → EN, so an older caller that
   * doesn't send it keeps working. */
  locale?: Locale
}

/** Confirmarea a fost deja dovedită de ruta care cheamă — aici nu mai există „poate". */
export type AddToNewsletterListInput = {
  email: string
}

export type BroadcastNewPostInput = {
  title: string
  excerpt: string
  url: string
}

/** A one-off newsletter written in the admin (owner 2026-07-29) — already-rendered HTML,
 * so the provider only has to address it to the subscriber list. `name` is the internal
 * campaign label in the provider's dashboard, never shown to recipients. */
export type BroadcastCampaignInput = {
  name: string
  subject: string
  html: string
}

export interface Mailer {
  /** Short, human-readable identifier for logging (e.g. `'brevo'`, `'noop'`). Not used for
   * branching logic anywhere outside `src/lib/email/**`. */
  name: string
  /** A single transactional email — payment confirmation, lead notification. */
  sendTransactional(input: SendTransactionalInput): Promise<MailerResult>
  /** Newsletter double opt-in: sends the confirmation email; the contact is only actually
   * subscribed once the recipient clicks through.
   *
   * NEFOLOSIT în fluxul curent (owner 2026-08-06): funcția DOI nativă a Brevo cere un
   * template din registrul lor DOI, care nu se poate crea prin API, așa că trimitem noi
   * emailul de confirmare (`renderNewsletterConfirmEmail` + `sendTransactional`) și chemăm
   * `addToNewsletterList` la click. Metoda rămâne în interfață pentru că e proprietatea
   * unui PROVIDER, nu a Brevo: un provider viitor cu DOI funcțional o poate folosi. */
  subscribeDoubleOptIn(input: SubscribeDoubleOptInInput): Promise<MailerResult>
  /** Adaugă contactul în lista de newsletter — se cheamă DOAR după ce consimțământul a fost
   * dovedit (click pe linkul semnat). Idempotentă: o a doua confirmare nu e o eroare. */
  addToNewsletterList(input: AddToNewsletterListInput): Promise<MailerResult>
  /** Broadcasts a "new blog post" campaign to the newsletter list. */
  broadcastNewPost(input: BroadcastNewPostInput): Promise<MailerResult>
  /** Broadcasts an ad-hoc newsletter (composed in the admin) to the same list. */
  broadcastCampaign(input: BroadcastCampaignInput): Promise<MailerResult>
}
