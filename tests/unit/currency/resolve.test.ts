import { afterEach, describe, expect, it } from 'vitest'

import {
  getVisitorCountry,
  resolveCurrency,
  resolveSessionForCurrency,
  windowForCurrency,
} from '../../../src/lib/currency'
import type { CourseSession } from '../../../src/payload-types'

afterEach(() => {
  delete process.env.DEV_GEO_COUNTRY
})

describe('resolveCurrency (B1 — RON for RO, EUR otherwise)', () => {
  it.each([
    ['RO', 'RON'],
    ['ro', 'RON'],
    [' RO ', 'RON'],
    ['DE', 'EUR'],
    ['US', 'EUR'],
    ['MD', 'EUR'],
  ])('country %s → %s', (country, expected) => {
    expect(resolveCurrency(country)).toBe(expected)
  })

  it('falls back to the config default when the country is unknown', () => {
    expect(resolveCurrency(null)).toBe('EUR')
    expect(resolveCurrency(undefined, 'RON')).toBe('RON')
    expect(resolveCurrency('', 'RON')).toBe('RON')
  })
})

describe('getVisitorCountry', () => {
  it('reads the Vercel geo header, then Cloudflare, else null', () => {
    expect(getVisitorCountry(new Headers({ 'x-vercel-ip-country': 'RO' }))).toBe('RO')
    expect(getVisitorCountry(new Headers({ 'cf-ipcountry': 'FR' }))).toBe('FR')
    expect(getVisitorCountry(new Headers())).toBeNull()
  })

  it('DEV_GEO_COUNTRY overrides headers (local dev simulation)', () => {
    process.env.DEV_GEO_COUNTRY = 'RO'
    expect(getVisitorCountry(new Headers({ 'x-vercel-ip-country': 'DE' }))).toBe('RO')
  })
})

describe('windowForCurrency', () => {
  const window = { price: 900, priceRON: 4500, startDate: '2026-01-01', endDate: '2026-02-01' }

  it('EUR keeps the window untouched', () => {
    expect(windowForCurrency(window, 'EUR')).toBe(window)
  })

  it('RON swaps in priceRON as the engine-facing price', () => {
    expect(windowForCurrency(window, 'RON')).toMatchObject({ price: 4500 })
  })

  it('RON with no priceRON yields price: null — window inactive, never billed in EUR', () => {
    expect(windowForCurrency({ ...window, priceRON: null }, 'RON')).toMatchObject({ price: null })
    expect(windowForCurrency({ ...window, priceRON: undefined }, 'RON')).toMatchObject({
      price: null,
    })
  })
})

describe('resolveSessionForCurrency', () => {
  it('resolves both windows and leaves everything else intact', () => {
    const session = {
      id: 1,
      capacity: 10,
      earlyBird: { price: 900, priceRON: 4500 },
      standard: { price: 1200, priceRON: null },
    } as unknown as CourseSession
    const resolved = resolveSessionForCurrency(session, 'RON')
    expect(resolved.earlyBird?.price).toBe(4500)
    expect(resolved.standard?.price).toBeNull()
    expect(resolved.id).toBe(1)
    expect(resolved.capacity).toBe(10)
  })
})
