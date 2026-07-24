import type { CollectionAfterChangeHook } from 'payload'

import type { Order } from '../../../payload-types'
import { getInvoicer } from '../index'

const CONFIRMED = 'confirmed'

/**
 * `orders` `afterChange` hook — issues the invoice when an order ENTERS `confirmed`
 * (B8, discovery doc: automatic invoicing via SmartBill). Same transition-detection shape
 * as `sendOrderConfirmationEmail` and, like it, failure-tolerant by construction: the
 * `Invoicer` contract never throws, and the whole body is wrapped anyway — an invoicing
 * outage can never roll back a confirmed order or its seat accounting.
 *
 * With the default `INVOICE_PROVIDER=none` this logs a skip and does nothing.
 */
export const issueInvoiceOnConfirm: CollectionAfterChangeHook<Order> = async ({
  doc,
  previousDoc,
  req,
}) => {
  const enteringConfirmed =
    doc?.paymentStatus === CONFIRMED && previousDoc?.paymentStatus !== CONFIRMED
  if (!enteringConfirmed) return doc

  try {
    const result = await getInvoicer().issueInvoice(doc)
    if (result.status === 'issued') {
      req.payload.logger.info(
        `[invoicing] order ${doc.id}: invoice ${result.ref} issued via ${result.provider}.`,
      )
    } else if (result.status === 'failed') {
      req.payload.logger.warn(
        `[invoicing] order ${doc.id}: ${result.provider} failed — ${result.error}`,
      )
    }
  } catch (err) {
    req.payload.logger.warn(`[invoicing] order ${doc?.id}: unexpected error — ${String(err)}`)
  }
  return doc
}
