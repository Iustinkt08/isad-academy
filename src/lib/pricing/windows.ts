import type { AppliedWindow, PricingWindow, PricingWindows } from './types'

const toValidDate = (value: string | Date | null | undefined): Date | null => {
  if (value == null) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * A window is "active" only when `price`, `startDate` AND `endDate` are ALL present and
 * the dates parse (CLAUDE.md §8 step 1). A window with dates but no price can never yield
 * a base price, so it is treated as not configured — mirroring the admin guidance already
 * in `CourseSessions.ts` ("leave both dates empty if this edition has none"), extended to
 * cover the price field too. Bounds are INCLUSIVE on both ends.
 */
export const isWindowActive = (window: PricingWindow | null | undefined, now: Date): boolean => {
  if (!window) return false
  const { price, startDate, endDate } = window
  if (price == null || !Number.isFinite(price) || price < 0) return false

  const start = toValidDate(startDate)
  const end = toValidDate(endDate)
  if (!start || !end) return false

  return now >= start && now <= end
}

export type SelectedWindow = { appliedWindow: AppliedWindow; price: number }

/**
 * Early Bird takes priority over Standard when both happen to be configured AND active
 * simultaneously (§8 step 1 checks `earlyBird` first). Returns `null` when neither window
 * is active — the caller must treat the session as not purchasable ("Enrolment coming
 * soon").
 */
export const selectActiveWindow = (windows: PricingWindows, now: Date): SelectedWindow | null => {
  if (isWindowActive(windows.earlyBird, now)) {
    return { appliedWindow: 'earlyBird', price: windows.earlyBird!.price as number }
  }
  if (isWindowActive(windows.standard, now)) {
    return { appliedWindow: 'standard', price: windows.standard!.price as number }
  }
  return null
}
