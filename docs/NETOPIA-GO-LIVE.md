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

### Formularul real (văzut 2026-08-14)

Formularul are doar 4 câmpuri:

- **URL de testare*** → `https://isad.academy/courses`
- **Nume utilizator / Parolă cont client** → GOALE (checkout ca vizitator, fără conturi)
- **Comentarii** → un bloc liber; se lipesc acolo datele esențiale din tabelul de mai jos:
  tip integrare (Node.js custom, Payments API v2, hosted page), URL IPN + retur, fluxul de
  testare pas cu pas, mențiunea că site-ul e pe sandbox (carduri de test), monedele RON/EUR,
  sigla NETOPIA în footer + checkout, paginile legale + entitatea, contact tehnic.

### Răspunsuri pregătite (referință completă)

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

## Feedback-ul verificării Netopia (2026-08-15) — rezolvat

Echipa Netopia a testat notifyURL-ul și a raportat două probleme:

1. `IDS_Model_Purchase_Sms_Online_INVALID_RESPONSE_STATUS` — notifyURL răspundea cu alt
   status decât 200 (noi dădeam 4xx la respingeri). **Fix (cod):** toate răspunsurile
   tratate sunt acum `200` cu `{"errorCode": 0}` la succes / `errorCode ≠ 0` la respingere;
   non-2xx doar pentru config lipsă (503) și erori reale (500), unde retry-ul Netopia ajută.
2. „Verification token signature is invalid" — tokenul lor de test e semnat cu **altă
   cheie** decât certificatul de sandbox din env. **Fix (cod):** `NETOPIA_PUBLIC_KEY`
   acceptă acum mai multe blocuri PEM concatenate (oricare validează); `aud` acceptă și
   semnături alternative prin `NETOPIA_POS_SIGNATURE_ALT` (ex. semnătura live, cât timp
   plățile rulează pe sandbox).

**Env de actualizat în cPanel înainte de retestarea lor** (site-ul rămâne pe sandbox):

- `NETOPIA_PUBLIC_KEY` → base64( certificatul de sandbox EXISTENT + cheia de mai jos, concatenate )
- `NETOPIA_POS_SIGNATURE_ALT` → semnătura live din fereastra „Setări tehnice" (`3H5P-21UR-5OQN-XOQA-CXL1`)

Cheia publică trimisă de suportul Netopia în emailul de verificare (nu e secret):

```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAy6pUDAFLVul4y499gz1P
gGSvTSc82U3/ih3e5FDUs/F0Jvfzc4cew8TrBDrw7Y+AYZS37D2i+Xi5nYpzQpu7
ryS4W+qvgAA1SEjiU1Sk2a4+A1HeH+vfZo0gDrIYTh2NSAQnDSDxk5T475ukSSwX
L9tYwO6CpdAv3BtpMT5YhyS3ipgPEnGIQKXjh8GMgLSmRFbgoCTRWlCvu7XOg94N
fS8l4it2qrEldU8VEdfPDfFLlxl3lUoLEmCncCjmF1wRVtk4cNu+WtWQ4mBgxpt0
tX2aJkqp4PV3o5kI4bqHq/MS7HVJ7yxtj/p8kawlVYipGsQj3ypgltQ3bnYV/LRq
8QIDAQAB
-----END PUBLIC KEY-----
```

## Pasul 2 — după aprobare: comutarea producției pe live

1. Silviu ia din admin-ul live **cheile LIVE** (cele de sandbox NU merg pe live):
   - **POS signature + certificatul public**: Puncte de vânzare → „implementarea tehnica" →
     fereastra **Setări tehnice** — câmpul „Semnătură" (buton de copiere) și „Cheie publică"
     (buton Descarcă). Confirmat 2026-08-14: fereastra le afișează deja, chiar înainte de
     aprobare. Atenție: fereastra avertizează explicit că aceste certificate NU sunt
     compatibile cu mediul de test — nu le pune în cPanel cât timp `NETOPIA_SANDBOX=true`.
   - **API key**: din secțiunea de securitate a contului live (același loc ca în „Mediu de
     testare", dar pe contul live). „Cheia privată" din fereastră NU se folosește — integrarea
     noastră (API v2) are nevoie doar de API key + signature + certificatul public.
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
