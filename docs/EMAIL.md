# Email — Brevo, expeditori, DNS

Sursa de adevăr pentru „de pe ce adresă pleacă fiecare email". Codul din `src/lib/email/`
e vendor-agnostic (`Mailer` e interfață); Brevo e implementarea curentă.

---

## 1. Cine trimite ce

Categoria se alege în cod (`SenderKind` din `src/lib/email/senders.ts`), adresa vine din env.

| # | Sursă | Categorie | Către | Reply-To |
|---|---|---|---|---|
| 1 | `hooks/sendOrderReceivedEmail.ts` | `transactional` | cumpărător | `BREVO_REPLY_TO_EMAIL` |
| 2 | `hooks/sendOrderConfirmationEmail.ts` | `transactional` | cumpărător | `BREVO_REPLY_TO_EMAIL` |
| 3 | `hooks/sendEventRegistrationEmails.ts` (confirmare) | `transactional` | participant | `BREVO_REPLY_TO_EMAIL` |
| 4 | `hooks/sendEventRegistrationEmails.ts` (notificare) | **`notification`** | `siteSettings.contact.email` | `BREVO_REPLY_TO_EMAIL` |
| 5 | `hooks/sendLeadNotificationEmail.ts` | **`notification`** | `siteSettings.contact.email` | **emailul lead-ului** |
| 6 | `blog/deliverLeadMagnet.ts` | `transactional` | abonat | `BREVO_REPLY_TO_EMAIL` |
| 7 | `reviews/sendReviewRequests.ts` | `transactional` | participanți | `BREVO_REPLY_TO_EMAIL` |
| 8 | `payloadAdapter.ts` (reset parolă admin) | `transactional` | admin | `BREVO_REPLY_TO_EMAIL` |
| 9 | `hooks/sendNewsletterCampaign.ts` | **`newsletter`** | lista de abonați | `BREVO_REPLY_TO_EMAIL` |
| 10 | `hooks/broadcastNewPostOnPublish.ts` | **`newsletter`** | lista de abonați | `BREVO_REPLY_TO_EMAIL` |
| 11 | `api/newsletter` (confirmare abonare) | `transactional` | abonat nou | `BREVO_REPLY_TO_NEWSLETTER_EMAIL` → `BREVO_SENDER_EMAIL` |
| 12 | „You're subscribed" (bun-venit) | **trimis de Brevo**, nu de noi | abonat confirmat | — |

**De ce separate:** reputația de expeditor se acumulează per adresă. Newsletterul strânge
inevitabil marcaje „spam"; dacă pleacă de pe aceeași adresă ca și confirmările de plată,
degradează livrabilitatea exact acolo unde doare — omul a plătit și nu primește chitanța.

### Double opt-in — implementat de noi, NU de Brevo

**Istoric, ca să nu se reîncerce drumul greșit (2026-08-06).** Fluxul folosea
`POST /contacts/doubleOptinConfirmation`. În producție răspundea invariabil
`400 invalid_parameter: "An active DOI template does not exist"`, deși template-urile
existau, erau active și conțineau `{{ doubleoptin }}`. Cauza: Brevo ține template-urile DOI
într-un **registru separat**, alimentat doar prin Contacts → Forms; cele create prin API-ul
de template-uri ajung în registrul *tranzacțional*, iar endpoint-ul DOI nu se uită acolo.
API-ul de creare nu are niciun parametru prin care să marchezi un template ca DOI, deci
fluxul nu era reparabil din cod. **Nu reintroduce `subscribeDoubleOptIn` fără să retestezi
ipoteza asta** — metoda a rămas în interfața `Mailer` doar pentru un provider viitor.

Fluxul curent, două rute, fără nicio dependență de funcția DOI:

1. `POST /api/newsletter` — validează, semnează un token HMAC-SHA256 cu adresa, limba și o
   expirare de 48h (`src/lib/newsletter/confirmToken.ts`), și trimite emailul de confirmare
   ca **email tranzacțional obișnuit**, de pe `no-reply@isad.academy` (owner 2026-08-07:
   confirmarea e declanșată de o acțiune punctuală, nu e campanie; `news@` rămâne pentru
   broadcasturi). Template bilingv: `src/lib/email/templates/newsletterConfirm.ts`.
   **Compromis asumat:** emailul ajunge și la adrese tastate greșit, iar un „Spam" de acolo
   atinge adresa de pe care pleacă și chitanțele. Dacă rata de plângeri crește, mută-l înapoi
   pe categoria `newsletter` — o singură linie în rută.
