# RUNNING.md — rulare locală isad.academy

Ghid complet pentru a rula site-ul local, cu tot cu baza de date (Docker) și conținutul actual. Stack: **Next.js 15 + Payload CMS 3 + Postgres** (Postgres rulează în Docker; aplicația rulează direct cu npm — nu este containerizată).

---

## 1. Cerințe preliminare

| Ce | Versiune | Note |
|---|---|---|
| **Node.js** | 22 (vezi `.nvmrc`) | minim `^18.20.2 \|\| >=20.9.0` (câmpul `engines` din `package.json`); cu nvm: `nvm use` |
| **npm** | vine cu Node | proiectul folosește `package-lock.json` |
| **Docker Desktop** | orice versiune recentă | doar pentru Postgres (`docker-compose.yml`) |

---

## 2. Pornește baza de date (Docker)

Din rădăcina proiectului:

```bash
docker compose up -d
```

Asta pornește containerul **`isad-postgres`** (imagine `postgres:17-alpine`) pe portul **5432**, cu:

- database: `isad`
- user / parolă: `postgres` / `postgres`
- datele persistă în volumul Docker **`pgdata`** (supraviețuiesc restartului de container și de mașină)

Verifică starea (healthcheck-ul rulează `pg_isready`):

```bash
docker compose ps        # STATUS trebuie să fie "healthy"
docker compose logs -f postgres   # dacă ceva nu merge
```

> **Port 5432 ocupat?** Ai deja un Postgres local pornit. Fie îl oprești, fie schimbi maparea în `docker-compose.yml` (ex. `'5433:5432'`) și actualizezi portul în `DATABASE_URI` din `.env`.

---

## 3. Variabile de mediu

```bash
cp .env.example .env
```

Apoi în `.env`:

- **`DATABASE_URI`** — valoarea default din `.env.example` se potrivește exact cu containerul Docker de mai sus: `postgres://postgres:postgres@localhost:5432/isad`. Nu trebuie schimbată.
- **`PAYLOAD_SECRET`** — obligatoriu; generează unul: `openssl rand -hex 32`
- **`CRON_SECRET`** — la fel: `openssl rand -hex 32`
- **`NEXT_PUBLIC_SITE_URL`** — lasă `http://localhost:3000`
- **`BREVO_*`** — lasă goale local: fără `BREVO_API_KEY`, aplicația folosește automat `NoopMailer` (emailurile sunt no-op, nimic nu pleacă real)
- **`PAYMENT_PROVIDER=mock`** — lasă așa; `MockProvider` confirmă plățile automat în dev (fără bani reali)
- **`ALLOW_MOCK_PAYMENTS`** — lasă gol (e doar pentru staging; niciodată în producție)
- Restul (`NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_GTM_ID`, `SMARTBILL_*`) — opționale, pot rămâne goale

---

## 4. Instalare și pornire

```bash
npm install
npm run dev
```

Site-ul: **http://localhost:3000** · Admin Payload: **http://localhost:3000/admin**

Note importante:

- **Schema DB se creează automat.** Proiectul nu folosește migrații — în dev, adapterul Postgres al Payload sincronizează schema automat (push mode) la prima inițializare. Pe o bază goală, `npm run dev` (sau direct `npm run seed`) creează toate tabelele.
- **Primul user de admin** nu este seedat. La prima vizită pe `/admin`, Payload afișează formularul „Create first user" — creează-ți contul acolo (e doar local, în DB-ul tău).
- Ruta RO a site-ului e sub prefixul `/ro` (ex. `http://localhost:3000/ro`); EN e la URL-urile fără prefix.

---

## 5. Conținutul site-ului

Conținutul „actual" trăiește în **două locuri**, ambele în afara git-ului:

1. **Baza de date Postgres** — volumul Docker `pgdata` (colecții, globals, comenzi, pagini legale etc.)
2. **Folderul `media/`** din rădăcina proiectului — fișierele uploadate în Payload (imagini, PDF-uri); e în `.gitignore`

### 5a. Ești pe mașina pe care s-a lucrat deja

Nu ai nimic de făcut: volumul `pgdata` și folderul `media/` există deja. `docker compose up -d` + `npm run dev` și totul e acolo.

### 5b. Populare de la zero (mașină nouă, fără dump)

Scripturile de conținut reproduc starea actuală a site-ului. Rulează-le **în această ordine** (toate sunt idempotente / re-rulabile în siguranță):

