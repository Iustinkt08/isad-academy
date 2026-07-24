import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getMailer, setMailerForTesting } from '../../../src/lib/email'

describe('getMailer (unit)', () => {
  const originalApiKey = process.env.BREVO_API_KEY

  beforeEach(() => {
    setMailerForTesting(null)
  })

  afterEach(() => {
    setMailerForTesting(null)
    process.env.BREVO_API_KEY = originalApiKey
  })

  it('returns the NoopMailer when BREVO_API_KEY is unset', () => {
    delete process.env.BREVO_API_KEY
    expect(getMailer().name).toBe('noop')
  })

  it('returns the NoopMailer when BREVO_API_KEY is an empty/blank string', () => {
    process.env.BREVO_API_KEY = '   '
    expect(getMailer().name).toBe('noop')
  })

  it('returns the BrevoMailer when BREVO_API_KEY is set', () => {
    process.env.BREVO_API_KEY = 'a-real-key'
    expect(getMailer().name).toBe('brevo')
  })

  it('reads the env var fresh on every call — never cached at module load', () => {
    delete process.env.BREVO_API_KEY
    expect(getMailer().name).toBe('noop')

    process.env.BREVO_API_KEY = 'a-real-key'
    expect(getMailer().name).toBe('brevo')

    delete process.env.BREVO_API_KEY
    expect(getMailer().name).toBe('noop')
  })

  it('setMailerForTesting overrides the selection regardless of env', () => {
    process.env.BREVO_API_KEY = 'a-real-key'
    const fake = {
      name: 'fake',
      sendTransactional: async () => ({ ok: true as const }),
      subscribeDoubleOptIn: async () => ({ ok: true as const }),
      broadcastNewPost: async () => ({ ok: true as const }),
    }

    setMailerForTesting(fake)
    expect(getMailer()).toBe(fake)
    expect(getMailer().name).toBe('fake')
  })

  it('setMailerForTesting(null) clears the override', () => {
    setMailerForTesting({
      name: 'fake',
      sendTransactional: async () => ({ ok: true as const }),
      subscribeDoubleOptIn: async () => ({ ok: true as const }),
      broadcastNewPost: async () => ({ ok: true as const }),
    })
    setMailerForTesting(null)

    delete process.env.BREVO_API_KEY
    expect(getMailer().name).toBe('noop')
  })
})
