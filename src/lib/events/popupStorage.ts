/**
 * Ce ține minte browserul despre pop-up-urile de eveniment (spec §5 + decizie owner
 * 2026-08-08: închiderea manuală ascunde pop-up-ul DOAR pentru sesiunea curentă de
 * browser; la o vizită ulterioară reapare).
 *
 * Două stocări, cu roluri diferite:
 *   - localStorage (`POPUP_STORAGE_KEY`)  → `registered`: oprire DEFINITIVĂ, per vizitator;
 *   - sessionStorage (`POPUP_SESSION_KEY`) → `dismissedAt`/`v`: închiderea manuală, care
 *     expiră odată cu sesiunea (tab nou / revenire ulterioară = pop-up-ul reapare).
 *
 * O singură cheie per stocare pentru toate evenimentele, nu una per eveniment: altfel
 * storage-ul unui vizitator fidel s-ar umple cu chei moarte, câte una pentru fiecare
 * eveniment din istorie. Formă: `{ "<slug>": { v, dismissedAt, registered } }`.
 *
 * `decideVisibility` e PURĂ și separată de citirea din storage — regulile au ordine, iar
 * ordinea aia e ușor de stricat fără să se vadă. Aici se poate testa fără browser.
 */

export const POPUP_STORAGE_KEY = 'isad_event_popups'
export const POPUP_SESSION_KEY = 'isad_event_popups_session'
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

  // 2. Închis manual ÎN SESIUNEA CURENTĂ (dismissedAt vine din sessionStorage), iar de
  //    atunci nu s-a forțat nicio reafișare (bump de `displayVersion` din admin).
  if (state?.dismissedAt && (state.v ?? 0) >= popup.displayVersion) return false

  // 3. Eveniment trecut. Verificat ȘI pe client, nu doar pe server: răspunsul de la
  //    `/active` e cache-abil 60s, deci poate sosi cu un pop-up expirat între timp.
  if (now.getTime() >= new Date(popup.eventDate).getTime()) return false

  return true
}

/** Toate accesele la storage sunt tolerante la eșec: în mod privat aruncă, iar un pop-up
 *  nu are voie să rupă pagina. Un eșec de CITIRE înseamnă „nu știm nimic" → se afișează o
 *  dată; un eșec de SCRIERE înseamnă că reapare la vizita/sesiunea următoare. Ambele
 *  preferabile unei erori în consola vizitatorului. */
type StorageKind = 'localStorage' | 'sessionStorage'

const readStore = (kind: StorageKind, key: string): PopupStore => {
  try {
    const raw = window[kind].getItem(key)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? (parsed as PopupStore) : {}
  } catch {
    return {}
  }
}

const writeStore = (kind: StorageKind, key: string, store: PopupStore): void => {
  try {
    window[kind].setItem(key, JSON.stringify(store))
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

/**
 * Starea combinată: `registered` (permanent, localStorage) peste închiderea de sesiune
 * (sessionStorage). `v` al sesiunii are prioritate — el reflectă ultima închidere văzută;
 * dacă nu există închidere în sesiune, rămâne `v`-ul scris la înscriere (irelevant pentru
 * regula 2, care cere și `dismissedAt`).
 */
export const readPopupState = (slug: string): PopupState | undefined => {
  const permanent = readStore('localStorage', POPUP_STORAGE_KEY)[slug]
  const session = readStore('sessionStorage', POPUP_SESSION_KEY)[slug]
  if (!permanent && !session) return undefined
  return {
    ...permanent,
    ...session,
    ...(permanent?.registered ? { registered: true } : {}),
  }
}

const patch = (kind: StorageKind, key: string, slug: string, changes: PopupState): void => {
  const store = readStore(kind, key)
  store[slug] = { ...store[slug], ...changes }
  writeStore(kind, key, store)
}

/** Închidere manuală → DOAR sesiunea curentă (owner 2026-08-08): vizita următoare o uită. */
export const markDismissed = (slug: string, displayVersion: number): void =>
  patch('sessionStorage', POPUP_SESSION_KEY, slug, {
    dismissedAt: new Date().toISOString(),
    v: displayVersion,
  })

/** Înscrierea e permanentă (localStorage). Se scrie și `v`, ca înregistrarea să fie
 *  completă chiar dacă omul nu a închis niciodată manual pop-up-ul — `registered` e
 *  oricum verificat primul. */
export const markRegistered = (slug: string, displayVersion: number): void =>
  patch('localStorage', POPUP_STORAGE_KEY, slug, { registered: true, v: displayVersion })
