import type { Invoicer } from './types'

/**
 * SmartBill stub — ground prepared for the confirmed B8 decision (discovery doc):
 * automatic invoice emission after payment, via SmartBill Cloud.
 *
 * Implementation notes for the real integration (SmartBill Cloud REST API):
 *   - endpoint: POST https://ws.smartbill.ro/SBORO/api/invoice
 *   - auth:     Basic base64(SMARTBILL_USERNAME:SMARTBILL_TOKEN)
 *   - payload:  companyVatCode = SMARTBILL_CIF, seriesName = SMARTBILL_SERIES,
 *               client from order.buyer (B2B: companyName + cui), products from the
 *               order.pricing snapshot; ISAD is NOT a VAT payer (B2 — isTaxIncluded n/a).
 *   - delivery: SmartBill can email the invoice itself, or we fetch the PDF and send it
 *               through `Mailer` (Brevo) as an attachment (CLAUDE.md §10).
 */
export const SmartBillInvoicer: Invoicer = {
  name: 'smartbill',
  issueInvoice: async () => {
    const configured =
      !!process.env.SMARTBILL_USERNAME &&
      !!process.env.SMARTBILL_TOKEN &&
      !!process.env.SMARTBILL_CIF &&
      !!process.env.SMARTBILL_SERIES
    return {
      status: 'failed',
      provider: 'smartbill',
      error: configured
        ? 'SmartBill integration not implemented yet (scaffold only — SMARTBILL track).'
        : 'SmartBill is not configured (SMARTBILL_USERNAME / SMARTBILL_TOKEN / SMARTBILL_CIF / SMARTBILL_SERIES).',
    }
  },
}
