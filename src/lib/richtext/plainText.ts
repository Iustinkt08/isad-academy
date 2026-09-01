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

export type LexicalBlock = { kind: 'paragraph' | 'heading' | 'listItem'; text: string }

/**
 * Flatten a Lexical editor state to a list of BLOCKS (paragraph / heading / list item),
 * preserving the document's structure where `lexicalToPlainText` collapses it to one
 * line. Used by the course PDF export (`src/lib/pdf`) so descriptions keep their
 * paragraphs and bullets in print. Inline formatting (bold, links) is flattened to text.
 */
export const lexicalToBlocks = (value: unknown): LexicalBlock[] => {
  const inlineText = (node: unknown): string => {
    const parts: string[] = []
    const walk = (child: unknown): void => {
      if (child == null || typeof child !== 'object') return
      const { text, children } = child as LexicalNode
      if (typeof text === 'string') parts.push(text)
      if (Array.isArray(children)) children.forEach(walk)
    }
    walk(node)
    return parts.join('').replace(/\s+/g, ' ').trim()
  }

  const blocks: LexicalBlock[] = []
  const children = (value as { root?: { children?: unknown[] } } | null | undefined)?.root
    ?.children
  for (const child of children ?? []) {
    const type = (child as { type?: unknown } | null)?.type
    if (type === 'list') {
      for (const item of ((child as LexicalNode).children as unknown[]) ?? []) {
        const text = inlineText(item)
        if (text) blocks.push({ kind: 'listItem', text })
      }
      continue
    }
    const text = inlineText(child)
    if (text) blocks.push({ kind: type === 'heading' ? 'heading' : 'paragraph', text })
  }
  return blocks
}

/**
 * `true` when a Lexical value carries anything renderable: visible text, or a non-text
 * node that renders on its own (custom block, upload, horizontal rule). Used to hide
 * sections (e.g. the course About card) instead of rendering an empty prose shell.
 */
export const hasLexicalContent = (value: unknown): boolean => {
  const children = (value as { root?: { children?: unknown[] } } | null | undefined)?.root
    ?.children
  if (!Array.isArray(children) || children.length === 0) return false
  if (lexicalToPlainText(value).length > 0) return true
  return children.some((child) => {
    const type = (child as { type?: unknown } | null)?.type
    return type === 'block' || type === 'upload' || type === 'horizontalrule'
  })
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
