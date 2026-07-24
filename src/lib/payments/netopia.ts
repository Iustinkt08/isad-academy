import { NotImplementedError } from './types'
import type { CreatePaymentResult, PaymentProvider } from './types'

/**
 * Inert stub — Netopia is not signed (CLAUDE.md §13). Netopia is a hosted-page (redirect)
 * processor: the real implementation will return `status: 'requiresAction'` with a
 * `redirectUrl`, never resolve `'confirmed'` synchronously — a follow-up return/webhook
 * endpoint (out of T6 scope) would confirm the order later, the same way the mock
 * `'confirmed'` path does today. `createPayment` throws until then.
 */
export const NetopiaProvider: PaymentProvider = {
  name: 'netopia',
  async createPayment(): Promise<CreatePaymentResult> {
    throw new NotImplementedError('netopia')
  },
}
