import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildNetopiaOrderId,
  getNetopiaConfig,
  mapNetopiaStatus,
  NetopiaProvider,
  netopiaBaseUrl,
  parseNetopiaOrderId,
  NETOPIA_STATUS,
} from '../../../src/lib/payments/netopia'

/** A successful `payment/card/start` answer for the hosted-page flow (error 101 =
 * "redirect user to payment page"). */
const startOkResponse = {
  code: '200',
  error: { code: '101', message: 'Redirect user to payment page' },
  payment: {
    ntpID: 'ntp-12345',
    status: 15,
    paymentURL: 'https://secure-sandbox.netopia-payments.com/ui/card?p=abc',
  },
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('NetopiaProvider.createPayment (API v2 hosted page)', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('NETOPIA_API_KEY', 'test-api-key')
    vi.stubEnv('NETOPIA_POS_SIGNATURE', 'AAAA-BBBB-CCCC-DDDD-EEEE')
    vi.stubEnv('NETOPIA_SANDBOX', 'true')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://isad.academy')
  })

  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('starts a sandbox payment and returns requiresAction with the hosted paymentURL', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(startOkResponse))

    const result = await NetopiaProvider.createPayment({
      orderId: 42,
      amount: 1490,
      currency: 'RON',
      buyerEmail: 'ana@example.com',
      buyerName: 'Ana Maria Popescu',
      buyerPhone: '+40 700 000 000',
      description: 'ISO/IEC 42001 Foundation',
      language: 'ro',
    })

    expect(result).toEqual({
      providerRef: 'ntp-12345',
      status: 'requiresAction',
      redirectUrl: 'https://secure-sandbox.netopia-payments.com/ui/card?p=abc',
    })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://secure-sandbox.netopia-payments.com/payment/card/start')
    expect((init.headers as Record<string, string>).Authorization).toBe('test-api-key')

    type StartPaymentBody = {
      config: { language: string; notifyUrl: string; redirectUrl: string }
      payment: { instrument: unknown }
      order: {
        posSignature: string
        amount: number
        currency: string
        orderID: string
        billing: { firstName: string; lastName: string; email: string }
      }
    }
    const body = JSON.parse(String(init.body)) as StartPaymentBody
    expect(body.order.posSignature).toBe('AAAA-BBBB-CCCC-DDDD-EEEE')
    expect(body.order.amount).toBe(1490)
    expect(body.order.currency).toBe('RON')
    expect(body.order.orderID).toMatch(/^isad-42-/)
    // Hosted flow: no card data — Netopia serves its own payment form.
    expect(body.payment.instrument).toBeNull()
    expect(body.config.language).toBe('ro')
    expect(body.config.notifyUrl).toBe('https://isad.academy/api/netopia/ipn')
    expect(body.config.redirectUrl).toContain('https://isad.academy/api/netopia/return?order=42&ref=isad-42-')
    expect(body.config.redirectUrl).toContain('locale=ro')
    // Name split for Netopia's billing block.
    expect(body.order.billing.firstName).toBe('Ana')
    expect(body.order.billing.lastName).toBe('Maria Popescu')
    expect(body.order.billing.email).toBe('ana@example.com')
  })

  it('hits the live base URL only when NETOPIA_SANDBOX is exactly "false"', async () => {
    vi.stubEnv('NETOPIA_SANDBOX', 'false')
    fetchMock.mockResolvedValueOnce(jsonResponse(startOkResponse))

    await NetopiaProvider.createPayment({
      orderId: 1,
      amount: 10,
      currency: 'RON',
      buyerEmail: 'a@b.co',
    })

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      'https://secure.netopia-payments.com/api/payment/card/start',
    )
  })

  it('defaults to sandbox when NETOPIA_SANDBOX is unset or junk', () => {
    vi.stubEnv('NETOPIA_SANDBOX', '')
    expect(getNetopiaConfig().sandbox).toBe(true)
    vi.stubEnv('NETOPIA_SANDBOX', 'no')
    expect(getNetopiaConfig().sandbox).toBe(true)
    expect(netopiaBaseUrl(true)).toBe('https://secure-sandbox.netopia-payments.com')
  })

  it('throws loudly when the API credentials are missing', async () => {
    vi.stubEnv('NETOPIA_API_KEY', '')

    await expect(
      NetopiaProvider.createPayment({ orderId: 1, amount: 10, currency: 'RON', buyerEmail: 'a@b.co' }),
    ).rejects.toThrow(/NETOPIA_API_KEY/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws when the start call is rejected (no paymentURL, no paid status)', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ code: '400', error: { code: '56', message: 'duplicated orderID' } }),
    )

    await expect(
      NetopiaProvider.createPayment({ orderId: 7, amount: 10, currency: 'RON', buyerEmail: 'a@b.co' }),
    ).rejects.toThrow(/duplicated orderID/)
  })

  it('throws on a non-2xx HTTP answer (bad API key)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'unauthorized' }, 401))

    await expect(
      NetopiaProvider.createPayment({ orderId: 7, amount: 10, currency: 'RON', buyerEmail: 'a@b.co' }),
    ).rejects.toThrow(/HTTP 401/)
  })
})

describe('netopia order-id round trip', () => {
  it('embeds and re-extracts our order id', () => {
    const netopiaOrderId = buildNetopiaOrderId(3187)
    expect(netopiaOrderId).toMatch(/^isad-3187-/)
    expect(parseNetopiaOrderId(netopiaOrderId)).toBe(3187)
  })

  it('returns null for foreign/malformed ids', () => {
    expect(parseNetopiaOrderId(undefined)).toBeNull()
    expect(parseNetopiaOrderId('')).toBeNull()
    expect(parseNetopiaOrderId('order-99')).toBeNull()
    expect(parseNetopiaOrderId('isad-abc-x')).toBeNull()
  })
})

describe('mapNetopiaStatus — order lifecycle mapping', () => {
  it('confirms only on PAID/CONFIRMED', () => {
    expect(mapNetopiaStatus(NETOPIA_STATUS.PAID)).toBe('confirmed')
    expect(mapNetopiaStatus(NETOPIA_STATUS.CONFIRMED)).toBe('confirmed')
  })

  it('maps refunds and terminal failures', () => {
    expect(mapNetopiaStatus(NETOPIA_STATUS.CREDIT)).toBe('refunded')
    for (const status of [
      NETOPIA_STATUS.CANCELED,
      NETOPIA_STATUS.ERROR,
      NETOPIA_STATUS.DECLINED,
      NETOPIA_STATUS.FRAUD,
      NETOPIA_STATUS.REVERSED,
      NETOPIA_STATUS.EXPIRED,
    ]) {
      expect(mapNetopiaStatus(status)).toBe('failed')
    }
  })

  it('treats in-progress statuses as no-action — NEW must never hand out seats', () => {
    for (const status of [
      NETOPIA_STATUS.NEW,
      NETOPIA_STATUS.OPENED,
      NETOPIA_STATUS.PENDING,
      NETOPIA_STATUS.PENDING_AUTH,
      NETOPIA_STATUS.THREE_D_AUTH,
      NETOPIA_STATUS.PENDING_ANY,
    ]) {
      expect(mapNetopiaStatus(status)).toBeNull()
    }
  })
})
