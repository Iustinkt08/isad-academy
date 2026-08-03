# Recuperare 503 — isad.academy (incident 29–31 iulie 2026)

> **Pe scurt:** deploy-ul din 29 iulie a urcat un build cu o migrație ruptă
> (`ALTER TABLE "event_popup" DROP COLUMN` pe un tabel care nu există în producție).
> Cu `RUN_MIGRATIONS=true`, migrația rulează la pornire → procesul moare → Passenger
> dă 503/timeout pe tot site-ul, inclusiv `/admin`. Fix-ul de cod există pe `main`
> (commit `dfc817c`), dar **nu poate ajunge pe server prin GitHub Actions**: firewall-ul
> Hosterion închide conexiunile SSH de la runnerii GitHub („Connection closed by remote
> host" — 5 rulări eșuate la rând la pasul de snapshot, ultima pe 31 iulie).
>
> **Soluția de mai jos NU are nevoie de SSH sau de deploy**: repară direct baza de date
> prin cPanel, astfel încât build-ul care e DEJA pe server (cu Netopia sandbox + Brevo +
> popup + noul design) să pornească curat. A fost validată local pe o bază care
> reproduce producția, în ambele scenarii: bundle-ul vechi (cel de pe server) și
> bundle-ul nou (următorul deploy).

---

## Pasul 1 — (opțional, 2 min) Confirmă diagnosticul din loguri

cPanel → **Setup Node.js App** → aplicația `isad` → deschide fișierul de log
(sau prin **File Manager**: `~/apps/isad/stderr.log`). Cauți la coadă:

```
relation "event_popup" does not exist
```

Dacă vezi altceva (de ex. erori de conexiune la Postgres), oprește-te și trimite
logul — cauza e alta și pașii de mai jos nu o acoperă.

## Pasul 2 — Rulează SQL-ul de recuperare (5 min)

Fișierul: **`scripts/recovery-503.sql`** din repo. Ce face:

1. creează cele 7 tabele lipsă (`event_popup`, `event_popup_locales`,
   `event_popup_speakers`, `event_popup_speakers_locales`, `event_popup_occupations`,
   `event_registrations`, `newsletters`) + coloanele, indexurile și FK-urile aferente —
   copie fidelă a migrației verificate `20260730_010559_event_popup_and_newsletters`;
2. înscrie în `payload_migrations` numele TUTUROR migrațiilor cunoscute (cele două
   vechi rupte + cea nouă din fix), ca la pornire Payload să nu mai ruleze nimic —
   nici acum, nici la următorul deploy.

Este **idempotent** (poate fi rulat de mai multe ori fără nicio problemă) și rulează
totul într-o singură tranzacție.

**Varianta A — cPanel → Terminal** (dacă e disponibil):

1. Urcă `scripts/recovery-503.sql` în home (`~`) prin **File Manager** (Upload).
2. În **Terminal**:

   ```bash
   psql 'postgres://USER:PAROLA@localhost:5432/NUMELE_DB' -f ~/recovery-503.sql
   ```

   Folosește exact `DATABASE_URI`-ul aplicației (îl vezi în Setup Node.js App →
   Environment variables). La final trebuie să vezi `COMMIT` fără erori.

**Varianta B — phpPgAdmin** (dacă nu există Terminal):

cPanel → **phpPgAdmin** → selectează baza aplicației → tab **SQL** → lipește
conținutul fișierului `scripts/recovery-503.sql` → Execute.

**Verificare** (aceeași fereastră SQL):

```sql
SELECT name, batch FROM payload_migrations ORDER BY id;
```

Trebuie să apară 4 rânduri, ultimul fiind `20260730_010559_event_popup_and_newsletters`.

## Pasul 3 — Repornește aplicația (2 min)

cPanel → **Setup Node.js App** → aplicația `isad` → **Stop App**, apoi **Start App**.

> Stop + Start, nu doar Restart: site-ul atârnă de ~2 zile în timeout, deci pot exista
> procese Node blocate care țin cereri în coadă și conexiuni la Postgres. Stop-ul le
> omoară pe toate. Dacă butonul pare fără efect, în Terminal: `pkill -f server.js`
> apoi Start din cPanel.

Apoi verifică:

- `https://isad.academy/` → se încarcă (prima cerere poate dura ~10–20 s, boot la rece);
- `https://isad.academy/admin` → login-ul se încarcă;
- o pagină de curs + `/ro` → OK.

Dacă tot nu răspunde după 2–3 minute: recitește coada lui `stderr.log` și trimite
ultimele ~40 de linii.

## Pasul 4 — Variabilele pentru integrările de TEST (demo client)

Site-ul pornește indiferent de aceste variabile (lipsa lor nu mai poate provoca 503 —
codul citește env-ul la momentul folosirii, nu la pornire). Dar pentru **demo-ul cu
plăți sandbox + emailuri reale** trebuie să existe în cPanel → Setup Node.js App →
**Environment variables** (valorile de test sunt în `.env`-ul local al proiectului —
NU le comitem în repo):

| Variabilă | Valoare pentru demo |
|---|---|
| `PAYMENT_PROVIDER` | `netopia` |
| `NETOPIA_API_KEY` | cheia de **sandbox** (din `.env` local) |
| `NETOPIA_POS_SIGNATURE` | semnătura de **sandbox** (din `.env` local) |
| `NETOPIA_SANDBOX` | `true` |
| `NETOPIA_PUBLIC_KEY` | certificatul base64 de **sandbox** (din `.env` local) |
| `BREVO_API_KEY` | cheia Brevo (din `.env` local) |
| `BREVO_NEWSLETTER_LIST_ID` | `2` |
| `BREVO_SENDER_EMAIL` | expeditorul verificat în Brevo |
| `BREVO_SENDER_NAME` | `isad.academy` |
| `BREVO_DOI_TEMPLATE_ID` | ID-ul template-ului de double opt-in din Brevo — **e gol și în `.env`-ul local**; fără el emailurile tranzacționale merg, dar abonarea la newsletter răspunde cu eroare („not configured"). Creează template-ul DOI în Brevo (Campaigns → Templates) și pune ID-ul aici dacă vrei să demonstrezi și newsletter-ul. |

Plus cele care există deja și NU se ating: `DATABASE_URI`, `PAYLOAD_SECRET`,
`NEXT_PUBLIC_SITE_URL=https://isad.academy`, `CRON_SECRET`, `RUN_MIGRATIONS=true`.
`ALLOW_MOCK_PAYMENTS` nu trebuie să existe. După orice modificare de env: **Restart**.

**Demo checkout sandbox:** card de test Netopia `9900004810225098`, orice expirare
viitoare, CVV `111`. Nu se mișcă bani reali; comanda apare în `/admin` → Orders, iar
locurile se decrementează la confirmare.

## Pasul 5 — Trecerea pe LIVE (mai târziu, când semnează clientul)

În cPanel → Environment variables, înlocuiește DOAR:

1. `NETOPIA_API_KEY`, `NETOPIA_POS_SIGNATURE`, `NETOPIA_PUBLIC_KEY` → cheile **live**
   din admin.netopia-payments.com (contul de producție, după aprobarea comerciantului);
2. `NETOPIA_SANDBOX` → **exact** `false` (orice altă valoare = rămâne sandbox);
3. verifică în Brevo că expeditorul e pe domeniul real (SPF/DKIM configurate).

Apoi Restart + o plată reală de 1 RON ca test final.

## Deploy-urile viitoare, cât timp firewall-ul blochează GitHub Actions

Push-ul pe `main` va continua să declanșeze workflow-ul, care **eșuează la pasul de
snapshot** (SSH tăiat de Hosterion) — zgomotos, dar inofensiv: nu atinge serverul.
Până se rezolvă, ai trei căi:

1. **`scripts/deploy-cpanel.sh`** de pe o mașină cu cheie SSH acceptată de server
   (face tot: snapshot → build → sharp linux → upload → restart → verificare);
2. **cere la Hosterion** să nu mai taie SSH-ul venit de la GitHub Actions (e probabil
   cPHulk / fail2ban; IP-urile runnerilor sunt publicate la `api.github.com/meta`) —
   după asta deploy-ul redevine „push pe main și gata";
3. **manual prin cPanel**, fără SSH: Terminal → `pg_dump` → descarci `prod.sql` din
   File Manager → build local din snapshot (vezi DEPLOY-CPANEL.md §3) → urci
   `bundle.tar.gz` prin File Manager → Terminal: extract + `touch tmp/restart.txt`.

## De ce e sigură recuperarea

- DDL-ul e **copia exactă** a migrației din fix-ul `dfc817c`, care la rândul ei a fost
  generată cu unealta Payload din starea reală a producției și verificată local;
- scriptul e idempotent și tranzacțional — nu poate lăsa baza „pe jumătate";
- a fost validat pe o bază locală adusă EXACT în starea producției (doar migrația
  inițială aplicată), după care boot-ul de producție (`NODE_ENV=production` +
  `RUN_MIGRATIONS=true`) a fost testat cu AMBELE liste de migrații — cea din bundle-ul
  vechi (de pe server) și cea din bundle-ul nou: în ambele cazuri pornirea e no-op,
  aplicația boot-ează și interogările pe tabelele noi funcționează;
- nu șterge și nu modifică NIMIC din datele existente — doar adaugă tabele goale și
  rânduri în `payload_migrations`.
