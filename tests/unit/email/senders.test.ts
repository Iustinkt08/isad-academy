import { afterEach, describe, expect, it } from 'vitest'

import {
  DEFAULT_SENDER_NAME,
  pickSender,
  readSendersFromEnv,
  type SenderFields,
} from '../../../src/lib/email/senders'

const FULL: SenderFields = {
  senderEmail: 'no-reply@isad.academy',
  senderName: 'isad.academy',
  newsletterSenderEmail: 'news@isad.academy',
  newsletterSenderName: 'isad.academy news',
  notificationSenderEmail: 'alerts@isad.academy',
  notificationSenderName: 'isad.academy alerts',
}

/** Only the default pair configured — the realistic launch state (HANDOFF.md TODO #1). */
const MINIMAL: SenderFields = {
  senderEmail: 'no-reply@isad.academy',
  senderName: 'isad.academy',
}

describe('pickSender', () => {
  it('uses the category address when configured', () => {
    expect(pickSender(FULL, 'newsletter')).toEqual({
      email: 'news@isad.academy',
      name: 'isad.academy news',
    })
    expect(pickSender(FULL, 'notification')).toEqual({
      email: 'alerts@isad.academy',
      name: 'isad.academy alerts',
    })
  })

  it('always resolves transactional to the default pair, even when others are set', () => {
    expect(pickSender(FULL, 'transactional')).toEqual({
      email: 'no-reply@isad.academy',
      name: 'isad.academy',
    })
  })

  it('falls back to the default address for every unconfigured category', () => {
    // The launch configuration: notification is deliberately unset and must NOT produce an
    // empty sender (Brevo would reject the send with a 400).
    for (const kind of ['transactional', 'notification', 'newsletter'] as const) {
      expect(pickSender(MINIMAL, kind)).toEqual({
        email: 'no-reply@isad.academy',
        name: 'isad.academy',
      })
    }
  })

  it('treats an empty string as unconfigured, not as a valid address', () => {
    const blanked: SenderFields = {
      ...MINIMAL,
      newsletterSenderEmail: '',
      newsletterSenderName: '',
    }
    expect(pickSender(blanked, 'newsletter')).toEqual({
      email: 'no-reply@isad.academy',
      name: 'isad.academy',
    })
  })

  it('falls back per-field: a category may set only the address and inherit the name', () => {
    const emailOnly: SenderFields = { ...MINIMAL, newsletterSenderEmail: 'news@isad.academy' }
    expect(pickSender(emailOnly, 'newsletter')).toEqual({
      email: 'news@isad.academy',
      name: 'isad.academy',
    })
  })

  it('uses the brand default name when nothing at all is configured', () => {
    expect(pickSender({ senderEmail: '', senderName: '' }, 'transactional')).toEqual({
      email: '',
      name: DEFAULT_SENDER_NAME,
    })
  })
})

describe('readSendersFromEnv', () => {
  const KEYS = [
    'BREVO_SENDER_EMAIL',
    'BREVO_SENDER_NAME',
    'BREVO_SENDER_NEWSLETTER_EMAIL',
    'BREVO_SENDER_NEWSLETTER_NAME',
    'BREVO_SENDER_NOTIFICATION_EMAIL',
    'BREVO_SENDER_NOTIFICATION_NAME',
  ] as const

  afterEach(() => {
    for (const key of KEYS) delete process.env[key]
  })

  it('reads every sender var and trims surrounding whitespace', () => {
    process.env.BREVO_SENDER_EMAIL = '  no-reply@isad.academy  '
    process.env.BREVO_SENDER_NAME = 'isad.academy'
    process.env.BREVO_SENDER_NEWSLETTER_EMAIL = 'news@isad.academy'

    const config = readSendersFromEnv()

    expect(config.senderEmail).toBe('no-reply@isad.academy')
    expect(pickSender(config, 'newsletter').email).toBe('news@isad.academy')
    // Unset category still resolves, via the fallback chain.
    expect(pickSender(config, 'notification').email).toBe('no-reply@isad.academy')
  })

  it('defaults the display name to the brand when BREVO_SENDER_NAME is unset', () => {
    expect(readSendersFromEnv().senderName).toBe(DEFAULT_SENDER_NAME)
  })
})
