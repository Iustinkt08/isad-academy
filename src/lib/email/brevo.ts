/**
 * Brevo `Mailer` implementation — plain `fetch` against `https://api.brevo.com/v3`.
 *
 * DEVIATION FROM docs/PLAN.md: the locked tech decision names `@getbrevo/brevo@6` as the
 * client. At T7 build time this file instead uses a thin, dependency-free HTTP client —
 * pre-sanctioned by research for exactly this situation: the generated SDK's method surface
 * for the three calls this project actually needs (transactional send, native double
 * opt-in, campaign create + send) is not worth taking on as a new dependency when the
 * `Mailer` interface (`./types.ts`) ALREADY fully isolates the vendor. Nothing outside this
 * file (and `./index.ts`'s factory) knows or cares that Brevo is the provider, or that it's
 * reached over raw HTTP rather than a generated client — swapping to the official SDK
 * later is a same-file, zero-blast-radius change. Zero new dependencies is a deliberate,
 * documented win here, not an oversight.
 *
 * Endpoints used (CLAUDE.md §10-11):
 *   - `POST /smtp/email` — transactional send (payment confirmation, lead notification).
 *   - `POST /contacts/doubleOptinConfirmation` — newsletter double opt-in; the contact is
 *     only actually added to `BREVO_NEWSLETTER_LIST_ID` once the recipient clicks the
 *     confirmation link Brevo sends from `BREVO_DOI_TEMPLATE_ID`, which redirects to
 *     `NEXT_PUBLIC_SITE_URL/newsletter/confirmed` on success.
 *   - `POST /emailCampaigns` then `POST /emailCampaigns/{id}/sendNow` — the blog "new post"
 *     broadcast: Brevo has no single "create + send immediately" call, so this is two
 *     round-trips; a created-but-not-sent campaign (the first call OK, the second failing)
 *     surfaces as `{ ok: false }` same as any other failure — nothing here silently retries.
 *
 * Every method returns a `MailerResult` and NEVER throws (`./types.ts`): a non-2xx response,
 * a network error and a 10s timeout (`AbortController`, below) all collapse to
 * `{ ok: false, error }`.
 */
import { renderBlogBroadcastEmail } from './templates/blogBroadcast'
import type { BroadcastCampaignInput, BroadcastNewPostInput, Mailer, MailerResult, SendTransactionalInput, SubscribeDoubleOptInInput } from './types'

const BREVO_API_BASE = 'https://api.brevo.com/v3'
const REQUEST_TIMEOUT_MS = 10_000

export type BrevoConfig = {
  apiKey: string
  senderEmail: string
  senderName: string
  newsletterListId: string
  doiTemplateId: string
  siteUrl: string
}

/** Reads every Brevo-related env var fresh — never cached at module-load time (mirrors
 * `getPaymentProvider`'s contract in `src/lib/payments/index.ts`, so an env change takes
 * effect on the very next `getMailer()` call without re-importing anything). */
const readConfigFromEnv = (): BrevoConfig => ({
  apiKey: process.env.BREVO_API_KEY?.trim() || '',
  senderEmail: process.env.BREVO_SENDER_EMAIL?.trim() || '',
  senderName: process.env.BREVO_SENDER_NAME?.trim() || 'isad.academy',
  newsletterListId: process.env.BREVO_NEWSLETTER_LIST_ID?.trim() || '',
  doiTemplateId: process.env.BREVO_DOI_TEMPLATE_ID?.trim() || '',
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000').replace(/\/+$/, ''),
})

type BrevoHttpResult = { ok: true; json: unknown } | { ok: false; error: string }

/** POSTs JSON to `${BREVO_API_BASE}${path}` with a 10s `AbortController` timeout. Never
 * throws — every failure mode (non-2xx, network error, timeout) becomes `{ ok: false }`. */
