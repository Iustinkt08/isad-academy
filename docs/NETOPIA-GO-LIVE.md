# Netopia — trecerea de la sandbox la plăți reale (go-live)

> Context (2026-08-13): contul Netopia al ISAD e **activ legal, dar nu tehnic** — POS-ul
> live așteaptă validarea echipei Netopia. Integrarea tehnică din site e COMPLETĂ și
> testată end-to-end în sandbox pe site-ul live (comandă → pagina de plată → confirmare →
> loc consumat). Contractul acoperă **RON + EUR**, deci logica de monedă rămâne neatinsă.
> Producția rulează cu cheile de **sandbox** și `NETOPIA_SANDBOX=true` până la aprobare.

## Pasul 1 — Silviu: formularul de aprobare tehnică

În <https://admin.netopia-payments.com> → **Puncte de vânzare → Începe implementarea
tehnică → Solicită aprobare** → completează formularul de testare cu datele de mai jos
(copy-paste). Site-ul rămâne pe sandbox până la aprobare — testerii Netopia pot parcurge
fluxul cu cardurile lor de test fără bani reali.

### Răspunsuri pregătite pentru formular

| Câmp | Valoare |
|---|---|
| URL site | `https://isad.academy` |
| Platformă / tip integrare | Platformă custom (Node.js — Next.js 15); **Payments API v2, hosted payment page** (fără date de card pe site) |
| URL de confirmare (IPN) | `https://isad.academy/api/netopia/ipn` (POST, server-to-server; JWT `Verification-token` verificat cu certificatul public) |
| URL de retur | `https://isad.academy/api/netopia/return` (browserul revine aici; pagina finală: `/checkout/confirmare`) |
| Monede | RON (vizitatori RO) și EUR (vizitatori non-RO) — moneda comenzii se trimite în cererea de plată |
| Cum se testează | 1. `https://isad.academy/courses` → alege un curs → **Enrol** 2. Completează formularul de checkout (nume, email, telefon) 3. **Pay** → redirecționare pe pagina de plată Netopia 4. Plată cu card de test → retur pe pagina de confirmare cu statusul comenzii |
| Însemnele Netopia pe site | Footer (toate paginile, lângă badge-urile ANPC) + în checkout, sub butonul de plată (kit oficial, varianta light) |
| Pagini legale | Termeni + politica de anulare/livrare: `/terms` · Confidențialitate: `/privacy` · Cookies: `/cookies` · Badge-uri ANPC SAL/SOL în footer |
| Entitate | International Security and Defence SRL (ISAD), CIF 44849076 — afișată în footer |
| Contact tehnic | (completează Silviu — recomandat o adresă @isad.academy) |

## Pasul 2 — după aprobare: comutarea producției pe live

1. Silviu ia din admin-ul live (Puncte de vânzare → punctul aprobat) **cheile LIVE**:
   API key, POS signature și certificatul public pentru IPN. Cele de sandbox NU merg pe live.
2. În cPanel (env-urile aplicației) se înlocuiesc valorile:
   - `NETOPIA_API_KEY` → cheia live
   - `NETOPIA_POS_SIGNATURE` → semnătura live
   - `NETOPIA_PUBLIC_KEY` → certificatul live (PEM sau PEM în base64)
   - `NETOPIA_SANDBOX` → **exact `false`** (orice altă valoare = tot sandbox)
   - `PAYMENT_PROVIDER` rămâne `netopia`
3. Restart aplicație (touch `tmp/restart.txt` sau Restart din Setup Node.js App).
4. **Test de verificare cu bani reali**: o comandă mică plătită cu card real → comanda
   `confirmed` + loc consumat în admin Payload → apoi **refund din admin Netopia** →
   verifică IPN-ul de CREDIT: comanda trece în `refunded` și locul se eliberează.

## De reținut

- Nu comuta `NETOPIA_SANDBOX=false` cu cheile de sandbox încă în env — plățile ar pica
  toate (cheile de sandbox nu sunt valide pe endpoint-urile live).
- Fluxul complet, cazurile de margine și cardurile de test: `docs/NETOPIA.md`.
- `ALLOW_MOCK_PAYMENTS` nu se setează niciodată în producție (CLAUDE.md §2).
