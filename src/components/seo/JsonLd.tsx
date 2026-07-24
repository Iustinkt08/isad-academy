import React from 'react'

/**
 * Server-rendered Schema.org structured data (T14, CLAUDE.md §7). Emits a single
 * `<script type="application/ld+json">` tag. `<` is escaped to `<` so document
 * content can never break out of the script element (standard JSON-LD XSS hygiene) —
 * JSON.parse on the consumer side is unaffected.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
