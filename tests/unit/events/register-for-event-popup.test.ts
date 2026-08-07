import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'

import {
  HONEYPOT_FIELD,
  registerForEventPopup,
} from '../../../src/lib/events/registerForEventPopup'
import { setMailerForTesting } from '../../../src/lib/email'
import type { Mailer } from '../../../src/lib/email/types'

/** Departe în viitor, ca testele să nu depindă de ceasul mașinii. */
const FUTURE = '2099-01-01T00:00:00.000Z'
const PAST = '2020-01-01T00:00:00.000Z'

const PUBLISHED_POPUP = {
  id: 7,
  slug: 'ai-governance',
  status: 'published',
  eventDate: FUTURE,
  newsletterConsentText: 'Vreau noutăți de la isad.academy',
}

/**
 * Stub Payload: primul `find` întoarce pop-up-ul, al doilea verificarea de dedupe. Ordinea
 * e cea din pipeline — dacă cineva o inversează, testele astea cad, ceea ce e exact ce vrem:
 * pop-up-ul TREBUIE validat înainte de orice scriere.
 */
const makePayload = (popup: unknown = PUBLISHED_POPUP, existingCount = 0) => {
  const find = vi
    .fn()
    .mockResolvedValueOnce({ docs: popup ? [popup] : [], totalDocs: popup ? 1 : 0 })
    .mockResolvedValue({ docs: [], totalDocs: existingCount })
  const create = vi.fn().mockResolvedValue({ id: 1 })
  const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn() }
  return { payload: { find, create, logger } as unknown as Payload, find, create, logger }
}

const deps = (payload: Payload) => ({
  payload,
  slug: 'ai-governance',
  ip: '203.0.113.7',
  userAgent: 'Mozilla/5.0',
})

const validInput = {
  firstName: 'Ana',
  lastName: 'Popescu',
  email: 'ana@example.com',
  occupation: 'Consultant',
}

const stubMailer = (overrides: Partial<Mailer> = {}): Mailer => ({
  name: 'fake',
  sendTransactional: async () => ({ ok: true }),
  subscribeDoubleOptIn: async () => ({ ok: true }),
  addToNewsletterList: async () => ({ ok: true }),
  broadcastNewPost: async () => ({ ok: true }),
  broadcastCampaign: async () => ({ ok: true }),
  ...overrides,
})

describe('registerForEventPopup', () => {
  beforeEach(() => {
    process.env.PAYLOAD_SECRET = 'test-secret'
    setMailerForTesting(stubMailer())
  })

  it('creates a registration and returns 201', async () => {
    const { payload, create } = makePayload()
    const result = await registerForEventPopup(validInput, deps(payload))

    expect(result.status).toBe(201)
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'eventRegistrations',
        data: expect.objectContaining({ popup: 7, email: 'ana@example.com' }),
      }),
    )
  })

  it('404s on an unknown slug without touching the database', async () => {
    const { payload, create } = makePayload(null)
    const result = await registerForEventPopup(validInput, deps(payload))

    expect(result.status).toBe(404)
    expect(create).not.toHaveBeenCalled()
  })

  it.each([
    ['draft', { ...PUBLISHED_POPUP, status: 'draft' }],
    ['archived', { ...PUBLISHED_POPUP, status: 'archived' }],
    ['past', { ...PUBLISHED_POPUP, eventDate: PAST }],
  ])('refuses a %s event', async (_label, popup) => {
    const { payload, create } = makePayload(popup)
    const result = await registerForEventPopup(validInput, deps(payload))

    expect(result.status).toBe(400)
    expect(create).not.toHaveBeenCalled()
  })

  it('honeypot: fakes success without persisting or reading anything', async () => {
    const { payload, find, create } = makePayload()
    const result = await registerForEventPopup(
      { ...validInput, [HONEYPOT_FIELD]: 'http://spam.example' },
      deps(payload),
    )

    expect(result).toEqual({ status: 201, body: { ok: true, registered: true } })
    expect(find).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  it('acknowledges a duplicate with 200 and no second row', async () => {
    const { payload, create } = makePayload(PUBLISHED_POPUP, 1)
    const result = await registerForEventPopup(validInput, deps(payload))

    expect(result.status).toBe(200)
    expect(create).not.toHaveBeenCalled()
  })

  it('stores the consent snapshot only when the box was ticked', async () => {
    const { payload, create } = makePayload()
    await registerForEventPopup({ ...validInput, newsletterOptIn: true }, deps(payload))

    const data = create.mock.calls[0]?.[0]?.data
    expect(data.newsletterOptIn).toBe(true)
    expect(data.consentSnapshot).toEqual(
      expect.objectContaining({
        consentText: 'Vreau noutăți de la isad.academy',
        ip: '203.0.113.7',
        userAgent: 'Mozilla/5.0',
      }),
    )
  })

  it('stores NO consent snapshot when the box was left unticked', async () => {
    const { payload, create } = makePayload()
    await registerForEventPopup(validInput, deps(payload))

    const data = create.mock.calls[0]?.[0]?.data
    expect(data.newsletterOptIn).toBe(false)
    expect(data.consentSnapshot).toBeUndefined()
  })

  it('sends the double opt-in e-mail ONLY when the box was ticked', async () => {
    let sent = 0
    setMailerForTesting(
      stubMailer({
        sendTransactional: async () => {
          sent += 1
          return { ok: true }
        },
      }),
    )

    const withoutBox = makePayload()
    await registerForEventPopup(validInput, deps(withoutBox.payload))
    expect(sent).toBe(0)

    const withBox = makePayload()
    await registerForEventPopup({ ...validInput, newsletterOptIn: true }, deps(withBox.payload))
    expect(sent).toBe(1)
  })

  it('never adds anyone to the newsletter list directly — only the DOI e-mail goes out', async () => {
    let added = 0
    setMailerForTesting(
      stubMailer({
        addToNewsletterList: async () => {
          added += 1
          return { ok: true }
        },
      }),
    )
    const { payload } = makePayload()

    await registerForEventPopup({ ...validInput, newsletterOptIn: true }, deps(payload))

    expect(added).toBe(0)
  })

  it('keeps the registration when the newsletter e-mail fails', async () => {
    // Omul a venit pentru eveniment. O problemă la newsletter nu are voie să-l coste locul.
    setMailerForTesting(
      stubMailer({ sendTransactional: async () => ({ ok: false, error: 'Brevo down' }) }),
    )
    const { payload, create, logger } = makePayload()

    const result = await registerForEventPopup(
      { ...validInput, newsletterOptIn: true },
      deps(payload),
    )

    expect(result.status).toBe(201)
    expect(create).toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalled()
  })

  it.each([
    ['missing first name', { ...validInput, firstName: '' }],
    ['missing last name', { ...validInput, lastName: '' }],
    ['malformed e-mail', { ...validInput, email: 'nope' }],
    ['over-long field', { ...validInput, occupation: 'x'.repeat(201) }],
  ])('rejects %s with 400', async (_label, input) => {
    const { payload, create } = makePayload()
    const result = await registerForEventPopup(input, deps(payload))

    expect(result.status).toBe(400)
    expect(create).not.toHaveBeenCalled()
  })
})
