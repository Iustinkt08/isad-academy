import { describe, expect, it } from 'vitest'

import { checkRateLimit, getClientIp } from '../../../src/lib/api/rateLimit'

const req = (ip: string): Request =>
  new Request('http://localhost/api/x', { method: 'POST', headers: { 'x-forwarded-for': ip } })

describe('checkRateLimit (fixed-window, in-process)', () => {
  it('allows up to `limit` requests then blocks with a retryAfter', () => {
    const opts = { name: 'test-a', limit: 3, windowMs: 60_000 }
    const r = req('10.0.0.1')

    expect(checkRateLimit(r, opts).ok).toBe(true)
    expect(checkRateLimit(r, opts).ok).toBe(true)
    expect(checkRateLimit(r, opts).ok).toBe(true)

    const blocked = checkRateLimit(r, opts)
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) expect(blocked.retryAfter).toBeGreaterThan(0)
  })

  it('keeps separate buckets per IP', () => {
    const opts = { name: 'test-b', limit: 1, windowMs: 60_000 }
    expect(checkRateLimit(req('1.1.1.1'), opts).ok).toBe(true)
    expect(checkRateLimit(req('2.2.2.2'), opts).ok).toBe(true)
    expect(checkRateLimit(req('1.1.1.1'), opts).ok).toBe(false)
  })

  it('separates buckets per route name', () => {
    const r = req('3.3.3.3')
    expect(checkRateLimit(r, { name: 'route-x', limit: 1, windowMs: 60_000 }).ok).toBe(true)
    expect(checkRateLimit(r, { name: 'route-y', limit: 1, windowMs: 60_000 }).ok).toBe(true)
  })

  it('getClientIp takes the first x-forwarded-for hop, falls back to unknown', () => {
    expect(getClientIp(req('9.9.9.9, 10.0.0.1'))).toBe('9.9.9.9')
    expect(getClientIp(new Request('http://localhost', { method: 'POST' }))).toBe('unknown')
  })
})
