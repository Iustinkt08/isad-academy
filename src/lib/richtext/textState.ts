import type { CSSProperties } from 'react'

/**
 * Palette-aligned text-color presets for Lexical's built-in `TextStateFeature`
 * (docs/PLAN.md locked rich-text decision; CLAUDE.md §12 palette). The editor stores only
 * the NAMED KEYS in content (e.g. `{ "$": { "color": "blue" } }`) — never raw hexes — so
 * the palette can be retuned here later without migrating any stored editor state.
 *
 * Single source of truth for BOTH sides:
 *   - the admin editor (`TextStateFeature({ state: TEXT_STATE_PRESETS })` in
 *     `src/collections/BlogPosts.ts`), and
 *   - the frontend renderer (`resolveTextStateStyle` below, used by
 *     `src/components/richtext/RichTextContent.tsx` — the default `text` JSX converter
 *     ignores node state, so the renderer resolves it through this same map).
 */
export const TEXT_STATE_PRESETS = {
  color: {
    blue: { label: 'Blue', css: { color: '#1C5D99' } },
    /* Stored key stays `aqua` (seeded content references it); the brand has no aqua, so the
       value/label are Steel Blue #407EA2 (Brand Book p.10). */
    aqua: { label: 'Steel Blue', css: { color: '#407EA2' } },
    ink: { label: 'Ink', css: { color: '#222222' } },
  },
  highlight: {
    ice: { label: 'Ice highlight', css: { 'background-color': '#BBCDE5', color: '#222222' } },
    ink: { label: 'Ink highlight', css: { 'background-color': '#222222', color: '#FFFFFF' } },
  },
} as const

type StateRecord = Record<string, { label: string; css: Record<string, string> }>

const hyphenToCamel = (property: string): string =>
  property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())

/**
 * Resolves a serialized text node's `$` state record (e.g. `{ color: 'blue' }`) to a React
 * inline-style object using the presets above. Unknown keys/values are ignored — content
 * saved with a preset that has since been removed simply renders unstyled, never breaks.
 */
export const resolveTextStateStyle = (
  state: Record<string, unknown> | null | undefined,
): CSSProperties | null => {
  if (!state) return null

  const style: Record<string, string> = {}
  for (const [stateKey, stateValue] of Object.entries(state)) {
    if (typeof stateValue !== 'string') continue
    const presets = (TEXT_STATE_PRESETS as Record<string, StateRecord>)[stateKey]
    const css = presets?.[stateValue]?.css
    if (!css) continue
    for (const [property, value] of Object.entries(css)) {
      style[hyphenToCamel(property)] = value
    }
  }

  return Object.keys(style).length > 0 ? (style as CSSProperties) : null
}
