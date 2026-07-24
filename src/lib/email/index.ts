/**
 * Public surface of the email module (CLAUDE.md §11, §15 — `Mailer` is an interface; Brevo
 * is swappable). Collection hooks and API routes import ONLY from this file (or `./types`)
 * — never `./brevo` directly — so the vendor stays fully isolated.
 */
import { createBrevoMailer } from './brevo'
import { createNoopMailer } from './noop'
import type { Mailer } from './types'

export { createBrevoMailer } from './brevo'
export type { BrevoConfig } from './brevo'
export { createNoopMailer } from './noop'
export type {
  BroadcastNewPostInput,
  Mailer,
  MailerResult,
  SendTransactionalInput,
  SubscribeDoubleOptInInput,
} from './types'

let mailerOverride: Mailer | null = null

/**
 * Selects the active `Mailer` (CLAUDE.md §2/§11): Brevo when `BREVO_API_KEY` is set,
 * otherwise `NoopMailer` — read fresh from `process.env` on every call (never cached at
 * module-load time), mirroring `getPaymentProvider`'s contract in `src/lib/payments/index.ts`
 * so a live env change (or a test flipping the var mid-suite) takes effect immediately.
 *
 * `setMailerForTesting` below takes priority when set, for int tests that need a recording
 * fake without touching env vars at all.
 */
export const getMailer = (): Mailer => {
  if (mailerOverride) return mailerOverride

  const apiKey = process.env.BREVO_API_KEY?.trim()
  if (!apiKey) return createNoopMailer()

  return createBrevoMailer()
}

/**
 * TEST-ONLY. Installs a global override for `getMailer()` so integration tests can inject a
 * recording `FakeMailer` (see tests/int/email-hooks.int.spec.ts) without mutating
 * `BREVO_API_KEY`/other env vars. Call with `null` to clear the override — always do this in
 * an `afterEach`/`afterAll`, or a later test file will silently keep using whatever mailer a
 * previous test installed (this module-level variable persists for the life of the Vitest
 * worker process).
 */
export const setMailerForTesting = (mailer: Mailer | null): void => {
  mailerOverride = mailer
}
