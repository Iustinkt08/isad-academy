import { NoopInvoicer } from './noop'
import { SmartBillInvoicer } from './smartbill'
import type { Invoicer } from './types'

export { NoopInvoicer } from './noop'
export { SmartBillInvoicer } from './smartbill'
export type { Invoicer, IssueInvoiceResult } from './types'

const INVOICERS: Record<string, Invoicer> = {
  none: NoopInvoicer,
  smartbill: SmartBillInvoicer,
}

/**
 * Selects the active `Invoicer` via the `INVOICE_PROVIDER` env var, defaulting to `'none'`
 * — read fresh from `process.env` on every call and throwing only at CALL time for unknown
 * values, exactly like `getPaymentProvider` (src/lib/payments/index.ts).
 */
export const getInvoicer = (): Invoicer => {
  const name = process.env.INVOICE_PROVIDER?.trim() || 'none'
  const invoicer = INVOICERS[name]
  if (!invoicer) {
    throw new Error(
      `Unknown INVOICE_PROVIDER "${name}" — expected one of: ${Object.keys(INVOICERS).join(', ')}.`,
    )
  }
  return invoicer
}
