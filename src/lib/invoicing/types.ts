import type { Order } from '../../payload-types'

/**
 * Outcome of an invoice issuance attempt. `skipped` = invoicing disabled (none provider),
 * `failed` = provider error or not configured — NEVER an exception (mirrors `Mailer`'s
 * "never throw" contract so the orders hook can stay failure-tolerant).
 */
export type IssueInvoiceResult =
  | { status: 'issued'; provider: string; ref: string }
  | { status: 'skipped'; provider: string }
  | { status: 'failed'; provider: string; error: string }

/**
 * Invoicing provider interface (SmartBill track — CLAUDE.md §14, confirmed B8 in the
 * discovery answers doc: automatic invoice after payment, SmartBill). Swappable like
 * `PaymentProvider`/`Mailer` (§3.6) — business logic never imports a concrete provider.
 */
export type Invoicer = {
  name: string
  /** Issue an invoice for a CONFIRMED order. Must never throw. */
  issueInvoice(order: Order): Promise<IssueInvoiceResult>
}
