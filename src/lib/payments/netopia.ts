import type { CreatePaymentInput, CreatePaymentResult, PaymentProvider } from './types'

/**
 * Netopia Payments — API v2 hosted-page integration (https://doc.netopia-payments.com).
 *
 * Flow: `createPayment` calls `POST {base}/payment/card/start` WITHOUT card data
 * (`instrument: null`), so Netopia responds with `payment.paymentURL` — its own hosted
 * payment form — and we return `status: 'requiresAction'` + that URL. The checkout UI
 * sends the buyer there; the order stays `pending` and NO seats are consumed until
 * Netopia confirms the payment asynchronously via:
 *   - the IPN webhook (`/api/netopia/ipn`, signed JWT — see `netopiaIpn.ts`), and/or
 *   - the return redirect (`/api/netopia/return`), which polls `/operation/status` as a
 *     fallback so local sandbox testing works without a publicly reachable notify URL.
 *
 * Sandbox vs live is env-driven and DEFAULTS TO SANDBOX (`NETOPIA_SANDBOX` unset or
 * anything but 'false') — going live must be an explicit act, never an accident. The
 * sandbox charges nothing: it only accepts Netopia's test cards (e.g. 9900004810225098,
 * any future expiry, CVV 111 — see the sandbox dashboard for the current list).
 */

export type NetopiaConfig = {
  apiKey: string
  posSignature: string
  sandbox: boolean
  siteUrl: string
}

/** Payment status codes shared by the start/status/IPN payloads (official SDK constants). */
export const NETOPIA_STATUS = {
  NEW: 1,
  OPENED: 2,
  PAID: 3,
  CANCELED: 4,
  CONFIRMED: 5,
  PENDING: 6,
  SCHEDULED: 7,
  CREDIT: 8,
  CHARGEBACK_INIT: 9,
  CHARGEBACK_ACCEPT: 10,
  ERROR: 11,
  DECLINED: 12,
  FRAUD: 13,
  PENDING_AUTH: 14,
  THREE_D_AUTH: 15,
  CHARGEBACK_REPRESENT: 16,
  REVERSED: 17,
  PENDING_ANY: 18,
  EXPIRED: 23,
} as const

/**
 * Collapses a Netopia payment status code onto the order lifecycle (`orders.paymentStatus`).
 * `null` = in-progress/informational — leave the order alone and wait for a final status.
 * Deliberately conservative: only PAID/CONFIRMED hand out seats; NEW/OPENED/PENDING* never
 * do, whatever an IPN says, because money has not moved yet.
 */
export const mapNetopiaStatus = (status: number): 'confirmed' | 'failed' | 'refunded' | null => {
  switch (status) {
    case NETOPIA_STATUS.PAID:
    case NETOPIA_STATUS.CONFIRMED:
      return 'confirmed'
    case NETOPIA_STATUS.CREDIT:
      return 'refunded'
    case NETOPIA_STATUS.CANCELED:
    case NETOPIA_STATUS.ERROR:
    case NETOPIA_STATUS.DECLINED:
    case NETOPIA_STATUS.FRAUD:
    case NETOPIA_STATUS.REVERSED:
    case NETOPIA_STATUS.EXPIRED:
      return 'failed'
    default:
      return null
  }
}

export const getNetopiaConfig = (): NetopiaConfig => {
  const apiKey = process.env.NETOPIA_API_KEY?.trim()
  const posSignature = process.env.NETOPIA_POS_SIGNATURE?.trim()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '')

  if (!apiKey || !posSignature) {
    throw new Error(
      'PAYMENT_PROVIDER=netopia needs NETOPIA_API_KEY and NETOPIA_POS_SIGNATURE set ' +
        '(from the Netopia admin — sandbox keys at sandbox.netopia-payments.com).',
    )
  }
  if (!siteUrl) {
    throw new Error('PAYMENT_PROVIDER=netopia needs NEXT_PUBLIC_SITE_URL for the notify/return URLs.')
  }

  return {
    apiKey,
    posSignature,
    // Live is opt-in: exactly 'false' switches over; every other value stays in sandbox.
    sandbox: process.env.NETOPIA_SANDBOX?.trim().toLowerCase() !== 'false',
    siteUrl,
  }
}

export const netopiaBaseUrl = (sandbox: boolean): string =>
  sandbox ? 'https://secure-sandbox.netopia-payments.com' : 'https://secure.netopia-payments.com/api'

/** Minimal slice of Netopia's start/status response we act on. */
type NetopiaApiResponse = {
  code?: string | number
  message?: string
  error?: { code?: string | number; message?: string }
  payment?: {
    ntpID?: string
    status?: number
    paymentURL?: string
    amount?: number
    currency?: string
  }
}

const postJson = async (url: string, apiKey: string, body: unknown): Promise<NetopiaApiResponse> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: apiKey },
    body: JSON.stringify(body),
  })

  const data = (await response.json().catch(() => null)) as NetopiaApiResponse | null
  if (!response.ok || !data) {
    throw new Error(
      `Netopia request to ${url} failed with HTTP ${response.status}` +
        (data?.error?.message ? `: ${data.error.message}` : ''),
    )
  }
  return data
}

