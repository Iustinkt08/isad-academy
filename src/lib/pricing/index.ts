/**
 * Public surface of the pricing engine (CLAUDE.md §8). Pure TypeScript, no Payload
 * dependency — see `types.ts` for the adapter contract T6 must satisfy.
 */
export {
  computeOrderPricing,
  DEFAULT_MEMBER_DISCOUNT_PERCENT,
  GROUP_DISCOUNT_PERCENT,
  GROUP_MIN_QUANTITY,
} from './computeOrderPricing'
export { clampPercent, roundCurrency } from './rounding'
export { bestOf, groupMemberStackCodeExclusive, stackAll, strategies } from './strategies'
export type { DiscountLine, PricingStrategy, StrategyInput, StrategyOutput } from './strategies'
export type {
  AppliedWindow,
  ComputeOrderPricingInput,
  ComputeOrderPricingResult,
  DiscountCodeType,
  InvalidCodeDetail,
  PricingCodeInput,
  PricingSnapshot,
  PricingWindow,
  PricingWindows,
  StackingPolicy,
} from './types'
export { isWindowActive, selectActiveWindow } from './windows'
export type { SelectedWindow } from './windows'
