import { afterEach, describe, expect, it, vi } from 'vitest'

import { lexicalToEmailHtml } from '../../../src/lib/email/templates/lexicalToEmailHtml'

/**
 * Lexical `upload` nodes → email <img> (owner 2026-08-08, after a newsletter shipped
 * without its image). Populated media renders with an ABSOLUTE src (email clients cannot
 * resolve site-relative paths); an unpopulated bare id is skipped, never guessed.
 */
const doc = (children: unknown[]) => ({
  root: { type: 'root', children },
})

describe('lexicalToEmailHtml upload nodes', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('renders a populated upload as an absolute-src img', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://isad.academy')
    const html = lexicalToEmailHtml(
      doc([
        {
          type: 'upload',
          relationTo: 'media',
          value: { url: '/api/media/file/photo.jpg', alt: 'Team photo', width: 1200 },
        },
      ]),
    )
    expect(html).toContain('<img src="https://isad.academy/api/media/file/photo.jpg"')
    expect(html).toContain('alt="Team photo"')
    expect(html).toContain('width="600"')
  })

  it('keeps an already-absolute media url untouched', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://isad.academy')
    const html = lexicalToEmailHtml(
      doc([{ type: 'upload', value: { url: 'https://cdn.example.com/x.png', alt: '' } }]),
    )
    expect(html).toContain('src="https://cdn.example.com/x.png"')
  })

  it('skips an unpopulated upload (bare id) instead of rendering a broken img', () => {
    const html = lexicalToEmailHtml(doc([{ type: 'upload', value: 7 }]))
    expect(html).toBe('')
  })

  it('caps the width attribute at 600 but keeps smaller natural widths', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://isad.academy')
    const html = lexicalToEmailHtml(
      doc([{ type: 'upload', value: { url: '/api/media/file/small.png', width: 320 } }]),
    )
    expect(html).toContain('width="320"')
  })
})