const postJson = async (path: string, body: unknown, apiKey: string): Promise<BrevoHttpResult> => {
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${BREVO_API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '')
      return {
        ok: false,
        error: `Brevo ${path} responded ${response.status}${bodyText ? `: ${bodyText.slice(0, 500)}` : ''}`,
      }
    }

    const json = await response.json().catch(() => null)
    return { ok: true, json }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: `Brevo ${path} timed out after ${REQUEST_TIMEOUT_MS}ms` }
    }
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Brevo ${path} request failed: ${message}` }
  } finally {
    clearTimeout(timeoutHandle)
  }
}

const toMailerResult = (response: BrevoHttpResult): MailerResult =>
  response.ok ? { ok: true } : { ok: false, error: response.error }

/**
 * Constructs a Brevo-backed `Mailer`. Config is read from `process.env` at CALL time (via
 * `getMailer()` in `./index.ts`) — `overrides` additionally lets unit tests inject config
 * directly instead of mutating global `process.env` (no restoration/cleanup needed between
 * tests; see tests/unit/email/brevo.test.ts).
 */
export const createBrevoMailer = (overrides: Partial<BrevoConfig> = {}): Mailer => {
  const merged: BrevoConfig = { ...readConfigFromEnv(), ...overrides }
  // Normalize a trailing slash regardless of whether `siteUrl` came from env or an override —
  // `${config.siteUrl}/newsletter/confirmed` below must never end up with a doubled slash.
  const config: BrevoConfig = { ...merged, siteUrl: merged.siteUrl.replace(/\/+$/, '') }

  /** Create-then-send, shared by both broadcast methods. Brevo has no single
   * "create + send immediately" call, so a created-but-unsent campaign (first call OK,
   * second failing) surfaces as `{ ok: false }` like any other failure — nothing retries. */
  const sendCampaign = async (input: BroadcastCampaignInput): Promise<MailerResult> => {
    if (!config.newsletterListId) {
      return { ok: false, error: 'Brevo broadcast is not configured (BREVO_NEWSLETTER_LIST_ID missing).' }
    }

    const created = await postJson(
      '/emailCampaigns',
      {
        // Brevo rejects duplicate campaign names; the timestamp keeps re-sends distinct.
        name: `${input.name} — ${new Date().toISOString()}`,
        subject: input.subject,
        sender: { email: config.senderEmail, name: config.senderName },
        type: 'classic',
        htmlContent: input.html,
        recipients: { listIds: [Number(config.newsletterListId)] },
      },
      config.apiKey,
    )

    if (!created.ok) return { ok: false, error: created.error }

    const campaignId = (created.json as { id?: number | string } | null)?.id
    if (campaignId == null) {
      return { ok: false, error: 'Brevo /emailCampaigns response did not include a campaign id.' }
    }

    const sent = await postJson(`/emailCampaigns/${campaignId}/sendNow`, {}, config.apiKey)
    return toMailerResult(sent)
  }

  return {
    name: 'brevo',

    async sendTransactional(input: SendTransactionalInput): Promise<MailerResult> {
      const response = await postJson(
        '/smtp/email',
        {
          sender: { email: config.senderEmail, name: config.senderName },
          to: [{ email: input.to }],
          subject: input.subject,
          htmlContent: input.html,
          textContent: input.text,
        },
        config.apiKey,
      )
      return toMailerResult(response)
    },

    async subscribeDoubleOptIn(input: SubscribeDoubleOptInInput): Promise<MailerResult> {
      if (!config.newsletterListId || !config.doiTemplateId) {
        return {
          ok: false,
          error:
            'Brevo newsletter double opt-in is not configured (BREVO_NEWSLETTER_LIST_ID / BREVO_DOI_TEMPLATE_ID missing).',
        }
      }

      const response = await postJson(
        '/contacts/doubleOptinConfirmation',
        {
          email: input.email,
          includeListIds: [Number(config.newsletterListId)],
          templateId: Number(config.doiTemplateId),
          redirectionUrl: `${config.siteUrl}/newsletter/confirmed`,
        },
        config.apiKey,
      )
      return toMailerResult(response)
    },

    async broadcastNewPost(input: BroadcastNewPostInput): Promise<MailerResult> {
      const { subject, html } = renderBlogBroadcastEmail(input)
      return sendCampaign({ name: `Blog: ${input.title}`, subject, html })
    },

    async broadcastCampaign(input: BroadcastCampaignInput): Promise<MailerResult> {
      return sendCampaign(input)
    },
  }
}
