import type { CreatePaymentInput, CreatePaymentResult, PaymentProvider } from './types'

/**
 * Deterministic escape hatch for tests (T6 int suite) and the future checkout UI (T10): a
 * buyer email of EXACTLY this value simulates a declined payment. Every other input
 * "succeeds" immediately. Documented here rather than hidden, since T10 needs it to build a
 * reliable "what does a failed payment look like" demo/test path without a real processor.
 */
export const FAILING_TEST_EMAIL = 'fail@test.local'

/**
 * Default `PaymentProvider` (CLAUDE.md §2 `PAYMENT_PROVIDER=mock`). Resolves synchronously —
 * no `redirectUrl`, no `requiresAction` — since there is no real hosted payment page to send
 * the buyer to in dev/test.
 */
export const MockProvider: PaymentProvider = {
  name: 'mock',
  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (input.buyerEmail === FAILING_TEST_EMAIL) {
      return {
        providerRef: `mock_failed_${input.orderId}_${Date.now()}`,
        status: 'failed',
      }
    }

    return {
      providerRef: `mock_${input.orderId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: 'confirmed',
    }
  },
}
