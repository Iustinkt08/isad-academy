import { afterEach, describe, expect, it, vi } from 'vitest'

import { toImageSrc } from '../../../src/lib/media/imageSrc'

/**
 * Payload emits ABSOLUTE media URLs whenever `serverURL` is configured (which it is,
 * from NEXT_PUBLIC_SITE_URL), but next/image only accepts relative paths unless every
 * host is allow-listed in `images.remotePatterns`. `toImageSrc` bridges the two by
 * stripping the site's own origin — and ONLY the site's own origin — off media URLs.
 */
describe('toImageSrc', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('leaves relative paths untouched', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000')
    expect(toImageSrc('/api/media/file/photo.jpg')).toBe('/api/media/file/photo.jpg')
  })

  it('strips the site origin off same-site absolute URLs', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000')
    expect(toImageSrc('http://localhost:3000/api/media/file/photo.jpg')).toBe(
      '/api/media/file/photo.jpg',
    )
  })

  it('preserves the query string when stripping', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://isad.academy')
    expect(toImageSrc('https://isad.academy/api/media/file/photo.jpg?v=2')).toBe(
      '/api/media/file/photo.jpg?v=2',
    )
  })

  it('tolerates a trailing slash on NEXT_PUBLIC_SITE_URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://isad.academy/')
    expect(toImageSrc('https://isad.academy/api/media/file/photo.jpg')).toBe(
      '/api/media/file/photo.jpg',
    )
  })

  it('leaves external URLs untouched (future S3/CDN storage)', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://isad.academy')
    expect(toImageSrc('https://cdn.example.com/photo.jpg')).toBe('https://cdn.example.com/photo.jpg')
  })

  it('passes absolute URLs through when NEXT_PUBLIC_SITE_URL is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    expect(toImageSrc('https://isad.academy/api/media/file/photo.jpg')).toBe(
      'https://isad.academy/api/media/file/photo.jpg',
    )
  })

  it('passes malformed values through unchanged', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://isad.academy')
    expect(toImageSrc('not a url')).toBe('not a url')
  })
})
