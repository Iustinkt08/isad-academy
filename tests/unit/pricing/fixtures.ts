/**
 * Shared test fixtures for the pricing engine suite (tests/unit/pricing/**).
 * NOT a test file itself (no `.test.ts` suffix — vitest's include glob is
 * `tests/unit/**\/*.test.ts`, so this module is never collected as a suite on its own).
 */
import { expect } from 'vitest'

import type { ComputeOrderPricingResult, PricingCodeInput, PricingWindows } from '../../../src/lib/pricing'

/** A window that is active on `ACTIVE_NOW` (2026-01-15) at price 100/seat. */
export const EARLY_BIRD_ACTIVE: PricingWindows['earlyBird'] = {
  price: 100,
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: '2026-01-31T23:59:59.999Z',
}

/** A window that is active on `ACTIVE_NOW` at a different price — used to prove Early Bird
 * takes priority over Standard when both happen to be active simultaneously. */
export const STANDARD_ACTIVE: PricingWindows['standard'] = {
  price: 150,
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: '2026-02-28T23:59:59.999Z',
}

export const ACTIVE_NOW = new Date('2026-01-15T12:00:00.000Z')

export const WINDOWS_EARLY_BIRD_ONLY: PricingWindows = { earlyBird: EARLY_BIRD_ACTIVE }

export const validGeneralCode = (overrides: Partial<PricingCodeInput> = {}): PricingCodeInput => ({
  id: 'code-general-20',
  code: 'GEN20',
  percentage: 20,
  expiresAt: null,
  usageLimit: null,
  usageCount: 0,
  type: 'general',
  isActive: true,
  ...overrides,
})

export const validMemberCode = (overrides: Partial<PricingCodeInput> = {}): PricingCodeInput => ({
  id: 'code-member-20',
  code: 'MEM20',
  percentage: 20,
  expiresAt: null,
  usageLimit: null,
  usageCount: 0,
  type: 'member',
  isActive: true,
  ...overrides,
})

/** Asserts the engine's core algebraic invariant holds EXACTLY (not "within rounding"):
 * `roundedSubtotal - Σ(discounts) === total`, and the never-negative / never-exceeds-subtotal
 * property. Reused across every matrix test so the invariant is checked on every single row,
 * not just in a dedicated property test. */
export const expectConsistentSnapshot = (
  result: ComputeOrderPricingResult,
  basePricePerSeat: number,
  quantity: number,
): void => {
  expect(result.ok).toBe(true)
  if (!result.ok) return

  const { basePrice, groupDiscount, memberDiscount, codeDiscount, total } = result.pricing
  const roundedSubtotal = Math.round((basePricePerSeat * quantity + Number.EPSILON) * 100) / 100

  expect(basePrice).toBeCloseTo(basePricePerSeat, 2)
  expect(roundedSubtotal - (groupDiscount + memberDiscount + codeDiscount)).toBeCloseTo(total, 2)
  expect(total).toBeGreaterThanOrEqual(0)
  expect(total).toBeLessThanOrEqual(roundedSubtotal)
}
