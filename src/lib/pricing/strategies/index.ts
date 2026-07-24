import type { StackingPolicy } from '../types'

import { bestOf } from './bestOf'
import { groupMemberStackCodeExclusive } from './groupMemberStackCodeExclusive'
import { stackAll } from './stackAll'
import type { PricingStrategy } from './types'

export { bestOf, groupMemberStackCodeExclusive, stackAll }
export type { DiscountLine, PricingStrategy, StrategyInput, StrategyOutput } from './types'

/** All three `stackingPolicy` values implemented, per CLAUDE.md §8 ("implementează ca
 * strategy pattern, toate trei variantele") — regardless of which is the current
 * `siteSettings.stackingPolicy` default. */
export const strategies: Record<StackingPolicy, PricingStrategy> = {
  stackAll,
  bestOf,
  groupMemberStack_codeExclusive: groupMemberStackCodeExclusive,
}
