import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createNoopMailer } from '../../../src/lib/email/noop'

describe('NoopMailer (unit)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves sendTransactional as ok and logs loudly', async () => {
    const mailer = createNoopMailer()
    const result = await mailer.sendTransactional({
      to: 'buyer@example.com',
      subject: 'Subject',
      html: '<p>hi</p>',
      text: 'hi',
    })

    expect(result).toEqual({ ok: true })
    expect(console.warn).toHaveBeenCalledTimes(1)
    expect((console.warn as ReturnType<typeof vi.fn>).mock.calls[0]![0]).toMatch(/buyer@example.com/)
  })

  it('resolves subscribeDoubleOptIn as ok and logs loudly', async () => {
    const mailer = createNoopMailer()
    const result = await mailer.subscribeDoubleOptIn({ email: 'reader@example.com' })

    expect(result).toEqual({ ok: true })
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('reader@example.com'))
  })

  it('resolves broadcastNewPost as ok and logs loudly', async () => {
    const mailer = createNoopMailer()
    const result = await mailer.broadcastNewPost({
      title: 'Title',
      excerpt: 'Excerpt',
      url: 'https://isad.academy/blog/title',
    })

    expect(result).toEqual({ ok: true })
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Title'))
  })

  it('never throws even though it does no real work', async () => {
    const mailer = createNoopMailer()
    await expect(
      mailer.sendTransactional({ to: '', subject: '', html: '', text: '' }),
    ).resolves.toEqual({ ok: true })
  })
})
