import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  markDismissed,
  markRegistered,
  POPUP_SESSION_KEY,
  POPUP_STORAGE_KEY,
  readPopupState,
} from '../../../src/lib/events/popupStorage'

/**
 * Storage split (owner 2026-08-08): closing a popup hides it for the CURRENT browser
 * session only (sessionStorage), while registering hides it permanently (localStorage).
 * These tests pin which store each write lands in and how reads merge the two.
 */
const makeMemoryStorage = (): Storage => {
  const bag = new Map<string, string>()
  return {
    getItem: (k: string) => bag.get(k) ?? null,
    setItem: (k: string, v: string) => void bag.set(k, v),
    removeItem: (k: string) => void bag.delete(k),
    clear: () => bag.clear(),
    key: (i: number) => [...bag.keys()][i] ?? null,
    get length() {
      return bag.size
    },
  }
}

let localStore: Storage
let sessionStore: Storage

beforeEach(() => {
  localStore = makeMemoryStorage()
  sessionStore = makeMemoryStorage()
  ;(globalThis as { window?: unknown }).window = {
    localStorage: localStore,
    sessionStorage: sessionStore,
  }
})

afterEach(() => {
  delete (globalThis as { window?: unknown }).window
})

describe('popup storage split', () => {
  it('markDismissed writes to sessionStorage only', () => {
    markDismissed('ai-summit', 2)
    expect(sessionStore.getItem(POPUP_SESSION_KEY)).toContain('ai-summit')
    expect(localStore.getItem(POPUP_STORAGE_KEY)).toBeNull()
    expect(readPopupState('ai-summit')).toMatchObject({ v: 2 })
    expect(readPopupState('ai-summit')?.dismissedAt).toBeTruthy()
  })

  it('markRegistered writes to localStorage only (permanent)', () => {
    markRegistered('ai-summit', 3)
    expect(localStore.getItem(POPUP_STORAGE_KEY)).toContain('ai-summit')
    expect(sessionStore.getItem(POPUP_SESSION_KEY)).toBeNull()
    expect(readPopupState('ai-summit')).toMatchObject({ registered: true, v: 3 })
  })

  it('a cleared session forgets the dismissal but keeps the registration', () => {
    markDismissed('ai-summit', 1)
    markRegistered('other-event', 1)
    // New session: sessionStorage is empty, localStorage survives.
    sessionStore.clear()
    expect(readPopupState('ai-summit')?.dismissedAt).toBeUndefined()
    expect(readPopupState('other-event')).toMatchObject({ registered: true })
  })

  it('merges registration (local) with a same-slug dismissal (session)', () => {
    markRegistered('ai-summit', 1)
    markDismissed('ai-summit', 2)
    const state = readPopupState('ai-summit')
    expect(state).toMatchObject({ registered: true, v: 2 })
  })
})
