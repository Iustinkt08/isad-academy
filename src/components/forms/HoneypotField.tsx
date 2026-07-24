'use client'

/**
 * Spam honeypot (documented in src/lib/leads/createLead.ts): a text input named `website`
 * that humans never see, focus or tab into — bots that auto-fill every field populate it,
 * and the API then pretends success while skipping creation. Kept off-screen (not
 * `display:none`) because some bots skip visually-hidden-by-display fields.
 */
export function HoneypotField() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  )
}
