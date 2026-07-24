import { NotImplementedError } from './types'
import type { CreatePaymentResult, PaymentProvider } from './types'

/**
 * Inert stub — EuPlătesc is not signed (CLAUDE.md §13). Like Netopia, EuPlătesc is a
 * hosted-page (redirect) processor; the real implementation would return
 * `status: 'requiresAction'` with a `redirectUrl` rather than resolving synchronously.
 * `createPayment` throws until it is actually wired up.
 */
export const EuPlatescProvider: PaymentProvider = {
  name: 'euplatesc',
  async createPayment(): Promise<CreatePaymentResult> {
    throw new NotImplementedError('euplatesc')
  },
}
