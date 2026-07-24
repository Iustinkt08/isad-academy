import { afterEach, describe, expect, it, vi } from 'vitest'

import { getPaymentProvider, MockProvider, StripeProvider } from '../../../src/lib/payments'

/**
 * T16 item 1 — the mock-provider production guard. `MockProvider` auto-confirms every
 * payment, so resolving it under NODE_ENV=production must throw loudly (checkout fails
 * safe; nothing is sellable for free) unless the explicit `ALLOW_MOCK_PAYMENTS=true`
 * staging escape hatch is set.
 */
describe('getPaymentProvider — mock production guard (T16)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns MockProvider outside production (dev/test default)', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('PAYMENT_PROVIDER', 'mock')

    expect(getPaymentProvider()).toBe(MockProvider)
  })

  it('returns MockProvider when PAYMENT_PROVIDER is unset outside production', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('PAYMENT_PROVIDER', '')

    expect(getPaymentProvider()).toBe(MockProvider)
  })

  it('throws for an explicit mock provider in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PAYMENT_PROVIDER', 'mock')
    vi.stubEnv('ALLOW_MOCK_PAYMENTS', '')

    expect(() => getPaymentProvider()).toThrow(/mock payment provider in production/i)
  })

  it('throws for the implicit mock fallback (PAYMENT_PROVIDER unset) in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PAYMENT_PROVIDER', '')
    vi.stubEnv('ALLOW_MOCK_PAYMENTS', '')

    expect(() => getPaymentProvider()).toThrow(/mock payment provider in production/i)
  })

  it('allows the mock in production when ALLOW_MOCK_PAYMENTS=true (staging escape hatch)', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PAYMENT_PROVIDER', 'mock')
    vi.stubEnv('ALLOW_MOCK_PAYMENTS', 'true')

    expect(getPaymentProvider()).toBe(MockProvider)
  })

  it('requires the escape hatch to be exactly "true" — "1"/"yes" still throw', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PAYMENT_PROVIDER', 'mock')

    vi.stubEnv('ALLOW_MOCK_PAYMENTS', '1')
    expect(() => getPaymentProvider()).toThrow(/mock payment provider in production/i)

    vi.stubEnv('ALLOW_MOCK_PAYMENTS', 'yes')
    expect(() => getPaymentProvider()).toThrow(/mock payment provider in production/i)
  })

  it('leaves real providers untouched in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PAYMENT_PROVIDER', 'stripe')
    vi.stubEnv('ALLOW_MOCK_PAYMENTS', '')

    expect(getPaymentProvider()).toBe(StripeProvider)
  })

  it('still rejects an unknown PAYMENT_PROVIDER value with the supported list', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('PAYMENT_PROVIDER', 'paypal')

    expect(() => getPaymentProvider()).toThrow(/Unknown PAYMENT_PROVIDER "paypal"/)
  })
})
