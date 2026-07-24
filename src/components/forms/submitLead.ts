import type { LeadFailureBody, LeadSuccessBody } from '@/lib/leads'

export type LeadSubmitResult = { ok: true } | { ok: false; error: string }

const GENERIC_ERROR = 'Something went wrong. Please try again later.'

/**
 * Client half of the `POST /api/leads/submit` contract ({ type, ...fields } in,
 * { ok, error? } out) — shared by ContactForm and CorporateForm. The response is typed
 * with the server's own body types (type-only import, T16 — no ad-hoc mirror).
 * `genericError` lets callers pass a locale-aware fallback message (site is bilingual
 * RO/EN); server-provided error strings pass through untouched.
 */
export async function submitLead(
  body: Record<string, unknown>,
  genericError: string = GENERIC_ERROR,
): Promise<LeadSubmitResult> {
  try {
    const response = await fetch('/api/leads/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = (await response.json().catch(() => null)) as
      | LeadSuccessBody
      | LeadFailureBody
      | null

    if (response.ok && data?.ok) return { ok: true }
    return { ok: false, error: data && !data.ok ? data.error : genericError }
  } catch {
    return { ok: false, error: genericError }
  }
}

/** Same permissive shape the server enforces strictly — enough to catch typos client-side. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Focus the first field (by DOM id) that has a validation error — a11y for keyboard/SR users. */
export function focusFirstInvalid(errors: Record<string, string | undefined>, order: string[]): void {
  const first = order.find((id) => errors[id])
  if (first) document.getElementById(first)?.focus()
}
