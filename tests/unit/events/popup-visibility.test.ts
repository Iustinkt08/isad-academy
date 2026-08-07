import { describe, expect, it } from 'vitest'

import { decideVisibility } from '../../../src/lib/events/popupStorage'

/**
 * Criteriile de acceptanță din spec §11 privind afișarea, transformate în teste. Regulile au
 * ORDINE, iar ordinea e ușor de stricat fără să se vadă în UI — de aia sunt testate separat
 * de componentă.
 */
const NOW = new Date('2026-08-07T12:00:00Z')
const FUTURE = '2026-09-01T00:00:00Z'
const PAST = '2026-08-01T00:00:00Z'

const popup = (displayVersion = 1, eventDate = FUTURE) => ({ displayVersion, eventDate })

describe('decideVisibility', () => {
  it('shows the pop-up to a first-time visitor', () => {
    expect(decideVisibility(undefined, popup(), NOW)).toBe(true)
  })

  it('hides it from someone who dismissed the current version', () => {
    const state = { dismissedAt: '2026-08-06T10:00:00Z', v: 1 }
    expect(decideVisibility(state, popup(1), NOW)).toBe(false)
  })

  it('shows it again after "Force re-show" bumps the version', () => {
    const state = { dismissedAt: '2026-08-06T10:00:00Z', v: 1 }
    expect(decideVisibility(state, popup(2), NOW)).toBe(true)
  })

  it('NEVER shows it to someone who registered — not even after a version bump', () => {
    // Cea mai importantă regulă din tot fișierul: a mulțumi cuiva că s-a înscris arătându-i
    // din nou același pop-up e exact felul de detaliu care face un site enervant.
    const state = { registered: true, v: 1 }
    expect(decideVisibility(state, popup(99), NOW)).toBe(false)
  })

  it('registered beats a pending dismissal too', () => {
    const state = { registered: true, dismissedAt: '2026-08-06T10:00:00Z', v: 1 }
    expect(decideVisibility(state, popup(50), NOW)).toBe(false)
  })

  it('hides it once the event date has passed, even for a fresh visitor', () => {
    // Verificat pe client pentru că răspunsul de la /active e cache-abil 60s.
    expect(decideVisibility(undefined, popup(1, PAST), NOW)).toBe(false)
  })

  it('hides it exactly at the event start, not a second later', () => {
    const startsNow = NOW.toISOString()
    expect(decideVisibility(undefined, popup(1, startsNow), NOW)).toBe(false)
  })

  it('treats a dismissal without a version as older than any current version', () => {
    // Intrări scrise de o versiune anterioară a codului: nu le tratăm ca „văzut deja".
    const state = { dismissedAt: '2026-08-06T10:00:00Z' }
    expect(decideVisibility(state, popup(1), NOW)).toBe(true)
  })
})
