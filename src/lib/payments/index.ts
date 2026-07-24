import { EuPlatescProvider } from './euplatesc'
import { MockProvider } from './mock'
import { NetopiaProvider } from './netopia'
import { StripeProvider } from './stripe'
import type { PaymentProvider } from './types'

export { EuPlatescProvider } from './euplatesc'
export { FAILING_TEST_EMAIL, MockProvider } from './mock'
export { NetopiaProvider } from './netopia'
export { StripeProvider } from './stripe'
export { NotImplementedError } from './types'
export type { CreatePaymentInput, CreatePaymentResult, PaymentProvider, PaymentStatusResult } from './types'

const PROVIDERS: Record<string, PaymentProvider> = {
  mock: MockProvider,
  stripe: StripeProvider,
  netopia: NetopiaProvider,
  euplatesc: EuPlatescProvider,
}

/**
 * Selects the active `PaymentProvider` per CLAUDE.md §2 (`PAYMENT_PROVIDER` env var),
 * defaulting to `'mock'` when unset — read fresh from `process.env` on every call (never
 * cached at module-load time), so tests that flip the env var mid-suite, or a live config
 * change, take effect immediately without re-importing anything.
 *
 * An unrecognized value throws at CALL time (not at import time) with a clear message —
 * this module has zero side effects on import, so simply importing it never risks throwing
 * for an as-yet-unconfigured env.
 *
 * SECURITY (T16): `MockProvider` auto-confirms every payment, so a production deploy that
 * silently falls back to it would sell every seat for free. In `NODE_ENV === 'production'`
 * the mock is therefore refused loudly at call time — checkout fails safe — unless
 * `ALLOW_MOCK_PAYMENTS=true` is set explicitly (a staging-only escape hatch; never set it
 * in production).
 */
export const getPaymentProvider = (): PaymentProvider => {
  const name = process.env.PAYMENT_PROVIDER?.trim() || 'mock'
  const provider = PROVIDERS[name]

  if (!provider) {
    throw new Error(
      `Unknown PAYMENT_PROVIDER "${name}". Supported values: ${Object.keys(PROVIDERS).join(', ')}.`,
    )
  }

  if (
    name === 'mock' &&
    process.env.NODE_ENV === 'production' &&
    process.env.ALLOW_MOCK_PAYMENTS !== 'true'
  ) {
    throw new Error(
      'Refusing to use the mock payment provider in production: it auto-confirms every ' +
        'payment, which would hand out real seats for free. Set PAYMENT_PROVIDER to a real ' +
        'provider (stripe | netopia | euplatesc), or — for a staging environment ONLY — set ' +
        'ALLOW_MOCK_PAYMENTS=true to override. NEVER set ALLOW_MOCK_PAYMENTS in production.',
    )
  }

  return provider
}