```bash
# 1. Seed de bază: cursuri placeholder, globals (homepage, expertBio, certificationInfo,
#    siteSettings), reviews, partners, discount codes, blog posts (EN+RO), FAQ legacy, media placeholder
npm run seed

# 2. Înlocuiește cursurile placeholder cu cele 4 cursuri de lansare
#    (PECB ISO/IEC 42001 Foundation / Lead Implementer / Lead Auditor + AI Governance & Responsible AI)
npx tsx scripts/replace-courses.ts

# 3. Adaugă câte o ediție (courseSession) demo fiecărui curs de lansare
#    (prețuri/date placeholder; una e aproape sold-out ca să demonstreze chip-ul "X seats left")
npx tsx scripts/seed-sample-sessions.ts

# 4. Înlocuiește FAQ-ul legacy cu cele 12 întrebări finale, pe categorii
npx tsx scripts/seed-faq.ts

# 5. Scrie conținutul legal REAL (cookies / privacy / terms, EN+RO, din .docx-urile clientului)
npx tsx scripts/update-legal.ts
```

> Toate scripturile citesc `DATABASE_URI` din `.env`, deci Postgres-ul din Docker trebuie să fie pornit. `tsx` e disponibil în `node_modules/.bin` după `npm install` — nu trebuie instalat global.

### 5c. Transfer 1:1 al conținutului actual pe altă mașină

Dacă vrei **exact** conținutul curent (inclusiv modificările făcute din dashboard după seed), transferă DB-ul + media:

**Pe mașina sursă:**

```bash
# dump-ul bazei de date din container
docker exec isad-postgres pg_dump -U postgres -d isad > isad-dump.sql
# arhivează uploadurile
tar -czf isad-media.tar.gz media/
```

**Pe mașina destinație** (după pașii 1–4, cu Docker pornit, dar ÎNAINTE de seed — DB-ul trebuie să fie gol):

```bash
# restaurează dump-ul
docker exec -i isad-postgres psql -U postgres -d isad < isad-dump.sql
# dezarhivează uploadurile în rădăcina proiectului
tar -xzf isad-media.tar.gz
```

Apoi `npm run dev`. **Nu** mai rula scripturile de seed peste un dump restaurat — nu e necesar (sunt idempotente, dar dump-ul e deja starea completă).

---

## 6. Build de producție (local)

```bash
npm run build
npm run start    # servește build-ul pe http://localhost:3000
```

Necesită același `.env` și Postgres-ul pornit. În producția reală (Vercel), joburile programate sunt declanșate de Vercel Cron (`vercel.json`).

---

## 7. Joburi programate (local)

Jobul zilnic de review-requests (trimite linkul de review participanților după încheierea unei ediții) nu rulează automat local. Îl declanșezi manual:

```bash
npm run jobs:run
```

Cu `BREVO_API_KEY` gol, emailurile trec prin `NoopMailer` (doar log, nimic trimis).

---

## 8. Teste

```bash
npm run test        # unit (vitest, tests/unit) — nu are nevoie de DB
npm run test:int    # integrare (tests/int) — își creează singur DB-ul throwaway `isad_test`
                    #   pe același Postgres din Docker; NU atinge DB-ul `isad`
npm run test:e2e    # Playwright (tests/e2e) — pornește singur `npm run dev` dacă nu rulează
```

⚠️ **E2E rulează pe DB-ul dev real (`isad`), cu conținutul seedat ca baseline** — unele spec-uri creează comenzi confirmate reale și consumă locuri. Rulează-le doar peste conținutul din pasul 5b; dacă ții la starea curentă a DB-ului local, fă întâi un dump (5c). Pentru Playwright, la prima rulare: `npx playwright install chromium`.

---

## 9. Comenzi utile

```bash
# Docker
docker compose stop            # oprește Postgres (datele rămân în volum)
docker compose down            # oprește + șterge containerul (datele rămân în volum)
docker compose down -v         # ⚠️ ȘTERGE și volumul pgdata = pierzi tot conținutul DB
docker exec -it isad-postgres psql -U postgres -d isad   # consolă SQL directă

# Payload
npm run generate:types         # regenerează src/payload-types.ts după schimbări de schemă
npm run generate:importmap     # regenerează import map-ul pentru componentele custom de admin
npm run lint && npm run typecheck
```

---

## 10. Troubleshooting

- **`ECONNREFUSED` la pornire / seed** → Postgres nu rulează sau nu e healthy încă: `docker compose ps`, apoi `docker compose up -d`.
- **`/admin` cere login dar nu ai user** → pe DB proaspăt apare formularul „Create first user"; dacă ai restaurat un dump, userii din dump sunt valabili (parolele de pe mașina sursă).
- **Erori `sharp` la `npm install`** (procesare imagini) → asigură-te că ești pe Node 22 (`nvm use`) și reia `npm install`.
- **Conflicte de schemă după `git pull`** → în dev schema se sincronizează automat la următorul `npm run dev`; rulează și `npm run generate:types` dacă s-au schimbat colecțiile.
- **Emailurile „nu pleacă"** → comportament corect local: fără `BREVO_API_KEY` se folosește `NoopMailer`.
