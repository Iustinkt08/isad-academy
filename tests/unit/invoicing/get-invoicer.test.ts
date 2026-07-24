import { afterEach, describe, expect, it } from 'vitest'

import { getInvoicer, NoopInvoicer, SmartBillInvoicer } from '../../../src/lib/invoicing'
import type { Order } from '../../../src/payload-types'

const ORDER = { id: 1, paymentStatus: 'confirmed' } as unknown as Order

afterEach(() => {
  delete process.env.INVOICE_PROVIDER
  delete process.env.SMARTBILL_USERNAME
  delete process.env.SMARTBILL_TOKEN
  delete process.env.SMARTBILL_CIF
  delete process.env.SMARTBILL_SERIES
})

describe('getInvoicer', () => {
  it('defaults to the noop invoicer when INVOICE_PROVIDER is unset', () => {
    expect(getInvoicer()).toBe(NoopInvoicer)
  })

  it('selects SmartBill when INVOICE_PROVIDER=smartbill (read fresh per call)', () => {
    process.env.INVOICE_PROVIDER = 'smartbill'
    expect(getInvoicer()).toBe(SmartBillInvoicer)
  })

  it('throws at call time for an unknown provider', () => {
    process.env.INVOICE_PROVIDER = 'oblio'
    expect(() => getInvoicer()).toThrow(/Unknown INVOICE_PROVIDER/)
  })
})

describe('providers never throw', () => {
  it('noop skips', async () => {
    await expect(NoopInvoicer.issueInvoice(ORDER)).resolves.toEqual({
      status: 'skipped',
      provider: 'none',
    })
  })

  it('smartbill stub fails soft when unconfigured', async () => {
    const result = await SmartBillInvoicer.issueInvoice(ORDER)
    expect(result.status).toBe('failed')
    if (result.status === 'failed') expect(result.error).toMatch(/not configured/)
  })

  it('smartbill stub fails soft when configured but unimplemented', async () => {
    process.env.SMARTBILL_USERNAME = 'u'
    process.env.SMARTBILL_TOKEN = 't'
    process.env.SMARTBILL_CIF = 'RO1'
    process.env.SMARTBILL_SERIES = 'ISAD'
    const result = await SmartBillInvoicer.issueInvoice(ORDER)
    expect(result.status).toBe('failed')
    if (result.status === 'failed') expect(result.error).toMatch(/not implemented/)
  })
})
