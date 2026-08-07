/**
 * Numele câmpului-capcană din formularul de înscriere — folosit ȘI de client (ca să-l
 * randeze ascuns), ȘI de server (ca să-l verifice).
 *
 * Trăiește în modulul lui propriu, fără nicio dependență, tocmai pentru asta: importat din
 * `registerForEventPopup`, ar fi tras după el `sendConfirmation` → `confirmToken` →
 * `node:crypto` în bundle-ul de browser, iar webpack refuză schema `node:` pe client.
 * Rezultatul a fost 500 pe TOT site-ul, inclusiv /admin (2026-08-07). Nu muta constanta
 * înapoi într-un fișier care atinge serverul.
 */
export const HONEYPOT_FIELD = 'website'
