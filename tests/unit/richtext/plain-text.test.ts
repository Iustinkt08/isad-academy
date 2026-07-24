import { describe, expect, it } from 'vitest'

import {
  computeReadingTimeMinutes,
  lexicalToPlainText,
  WORDS_PER_MINUTE,
} from '../../../src/lib/richtext/plainText'

const lexicalBody = (paragraphs: string[]) => ({
  root: {
    type: 'root',
    children: paragraphs.map((text) => ({
      type: 'paragraph',
      children: [{ type: 'text', text, version: 1 }],
      version: 1,
    })),
    version: 1,
  },
})

const words = (count: number): string => Array.from({ length: count }, (_, i) => `word${i}`).join(' ')

describe('lexicalToPlainText', () => {
  it('flattens nested nodes to a single normalized string', () => {
    expect(lexicalToPlainText(lexicalBody(['Hello  world', 'second   paragraph']))).toBe(
      'Hello world second paragraph',
    )
  })

  it('returns an empty string for null/undefined/malformed input', () => {
    expect(lexicalToPlainText(null)).toBe('')
    expect(lexicalToPlainText(undefined)).toBe('')
    expect(lexicalToPlainText({ root: null })).toBe('')
    expect(lexicalToPlainText('not lexical')).toBe('')
  })
})

describe('computeReadingTimeMinutes', () => {
  it('returns null for an empty or missing body (hook leaves the field untouched)', () => {
    expect(computeReadingTimeMinutes(null)).toBeNull()
    expect(computeReadingTimeMinutes(undefined)).toBeNull()
    expect(computeReadingTimeMinutes(lexicalBody([]))).toBeNull()
    expect(computeReadingTimeMinutes(lexicalBody([''])) ?? null).toBeNull()
  })

  it('never estimates below 1 minute for a non-empty body', () => {
    expect(computeReadingTimeMinutes(lexicalBody(['Just a few words here.']))).toBe(1)
  })

  it(`rounds up at ~${WORDS_PER_MINUTE} words per minute`, () => {
    expect(computeReadingTimeMinutes(lexicalBody([words(200)]))).toBe(1)
    expect(computeReadingTimeMinutes(lexicalBody([words(201)]))).toBe(2)
    expect(computeReadingTimeMinutes(lexicalBody([words(450)]))).toBe(3)
  })
})
