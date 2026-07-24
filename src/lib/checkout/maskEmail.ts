/**
 * PII-safe rendering of an email address for structured logs (CLAUDE.md quality floor —
 * never write full buyer/participant PII to logs). Keeps only the first character of the
 * local part plus the full domain, e.g. `"jane.doe@example.com"` -> `"j***@example.com"`.
 */
export const maskEmail = (email: string): string => {
  const at = email.indexOf('@')
  if (at <= 0) return '***'
  return `${email.slice(0, 1)}***${email.slice(at)}`
}
