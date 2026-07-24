import { describe, expect, it } from 'vitest'

import { isAbsoluteHttpUrl } from '../../../src/fields/richTextBlocks'

describe('isAbsoluteHttpUrl (linkChip.url validation)', () => {
  it('accepts absolute http(s) URLs', () => {
    expect(isAbsoluteHttpUrl('https://www.youtube.com/watch?v=abc')).toBe(true)
    expect(isAbsoluteHttpUrl('http://example.com/page')).toBe(true)
  })

  it('rejects relative URLs, other protocols and garbage', () => {
    expect(isAbsoluteHttpUrl('/blog/post')).toBe(false)
    expect(isAbsoluteHttpUrl('example.com')).toBe(false)
    expect(isAbsoluteHttpUrl('ftp://example.com/file')).toBe(false)
    // eslint-disable-next-line no-script-url
    expect(isAbsoluteHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isAbsoluteHttpUrl('mailto:a@b.co')).toBe(false)
    expect(isAbsoluteHttpUrl('')).toBe(false)
    expect(isAbsoluteHttpUrl('not a url')).toBe(false)
  })
})