2. `GET /api/newsletter/confirm?token=…` — verifică semnătura (comparație în timp constant)
   și expirarea, apoi cheamă `addToNewsletterList` → `POST /contacts` cu
   `updateEnabled: true` (idempotent: dublu-click nu e eroare). Redirect 303 către
   `/newsletter/confirmed`, în limba din token.

**Adresa nu e scrisă nicăieri până la click** — nici la noi, nici în Brevo. Trăiește doar
semnată, în linkul din email. Nu există abonări în așteptare de curățat, iar site-ul nu poate
fi folosit ca depozit de adrese.

Tokenul se semnează cu `NEWSLETTER_TOKEN_SECRET`, cu fallback pe `PAYLOAD_SECRET` — anume ca
abonarea să nu depindă de încă o variabilă pe care cineva ar uita s-o pună pe server. Fără
niciun secret, ruta răspunde 500 în loc să trimită un link neverificabil.

Pagina de confirmare tratează trei stări pe aceeași adresă: confirmat, `?status=invalid`
(link expirat/cârpit — text neutru, ca pagina să nu devină un oracol de adrese) și
`?status=failed` (consimțământ dovedit, dar providerul a refuzat).

Redirectul după confirmare respectă limba: EN → `/newsletter/confirmed`, RO →
`/ro/newsletter/confirmed`. Limba vine din formular (`POST /api/newsletter { email, locale }`);
o valoare necunoscută cade pe EN, niciodată 400 — un `locale` greșit nu are voie să piardă un
abonat real.

### Emailul de bun-venit — îl trimite Brevo

„You're subscribed" pleacă dintr-o **Automation** Brevo (trigger: *contact added to list*),
nu din codul nostru: Brevo redirecționează browserul care confirmă fără să spună serverului
cine a confirmat, deci n-avem eveniment pe care să agățăm trimiterea.

Copy-ul rămâne în `src/lib/email/templates/newsletterWelcome.ts` (sursa de adevăr), iar HTML-ul
lipit în Brevo se generează din el în `docs/email-templates/newsletter-welcome.html`. Dacă
schimbi textul, regenerează fișierul și re-lipește-l în template-ul Brevo — comanda e în
comentariul din capul modulului.

---

## 2. Variabile de mediu

```
BREVO_API_KEY=                      # gol → NoopMailer (dev: logează, nu trimite)
BREVO_SENDER_EMAIL=                 # no-reply@isad.academy — transactional + FALLBACK global
BREVO_SENDER_NAME=                  # isad.academy (brandul e mereu lowercase)
BREVO_SENDER_NEWSLETTER_EMAIL=      # news@isad.academy
BREVO_SENDER_NEWSLETTER_NAME=
BREVO_SENDER_NOTIFICATION_EMAIL=    # gol la lansare → cade pe BREVO_SENDER_EMAIL
BREVO_SENDER_NOTIFICATION_NAME=
BREVO_REPLY_TO_EMAIL=               # contact@isad.academy — inbox monitorizat
BREVO_NEWSLETTER_LIST_ID=
BREVO_DOI_TEMPLATE_ID=              # EN (canonic). Gol → abonarea răspunde cu eroare
BREVO_DOI_TEMPLATE_ID_RO=           # RO. Gol → românii primesc emailul EN
```

