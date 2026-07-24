import type { Invoicer } from './types'

/** Default provider while invoicing is not yet enabled — records nothing, skips loudly. */
export const NoopInvoicer: Invoicer = {
  name: 'none',
  issueInvoice: async () => ({ status: 'skipped', provider: 'none' }),
}
