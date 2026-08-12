import {
  convertHTMLToLexical,
  editorConfigFactory,
  type SerializedBlockNode,
} from '@payloadcms/richtext-lexical'
import { convertLexicalToHTML, type HTMLConvertersFunction } from '@payloadcms/richtext-lexical/html'
import { JSDOM } from 'jsdom'
import type { SanitizedConfig } from 'payload'

import type { CodeBlock } from '../../payload-types'
import { resolveTextStateStyle } from './textState'

/**
 * HTML "code view" for rich text (owner 2026-08-12: edit the course description as raw
 * HTML, like a classic WYSIWYG's Code View). Two one-way converters, glued together by
 * the `descriptionHtml` virtual field on `courses`:
 *   - Lexical → HTML on read (what the code field displays), and
 *   - HTML → Lexical on save, ONLY when the submitted HTML differs from the HTML of the
 *     current content (see the beforeChange hook in src/collections/Courses.ts).
 *
 * Known round-trip limits (documented in the admin field description): brand text colors
 * render as inline-styled spans and custom code blocks as <pre data-language> — both are
 * flattened to plain formatting if the HTML is edited and saved, because the HTML parser
 * only understands standard tags. Use the visual editor for those two features.
 */

const escapeHtml = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

/** camelCase CSS property → hyphen-case (React style object → style="" attribute). */
const toHyphen = (property: string): string =>
  property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)

const htmlConverters: HTMLConvertersFunction<SerializedBlockNode<CodeBlock>> = ({
  defaultConverters,
}) => ({
  ...defaultConverters,
  // Named brand colors (TextStateFeature `$` state) → inline-styled spans, so the code
  // view shows the same emphasis the page renders.
  text: (args) => {
    const defaultText = defaultConverters.text
    const rendered =
      typeof defaultText === 'function' ? defaultText(args) : escapeHtml(args.node.text ?? '')
    const state = (args.node as { $?: Record<string, unknown> }).$
    const style = resolveTextStateStyle(state)
    if (!style) return rendered
    const css = Object.entries(style)
      .map(([property, value]) => `${toHyphen(property)}: ${value}`)
      .join('; ')
    return `<span style="${css}">${rendered}</span>`
  },
  blocks: {
    codeBlock: ({ node }) => {
      const fields = node.fields as CodeBlock
      const language = fields.language && fields.language !== 'plain' ? fields.language : ''
      return `<pre${language ? ` data-language="${language}"` : ''}><code>${escapeHtml(fields.code ?? '')}</code></pre>`
    },
  },
})

/** Serialized Lexical state → HTML source shown in the admin code view. */
export const lexicalToHtmlSource = (data: unknown): string => {
  if (!data || typeof data !== 'object') return ''
  try {
    return convertLexicalToHTML({
      converters: htmlConverters,
      data: data as Parameters<typeof convertLexicalToHTML>[0]['data'],
    })
  } catch {
    // Malformed/legacy state — show an empty source rather than breaking the admin read.
    return ''
  }
}

/** Edited HTML source → serialized Lexical state (standard tags only — see limits above). */
export const htmlSourceToLexical = async (html: string, config: SanitizedConfig) =>
  convertHTMLToLexical({
    editorConfig: await editorConfigFactory.default({ config }),
    html,
    JSDOM,
  })
