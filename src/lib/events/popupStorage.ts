/**
 * Ce ține minte browserul despre pop-up-urile de eveniment (spec §5).
 *
 * O singură cheie pentru toate evenimentele, nu una per eveniment: altfel localStorage-ul
 * unui vizitator fidel s-ar umple cu chei moarte, câte una pentru fiecare eveniment din
 * istorie. Formă: `{ "<slug>": { v, dismissedAt, registered } }`.
 *
 * `decideVisibility` e PURĂ și separată de citirea din storage — regulile au ordine, iar
 * ordinea aia e ușor de stricat fără să se vadă. Aici se poate testa fără browser.
 */

export const POPUP_STORAGE_KEY = 'isad_event_popups'
/** Kill-switch pentru e2e/QA — vezi playwright.config.ts (storageState). */
export const KILL_SWITCH_KEY = 'isad-event-popup-off'

export type PopupState = {
  /** `displayVersion` al pop-up-ului la momentul închiderii. */
  v?: number
  dismissedAt?: string
  registered?: boolean
}

export type PopupStore = Record<string, PopupState>

export const decideVisibility = (
  state: PopupState | undefined,
  popup: { displayVersion: number; eventDate: string },
  now: Date = new Date(),
): boolean => {
  // 1. Înscris = oprire DEFINITIVĂ. Prima regulă, înaintea oricărei alteia: cine s-a înscris
  //    nu mai vede pop-up-ul niciodată, nici după „reafișare forțată". Ar fi cel mai enervant
  //    fel de a mulțumi cuiva că s-a înscris.
  if (state?.registered) return false

  // 2. Închis manual, iar de atunci nu s-a forțat nicio reafișare.
  if (state?.dismissedAt && (state.v ?? 0) >= popup.displayVersion) return false

  // 3. Eveniment trecut. Verificat ȘI pe client, nu doar pe server: răspunsul de la
  //    `/active` e cache-abil 60s, deci poate sosi cu un pop-up expirat între timp.
  if (now.getTime() >= new Date(popup.eventDate).getTime()) return false

  return true
}

/** Toate accesele la storage sunt tolerante la eșec: în mod privat aruncă, iar un pop-up
 *  nu are voie să rupă pagina. Un eșec de CITIRE înseamnă „nu știm nimic" → se afișează o
 *  dată; un eșec de SCRIERE înseamnă că reapare la vizita următoare. Ambele preferabile
 *  unei erori în consola vizitatorului. */
const readStore = (): PopupStore => {
  try {
    const raw = window.localStorage.getItem(POPUP_STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? (parsed as PopupStore) : {}
  } catch {
    return {}
  }
}

const writeStore = (store: PopupStore): void => {
  try {
    window.localStorage.setItem(POPUP_STORAGE_KEY, JSON.stringify(store))
  } catch {
    // mod privat / storage plin — acceptat, vezi nota de mai sus
  }
}

export const isKillSwitchOn = (): boolean => {
  try {
    return Boolean(window.localStorage.getItem(KILL_SWITCH_KEY))
  } catch {
    return false
  }
}

export const readPopupState = (slug: string): PopupState | undefined => readStore()[slug]

const patch = (slug: string, changes: PopupState): void => {
  const store = readStore()
  store[slug] = { ...store[slug], ...changes }
  writeStore(store)
}

export const markDismissed = (slug: string, displayVersion: number): void =>
  patch(slug, { dismissedAt: new Date().toISOString(), v: displayVersion })

/** Se scrie și `v`, ca înregistrarea să fie completă chiar dacă omul nu a închis niciodată
 *  manual pop-up-ul — `registered` e oricum verificat primul. */
export const markRegistered = (slug: string, displayVersion: number): void =>
  patch(slug, { registered: true, v: displayVersion })
