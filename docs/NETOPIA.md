# Netopia Payments — integrare & testare în sandbox

Integrare **API v2, hosted payment page** (`src/lib/payments/netopia.ts`): checkout-ul
pornește plata la Netopia fără date de card, primește `paymentURL` și trimite browserul
cumpărătorului acolo. Confirmarea vine asincron, pe două canale idempotente (primul care
ajunge câștigă, celălalt devine no-op):

1. **IPN** — `POST /api/netopia/ipn` (server-to-server, autoritar). Autentificat prin
   JWT-ul din header-ul `Verification-token`, verificat cu certificatul public Netopia
   (`NETOPIA_PUBLIC_KEY`) în `src/lib/payments/netopiaIpn.ts`.
2. **Return + status poll** — `GET /api/netopia/return` (browserul se întoarce de pe
   pagina de plată). Dacă IPN-ul n-a ajuns încă (sau nu poate ajunge — ex. localhost),
   ruta interoghează `/operation/status` la Netopia și aplică rezultatul.

Doar statusurile **PAID (3)** / **CONFIRMED (5)** confirmă comanda (și consumă locurile,
atomic, prin hook-ul din `Orders`). **CREDIT (8)** → `refunded` (eliberează locurile).
Anulat/refuzat/expirat → `failed`. Restul sunt informaționale și nu ating comanda.

## Configurare (env)

```
PAYMENT_PROVIDER=netopia
NETOPIA_API_KEY=...          # din admin Netopia
NETOPIA_POS_SIGNATURE=...    # semnătura POS-ului
NETOPIA_SANDBOX=true         # DEFAULT sandbox; EXACT 'false' pentru live
NETOPIA_PUBLIC_KEY=...       # certificatul public (PEM / PEM cu \n / PEM în base64)
NEXT_PUBLIC_SITE_URL=...     # din el se construiesc notify/return URL-urile
```

Cheile de **sandbox** se iau din contul de test: <https://sandbox.netopia-payments.com>
(profil → Security, respectiv POS-ul de test). Cheile live vin din admin-ul de producție
abia după semnarea contractului.

## Testare fără plăți reale (sandbox)

1. `PAYMENT_PROVIDER=netopia` + cheile de sandbox în `.env` (lasă `NETOPIA_SANDBOX=true`).
2. Pornește site-ul, fă un checkout normal → ești redirecționat pe pagina de plată
   Netopia (sandbox).
3. Plătește cu un **card de test** (nu se retrag bani), de ex.:
   - `9900004810225098`, expirare orice dată viitoare (ex. 12/28), CVV `111` — succes.
   - Lista completă (și carduri care simulează refuz) e în documentația sandbox Netopia.
4. La final ești adus înapoi pe `/checkout/confirmare?outcome=paid|pending|failed`.

**Local (localhost):** Netopia nu poate livra IPN-ul către localhost — nu-i o problemă:
ruta de return face poll la status și confirmă comanda singură. Ca să testezi și IPN-ul
real, expune portul cu un tunel (ex. `cloudflared tunnel --url http://localhost:3000` sau
ngrok) și setează `NEXT_PUBLIC_SITE_URL` pe URL-ul tunelului.

**Pe hosting (staging/producție):** ambele canale funcționează direct; IPN-ul e cel
autoritar. Verifică în dashboard-ul Payload (Sales → Orders) că `paymentStatus` trece în
`confirmed` și că `seatsSold` crește pe ediție.

## Cazuri de margine acoperite

- Plată abandonată/refuzată → comanda rămâne `pending`/trece în `failed`; niciun loc
  consumat; pagina de confirmare arată starea de eșec cu buton înapoi la cursuri.
- Buyer plătește, dar ediția s-a umplut între timp → comanda rămâne `pending` și se
  loghează `REFUND REQUIRED` (rambursare manuală din admin Netopia; fluxul de refund
  compensator nu e construit încă).
- IPN duplicat / IPN + poll simultan → `applyPaymentOutcome` e idempotent.
- IPN cu semnătură invalidă / audiență greșită / body umblat → respins cu 4xx (Netopia
  reîncearcă).

## Identitate vizuală (cerință de aprobare)

Netopia **nu aprobă trecerea POS-ului pe producție** fără însemnele lor pe site. Afișate în
două locuri, ambele pe fundal deschis ⇒ varianta „light" (wordmark albastru):

| Unde | Fișier | Înălțime | De ce acolo |
|---|---|---|---|
| Footer, lângă badge-urile ANPC | `src/components/layout/Footer.tsx` | 48 px | vizibil pe orice pagină, aliniat cu celelalte însemne oficiale |
| Sumarul comenzii, sub butonul de plată | `src/components/checkout/OrderSummaryCard.tsx` | 40 px | răspunde la „cine îmi ia datele de card?" exact când omul întreabă |

Componenta e `src/components/ui/NetopiaBadge.tsx`. Prop-ul `tone` **nu are default**,
intenționat: varianta se alege după culoarea fundalului, iar un default ar ascunde decizia.

Regulile de marcă (ce e interzis, cum se alege varianta, de ce `unoptimized`) stau în
**`public/netopia/NOTICE.txt`**, alături de assets — citește-l înainte să modifici randarea.
Pe scurt: se scalează proporțional și atât; fără recolorare, rotire, decupare sau filtre CSS.
Aria de siguranță e deja în pânza PNG-urilor, nu mai adăuga padding.

Assets-urile sunt copiate bit-cu-bit din kitul oficial pentru parteneri
(<https://netopia-payments.com/brand/>). Nu folosim scriptul de badge găzduit de Netopia:
ar fi un script terț pe toate paginile, contra CSP-ului (`img-src 'self'`) și a politicii
„third-party = consent-gated + lazy" (CLAUDE.md §3.9).

## Teste

- `tests/unit/payments/netopia-provider.test.ts` — construirea cererii de start, URL-uri
  sandbox/live, parsare răspuns, erori.
- `tests/unit/payments/netopia-ipn.test.ts` — verificarea JWT-ului IPN (semnătură,
  issuer, audiență, expirare, hash-ul payload-ului) cu chei RSA generate în test.
- Fluxul de checkout end-to-end rămâne acoperit de `tests/int/checkout.int.spec.ts`
  (provider mock, aceeași orchestrare).
