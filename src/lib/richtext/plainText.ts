/**
 * Lexical plain-text utilities shared by the frontend (meta descriptions — see
 * `src/components/courses/helpers.ts`) and the `blogPosts` reading-time hook
 * (`src/collections/BlogPosts.ts`). Lives in `src/lib` (not `src/components`) so a Payload
 * collection config never has to import from the React component tree.
 */

type LexicalNode = { text?: unknown; children?: unknown }

/** Flatten a Lexical editor state to plain text (meta descriptions, word counts). */
export const lexicalToPlainText = (value: unknown): string => {
  const parts: string[] = []
  const walk = (node: unknown): void => {
    if (node == null || typeof node !== 'object') return
    const { text, children } = node as LexicalNode
    if (typeof text === 'string') parts.push(text)
    if (Array.isArray(children)) children.forEach(walk)
  }
  walk((value as { root?: unknown } | null | undefined)?.root)
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

/** Average adult reading speed used for the auto reading-time estimate (CLAUDE.md §4
 * `blogPosts.readingTime` "auto sau manual"). */
export const WORDS_PER_MINUTE = 200

/**
 * Reading time in whole minutes for a Lexical body: word count ÷ ~200 wpm, rounded up,
 * minimum 1 for any non-empty body. Returns `null` for an empty/missing body so the hook
 * can leave the field untouched instead of stamping a meaningless "1 min read".
 */
export const computeReadingTimeMinutes = (body: unknown): number | null => {
  const text = lexicalToPlainText(body)
  if (text.length === 0) return null
  const words = text.split(/\s+/).length
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}
