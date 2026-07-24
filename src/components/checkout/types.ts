import type { StackingPolicy } from '@/lib/pricing'

/** One price window, serialized for the client (subset of `courseSessions.earlyBird/standard`). */
export type WindowView = {
  price?: number | null
  startDate?: string | null
  endDate?: string | null
} | null

/**
 * Public, display-safe slice of a course session the server page hands to the client
 * checkout form. Everything here is already shown on the public course detail page —
 * no buyer PII, no internal fields.
 */
export type CheckoutSessionView = {
  id: number
  courseTitle: string
  courseSlug: string | null
  startDate: string
  scheduleSummary: string | null
  /** "PECB ISO/IEC 42001" for ISO-track courses, "ISAD Academy" otherwise (catalog rule). */
  trackLabel: string
  /** CPD credits (1 hour = 1 credit — §9 R2/C3); null hides the chip. */
  cpdCredits: number | null
  /** `capacity − seatsSold` (virtual field) — "X seats left" shows only below the threshold. */
  seatsRemaining: number | null
  /** Price windows (resolved to the visitor's currency) — for the applied-window pill label
   * and the client-side fallback pricing when the quote endpoint is unreachable. The
   * authoritative breakdown always comes from the server. */
  earlyBird: WindowView
  standard: WindowView
}

/** Config-driven display settings (CLAUDE.md §13 — never hardcoded). */
export type CheckoutSettingsView = {
  currency: string
  vatDisplay: 'incl' | 'excl'
  stackingPolicy: StackingPolicy
  /** `siteSettings.seatsThreshold` — "X seats left" visibility cutoff (§4). */
  seatsThreshold: number
}