**Valorile din contul curent (2026-08-05):** listă `5` („Newsletter"), template DOI EN `4`,
template DOI RO `1`. Senderi verificați: `no-reply@`, `news@`, `contact@`.

**Lanțul de fallback** (`pickSender`): adresa specifică categoriei → `BREVO_SENDER_EMAIL`.
Un șir gol înseamnă „neconfigurat", nu „adresă goală" — o categorie nesetată nu poate produce
un expeditor vid (Brevo ar respinge trimiterea cu 400).

Categoria `notification` e **intenționat nesetată** la lansare. Dacă alertele interne trebuie
vreodată să plece de pe adresa lor, se setează o variabilă — zero cod (CLAUDE.md §15).

Adresele trebuie să existe ca **senderi verificați** în Brevo → *Senders, Domains & Dedicated
IPs* → *Senders*. Când domeniul e autentificat, orice adresă de pe el se validează automat.

---

## 3. DNS (isad.academy) — configurat 2026-08-05

Zona e la Hosterion (`ns1/ns2.hosterion.com`), editabilă din cPanel → **Zone Editor**.

| Name | Type | Valoare | Rol |
|---|---|---|---|
| `isad.academy` | TXT | `brevo-code:…` | verificare proprietate |
| `brevo1._domainkey` | CNAME | `b1.isad-academy.dkim.brevo.com.` | DKIM |
| `brevo2._domainkey` | CNAME | `b2.isad-academy.dkim.brevo.com.` | DKIM |
| `_dmarc` | TXT | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` | politică + rapoarte |
| `em` | CNAME | `em-isad-academy.brand.brevosend.com.` | linkuri brand-uite |
| `r.em` | CNAME | `em-isad-academy.r.brand.brevosend.com.` | redirect tracking |
| `img.em` | CNAME | `em-isad-academy.img.brand.brevosend.com.` | pixel + imagini |

### ⚠️ De ce `em` și nu `mail`

Default-ul Brevo pentru branding e `mail`, dar `mail.isad.academy` e **deja** serverul de mail
al domeniului (are A record și e ținta MX-ului). Un CNAME nu poate coexista cu un A pe același
nume (RFC 1034), iar un MX nu are voie să arate către un CNAME (RFC 2181 §10.3) — ar fi rupt
tot mailul de pe domeniu. Subdomeniul de branding a fost schimbat în Brevo la `em`.
**Nu muta branding-ul înapoi pe `mail`.**

### Alte capcane

- **`default._domainkey` NU e Brevo** — e cheia DKIM generată de cPanel pentru Exim. Coexistă
  cu cele Brevo (selectoare diferite). Nu o șterge.
- **Un singur record `_dmarc`.** Două → serverele destinatar ignoră DMARC-ul complet
  (RFC 7489 §6.6.3).
- **Nu apăsa „Repair" în cPanel → Email Deliverability.** Rescrie SPF/DKIM/DMARC la
  șabloanele cPanel și șterge `rua=…` din DMARC. Modifică doar din Zone Editor.
- **SPF nu e cerut de Brevo** pe setup-ul cu DKIM CNAME (alinierea DMARC vine din DKIM).
  Dacă totuși se adaugă `include:spf.brevo.com`, se **editează** recordul existent — un domeniu
  poate avea un singur `v=spf1`.

### Escaladarea DMARC

`p=none` acum. După ~2 săptămâni de rapoarte curate → `p=quarantine`, apoi `p=reject`.
Nu sări direct la `reject`: orice flux nealiniat începe să fie **refuzat**, nu doar marcat.

---

## 4. Verificare

```bash
dig +short TXT isad.academy | grep brevo
dig TXT brevo1._domainkey.isad.academy @8.8.8.8 +short   # trebuie să ajungă la k=rsa;p=…
dig +short TXT _dmarc.isad.academy
```

După o trimitere reală, în emailul primit → „Show original":
```
Authentication-Results: spf=pass  dkim=pass  dmarc=pass
```

---

## 5. MCP Brevo (unelte pentru agentul de cod)

`.mcp.json` din rădăcină înregistrează serverul MCP oficial Brevo, ca un agent să poată citi
și modifica direct contul (liste, template-uri, senderi) fără `curl`.

**Tokenul NU stă în fișier** — repo-ul e public. `.mcp.json` referențiază `${BREVO_MCP_TOKEN}`,
care se expandează din mediul shell-ului. Fiecare dezvoltator îl pune la el:

```bash
# în ~/.zshrc (sau ~/.bashrc), apoi redeschizi terminalul
export BREVO_MCP_TOKEN='<tokenul MCP din Brevo>'
```

Tokenul se generează în Brevo → **Account → SMTP & API → API Keys** → *Generate a new API key*,
cu comutatorul **„Create MCP server API key"** activat. E distinct de `BREVO_API_KEY` (aceea e
cheia pe care o folosește aplicația în runtime, din `.env`).

Serverul MCP se încarcă doar la pornirea unei sesiuni noi de Claude Code.

---

## 6. De făcut

- **Double opt-in** (HANDOFF.md TODO #2) — `BREVO_DOI_TEMPLATE_ID` e încă gol; fără el
  abonarea răspunde cu „not configured". Template-ul se creează în Brevo, cu sender `news@`.
- **Planul Brevo** — verifică limita zilnică înainte de primul broadcast real.
