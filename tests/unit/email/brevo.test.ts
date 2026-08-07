import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createBrevoMailer } from '../../../src/lib/email/brevo'

const BASE_CONFIG = {
  apiKey: 'test-api-key',
  senderEmail: 'hello@isad.academy',
  senderName: 'isad.academy',
  newsletterListId: '7',
  doiTemplateId: '3',
  siteUrl: 'https://isad.academy',
}

const jsonResponse = (body: unknown, init: { status?: number } = {}): Response =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json' },
  })

describe('BrevoMailer (unit)', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  describe('sendTransactional', () => {
    it('POSTs to /v3/smtp/email with the api-key header and correct payload', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ messageId: 'abc' }, { status: 201 }))

      const mailer = createBrevoMailer(BASE_CONFIG)
      const result = await mailer.sendTransactional({
        to: 'buyer@example.com',
        subject: 'Your enrolment is confirmed',
        html: '<p>hi</p>',
        text: 'hi',
      })

      expect(result).toEqual({ ok: true })
      expect(fetchMock).toHaveBeenCalledTimes(1)

      const [url, init] = fetchMock.mock.calls[0]!
      expect(url).toBe('https://api.brevo.com/v3/smtp/email')
      expect(init.method).toBe('POST')
      expect(init.headers['api-key']).toBe('test-api-key')
      expect(init.headers['Content-Type']).toBe('application/json')

      const body = JSON.parse(init.body)
      expect(body).toEqual({
        sender: { email: 'hello@isad.academy', name: 'isad.academy' },
        to: [{ email: 'buyer@example.com' }],
        subject: 'Your enrolment is confirmed',
        htmlContent: '<p>hi</p>',
        textContent: 'hi',
        // `replyTo` e trimis ÎNTOTDEAUNA, chiar și fără BREVO_REPLY_TO_EMAIL — aici cade pe
        // expeditor. Absența câmpului ar face Brevo să pună tăcut adresa contului
        // (personală, domeniu neautentificat) — regresie reală, 2026-08-07.
        replyTo: { email: 'hello@isad.academy' },
      })
    })

    it('returns { ok: false } with the status on a non-2xx response', async () => {
      fetchMock.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))

      const mailer = createBrevoMailer(BASE_CONFIG)
      const result = await mailer.sendTransactional({
        to: 'buyer@example.com',
        subject: 'Subject',
        html: '<p>hi</p>',
        text: 'hi',
      })

      expect(result.ok).toBe(false)
      expect(result.ok === false && result.error).toMatch(/401/)
    })

    it('returns { ok: false } when fetch itself rejects (network error)', async () => {
      fetchMock.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND api.brevo.com'))

      const mailer = createBrevoMailer(BASE_CONFIG)
      const result = await mailer.sendTransactional({
        to: 'buyer@example.com',
        subject: 'Subject',
        html: '<p>hi</p>',
        text: 'hi',
      })

      expect(result.ok).toBe(false)
      expect(result.ok === false && result.error).toMatch(/ENOTFOUND/)
    })

    it('aborts and returns { ok: false } after the 10s timeout', async () => {
      vi.useFakeTimers()

      fetchMock.mockImplementationOnce(
        (_url: string, init: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener('abort', () => {
              const err = new Error('This operation was aborted')
              err.name = 'AbortError'
              reject(err)
            })
          }),
      )

      const mailer = createBrevoMailer(BASE_CONFIG)
      const pending = mailer.sendTransactional({
        to: 'buyer@example.com',
        subject: 'Subject',
        html: '<p>hi</p>',
        text: 'hi',
      })

      await vi.advanceTimersByTimeAsync(10_000)
      const result = await pending

      expect(result.ok).toBe(false)
      expect(result.ok === false && result.error).toMatch(/timed out/i)
    })
  })

  describe('subscribeDoubleOptIn', () => {
    it('POSTs to /v3/contacts/doubleOptinConfirmation with list/template ids and the redirect URL', async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

      const mailer = createBrevoMailer(BASE_CONFIG)
      const result = await mailer.subscribeDoubleOptIn({ email: 'reader@example.com' })

      expect(result).toEqual({ ok: true })

      const [url, init] = fetchMock.mock.calls[0]!
      expect(url).toBe('https://api.brevo.com/v3/contacts/doubleOptinConfirmation')

      const body = JSON.parse(init.body)
      expect(body).toEqual({
        email: 'reader@example.com',
        includeListIds: [7],
        templateId: 3,
        redirectionUrl: 'https://isad.academy/newsletter/confirmed',
      })
    })

    it('strips a trailing slash from the configured site URL before building the redirect', async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

      const mailer = createBrevoMailer({ ...BASE_CONFIG, siteUrl: 'https://isad.academy/' })
      await mailer.subscribeDoubleOptIn({ email: 'reader@example.com' })

      const body = JSON.parse(fetchMock.mock.calls[0]![1].body)
      expect(body.redirectionUrl).toBe('https://isad.academy/newsletter/confirmed')
    })

    it('sends an RO subscriber to the Romanian confirmation page', async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

      const mailer = createBrevoMailer(BASE_CONFIG)
      await mailer.subscribeDoubleOptIn({ email: 'cititor@example.com', locale: 'ro' })

      const body = JSON.parse(fetchMock.mock.calls[0]![1].body)
      expect(body.redirectionUrl).toBe('https://isad.academy/ro/newsletter/confirmed')
    })

    it('uses the RO template for a Romanian subscriber', async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

      const mailer = createBrevoMailer({ ...BASE_CONFIG, doiTemplateIdRo: '9' })
      await mailer.subscribeDoubleOptIn({ email: 'cititor@example.com', locale: 'ro' })

      expect(JSON.parse(fetchMock.mock.calls[0]![1].body).templateId).toBe(9)
    })

    it('falls back to the EN template when no RO template is configured', async () => {
      // A missing translation must never cost a subscriber — they get the EN email.
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

      const mailer = createBrevoMailer(BASE_CONFIG)
      await mailer.subscribeDoubleOptIn({ email: 'cititor@example.com', locale: 'ro' })

      expect(JSON.parse(fetchMock.mock.calls[0]![1].body).templateId).toBe(3)
    })

    it('uses the EN template for English subscribers even when RO is configured', async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

      const mailer = createBrevoMailer({ ...BASE_CONFIG, doiTemplateIdRo: '9' })
      await mailer.subscribeDoubleOptIn({ email: 'reader@example.com', locale: 'en' })

      expect(JSON.parse(fetchMock.mock.calls[0]![1].body).templateId).toBe(3)
    })

    it('keeps EN unprefixed, whether the locale is explicit or omitted', async () => {
      fetchMock
        .mockResolvedValueOnce(new Response(null, { status: 204 }))
        .mockResolvedValueOnce(new Response(null, { status: 204 }))

      const mailer = createBrevoMailer(BASE_CONFIG)
      await mailer.subscribeDoubleOptIn({ email: 'reader@example.com', locale: 'en' })
      await mailer.subscribeDoubleOptIn({ email: 'reader@example.com' })

      for (const call of fetchMock.mock.calls) {
        expect(JSON.parse(call[1].body).redirectionUrl).toBe(
          'https://isad.academy/newsletter/confirmed',
        )
      }
    })

    it('returns { ok: false } without calling fetch when the list/template id is not configured', async () => {
      const mailer = createBrevoMailer({ ...BASE_CONFIG, newsletterListId: '', doiTemplateId: '' })
      const result = await mailer.subscribeDoubleOptIn({ email: 'reader@example.com' })

      expect(result.ok).toBe(false)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('returns { ok: false } on a non-2xx response', async () => {
      fetchMock.mockResolvedValueOnce(new Response('Bad Request', { status: 400 }))

      const mailer = createBrevoMailer(BASE_CONFIG)
      const result = await mailer.subscribeDoubleOptIn({ email: 'reader@example.com' })

      expect(result.ok).toBe(false)
    })
  })

  describe('broadcastNewPost', () => {
    it('creates a campaign then immediately sends it to the newsletter list', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ id: 42 }, { status: 201 }))
        .mockResolvedValueOnce(new Response(null, { status: 204 }))

      const mailer = createBrevoMailer(BASE_CONFIG)
      const result = await mailer.broadcastNewPost({
        title: 'Why ISO 42001 matters',
        excerpt: 'A short excerpt.',
        url: 'https://isad.academy/blog/why-iso-42001-matters',
      })

      expect(result).toEqual({ ok: true })
      expect(fetchMock).toHaveBeenCalledTimes(2)

      const [createUrl, createInit] = fetchMock.mock.calls[0]!
      expect(createUrl).toBe('https://api.brevo.com/v3/emailCampaigns')
      const createBody = JSON.parse(createInit.body)
      expect(createBody.recipients).toEqual({ listIds: [7] })
      expect(createBody.htmlContent).toContain('Why ISO 42001 matters')
      expect(createBody.htmlContent).toContain('https://isad.academy/blog/why-iso-42001-matters')

      const [sendUrl] = fetchMock.mock.calls[1]!
      expect(sendUrl).toBe('https://api.brevo.com/v3/emailCampaigns/42/sendNow')
    })

    it('returns { ok: false } and never calls sendNow when campaign creation fails', async () => {
      fetchMock.mockResolvedValueOnce(new Response('Server error', { status: 500 }))

      const mailer = createBrevoMailer(BASE_CONFIG)
      const result = await mailer.broadcastNewPost({
        title: 'Title',
        excerpt: '',
        url: 'https://isad.academy/blog/title',
      })

      expect(result.ok).toBe(false)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('returns { ok: false } when the campaign is created but sendNow fails', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ id: 99 }, { status: 201 }))
        .mockResolvedValueOnce(new Response('Server error', { status: 500 }))

      const mailer = createBrevoMailer(BASE_CONFIG)
      const result = await mailer.broadcastNewPost({
        title: 'Title',
        excerpt: '',
        url: 'https://isad.academy/blog/title',
      })

      expect(result.ok).toBe(false)
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('returns { ok: false } without calling fetch when the newsletter list id is not configured', async () => {
      const mailer = createBrevoMailer({ ...BASE_CONFIG, newsletterListId: '' })
      const result = await mailer.broadcastNewPost({
        title: 'Title',
        excerpt: '',
        url: 'https://isad.academy/blog/title',
      })

      expect(result.ok).toBe(false)
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  // Wiring check for src/lib/email/senders.ts — the pure resolution logic is covered in
  // senders.test.ts; what matters here is that the resolved address actually reaches Brevo.
  describe('per-category senders', () => {
    const SENDERS = {
      ...BASE_CONFIG,
      newsletterSenderEmail: 'news@isad.academy',
      newsletterSenderName: 'isad.academy news',
      notificationSenderEmail: 'alerts@isad.academy',
      notificationSenderName: 'isad.academy alerts',
    }

    it('ships an internal notification from the notification address', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ messageId: 'x' }, { status: 201 }))

      await createBrevoMailer(SENDERS).sendTransactional({
        to: 'silviu@isad.academy',
        subject: 'New lead',
        html: '<p>lead</p>',
        text: 'lead',
        sender: 'notification',
      })

      const body = JSON.parse(fetchMock.mock.calls[0]![1].body)
      expect(body.sender).toEqual({ email: 'alerts@isad.academy', name: 'isad.academy alerts' })
    })

    it('ships a campaign from the newsletter address, never the transactional one', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ id: 42 }, { status: 201 }))
        .mockResolvedValueOnce(jsonResponse({}, { status: 201 }))

      await createBrevoMailer(SENDERS).broadcastCampaign({
        name: 'August newsletter',
        subject: 'What is new',
        html: '<p>news</p>',
      })

      const body = JSON.parse(fetchMock.mock.calls[0]![1].body)
      expect(body.sender).toEqual({ email: 'news@isad.academy', name: 'isad.academy news' })
      expect(body.sender.email).not.toBe(BASE_CONFIG.senderEmail)
    })

    it('falls back to the default address for an unconfigured category', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ messageId: 'x' }, { status: 201 }))

      // BASE_CONFIG carries no per-category addresses — the real launch state for
      // `notification`. It must still resolve to a valid sender, never an empty one.
      await createBrevoMailer(BASE_CONFIG).sendTransactional({
        to: 'silviu@isad.academy',
        subject: 'New lead',
        html: '<p>lead</p>',
        text: 'lead',
        sender: 'notification',
      })

      const body = JSON.parse(fetchMock.mock.calls[0]![1].body)
      expect(body.sender).toEqual({ email: 'hello@isad.academy', name: 'isad.academy' })
    })
  })
})