/** "Ana Maria Popescu" → { firstName: 'Ana', lastName: 'Maria Popescu' } — Netopia's
 * billing block wants the split; we only collect a single full-name field. */
const splitName = (fullName: string | undefined): { firstName: string; lastName: string } => {
  const [first, ...rest] = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (!first) return { firstName: 'Customer', lastName: 'Customer' }
  if (rest.length === 0) return { firstName: first, lastName: first }
  return { firstName: first, lastName: rest.join(' ') }
}

/**
 * Polls `POST {base}/operation/status` for a payment started earlier. Used by the return
 * endpoint as an IPN fallback (essential for local sandbox testing, where Netopia cannot
 * reach a localhost notify URL). Returns the raw numeric status, or null if unavailable.
 */
export const getNetopiaPaymentStatus = async (
  ntpID: string,
  netopiaOrderId: string,
): Promise<number | null> => {
  const config = getNetopiaConfig()
  const data = await postJson(`${netopiaBaseUrl(config.sandbox)}/operation/status`, config.apiKey, {
    posID: config.posSignature,
    ntpID,
    orderID: netopiaOrderId,
  })
  const status = data.payment?.status
  // Cross-check the transaction identity so a tampered `ref` query param can never
  // attach some other payment's status to this order.
  if (typeof status !== 'number' || (data.payment?.ntpID && data.payment.ntpID !== ntpID)) {
    return null
  }
  return status
}

/** Builds the Netopia-side order id. Embeds OUR order id (parsed back out by the IPN
 * route) plus a time suffix so sandbox DB resets can never collide on a reused id. */
export const buildNetopiaOrderId = (orderId: number | string): string =>
  `isad-${orderId}-${Date.now().toString(36)}`

/** Inverse of `buildNetopiaOrderId` — extracts our numeric order id, or null. */
export const parseNetopiaOrderId = (netopiaOrderId: string | undefined): number | null => {
  const match = /^isad-(\d+)-/.exec(netopiaOrderId ?? '')
  return match ? Number(match[1]) : null
}

export const NetopiaProvider: PaymentProvider = {
  name: 'netopia',
  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const config = getNetopiaConfig()
    const language = input.language === 'ro' ? 'ro' : 'en'
    const netopiaOrderId = buildNetopiaOrderId(input.orderId)
    const description = input.description?.trim() || `isad.academy order ${input.orderId}`
    const { firstName, lastName } = splitName(input.buyerName)

    // Digital service, no shipping — but Netopia's schema requires a billing block with a
    // non-empty city + numeric country. We do not collect a postal address at checkout
    // (CLAUDE.md §6), so those two are constants (642 = Romania, ISO 3166-1 numeric).
    const billing = {
      email: input.buyerEmail,
      phone: input.buyerPhone ?? '',
      firstName,
      lastName,
      city: 'N/A',
      country: 642,
      countryName: 'Romania',
      state: '',
      postalCode: '',
      details: '',
    }

    const body = {
      config: {
        emailTemplate: '',
        emailSubject: '',
        notifyUrl: `${config.siteUrl}/api/netopia/ipn`,
        // `order`/`ref` let the return endpoint find the order and poll its status without
        // any public read access on `orders`; both are cross-checked server-side.
        redirectUrl: `${config.siteUrl}/api/netopia/return?order=${input.orderId}&ref=${encodeURIComponent(netopiaOrderId)}&locale=${language}`,
        language,
      },
      payment: {
        options: { installments: 0, bonus: 0 },
        // No card data — Netopia serves its own hosted payment form (paymentURL below).
        instrument: null,
        data: {},
      },
      order: {
        ntpID: '',
        posSignature: config.posSignature,
        dateTime: new Date().toISOString(),
        description,
        orderID: netopiaOrderId,
        amount: input.amount,
        currency: input.currency,
        billing,
        shipping: billing,
        products: [
          {
            name: description,
            code: netopiaOrderId,
            category: 'course',
            price: input.amount,
            vat: 0,
          },
        ],
        installments: { selected: 0, available: [] },
        data: {},
      },
    }

    const data = await postJson(`${netopiaBaseUrl(config.sandbox)}/payment/card/start`, config.apiKey, body)

    const ntpID = data.payment?.ntpID ?? ''
    const paymentURL = data.payment?.paymentURL

    if (paymentURL) {
      // Error code 101 = "redirect user to the payment page" — the expected happy path.
      return { providerRef: ntpID || netopiaOrderId, status: 'requiresAction', redirectUrl: paymentURL }
    }

    const status = data.payment?.status
    if (status === NETOPIA_STATUS.PAID || status === NETOPIA_STATUS.CONFIRMED) {
      return { providerRef: ntpID || netopiaOrderId, status: 'confirmed' }
    }

    // No payment URL and not paid → the start call itself was rejected (bad key/signature,
    // schema error…). Fail loudly instead of guessing: config problems must surface.
    throw new Error(
      `Netopia payment/card/start returned neither a paymentURL nor a paid status` +
        (data.error?.message ? ` — ${String(data.error.code ?? '')} ${data.error.message}` : '') +
        ` (order ${input.orderId}).`,
    )
  },
}
