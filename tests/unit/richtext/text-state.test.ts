import { describe, expect, it } from 'vitest'

import { resolveTextStateStyle, TEXT_STATE_PRESETS } from '../../../src/lib/richtext/textState'

describe('TEXT_STATE_PRESETS', () => {
  it('exposes palette-named color keys (content stores keys, never raw hexes)', () => {
    expect(Object.keys(TEXT_STATE_PRESETS.color)).toEqual(['blue', 'aqua', 'ink'])
    expect(TEXT_STATE_PRESETS.color.blue.css.color).toBe('#1C5D99')
    expect(TEXT_STATE_PRESETS.color.aqua.css.color).toBe('#407EA2')
    expect(TEXT_STATE_PRESETS.color.ink.css.color).toBe('#222222')
  })
})

describe('resolveTextStateStyle', () => {
  it('maps a named color key to its inline style', () => {
    expect(resolveTextStateStyle({ color: 'blue' })).toEqual({ color: '#1C5D99' })
  })

  it('camel-cases hyphenated CSS properties (highlight background)', () => {
    expect(resolveTextStateStyle({ highlight: 'ice' })).toEqual({
      backgroundColor: '#BBCDE5',
      color: '#222222',
    })
  })

  it('merges multiple state keys', () => {
    expect(resolveTextStateStyle({ color: 'aqua', highlight: 'ice' })).toMatchObject({
      backgroundColor: '#BBCDE5',
    })
  })

  it('ignores unknown keys/values and non-string values instead of breaking', () => {
    expect(resolveTextStateStyle({ color: 'crimson' })).toBeNull()
    expect(resolveTextStateStyle({ nonsense: 'blue' })).toBeNull()
    expect(resolveTextStateStyle({ color: 42 as unknown as string })).toBeNull()
    expect(resolveTextStateStyle(null)).toBeNull()
    expect(resolveTextStateStyle(undefined)).toBeNull()
  })
})
