# Deploy pe cPanel (LiteSpeed + Node.js App) — isad.academy

> Precondiție UNICĂ de verificat la host: în cPanel există **„Setup Node.js App"**
> (CloudLinux/Passenger) cu **Node ≥ 20** în dropdown. Fără ea, aplicația nu poate rula
> pe acest plan — alternativa: DNS/email pe cPanel + aplicația pe Vercel.

## 1. Baza de date (o singură dată)

1. cPanel → **PostgreSQL Databases**: creează DB `isad_prod` + user + parolă; asociază-le.
2. Notează `DATABASE_URI`: `postgres://USER:PAROLA@localhost:5432/NUME_DB`.
3. Nu rula nimic manual în DB — **migrațiile rulează automat la prima pornire**
   (`prodMigrations` în `src/payload.config.ts`; schema vine din `src/migrations/`).

## 2. Aplicația Node (o singură dată)

1. cPanel → **Setup Node.js App** → Create:
   - Node version: **24.18 (recomandat de host)** sau 22.x — ambele OK pentru Next 15;
     Application mode: **Production**;
   - Application root: `~/apps/isad` (sau ce alegi); Application URL: `isad.academy`;
   - **Startup file: `server.js`** (vine din bundle-ul standalone).
2. În secțiunea de **Environment variables** a aplicației:
   - `DATABASE_URI` = (pasul 1)
   - `PAYLOAD_SECRET` = secret NOU, lung, generat pentru producție (NU cel din dev!)
   - `NEXT_PUBLIC_SITE_URL` = `https://isad.academy`
   - `BREVO_API_KEY`, `BREVO_NEWSLETTER_LIST_ID` = din contul Brevo
   - `PAYMENT_PROVIDER` = `mock` (până la semnarea procesatorului)
   - `CRON_SECRET` = secret NOU (folosit de cron-ul de review-uri, pasul 5)
   - `RUN_MIGRATIONS` = `true` — pornește aplicarea automată a migrațiilor la boot
     (doar pe server; NU seta local — build-ul local rulează fără migrații)

## 3. Build local + upload (la FIECARE release)

> **Deploy-ul automat din GitHub Actions NU funcționează (2026-07-30).** Firewall-ul
> Hosterion blochează SSH-ul de la runnerii GitHub, care au IP-uri rotative: `npm ci` și
> testele trec, dar pasul de snapshot al DB-ului atârnă și rularea cade fără să atingă
> serverul. Până se rezolvă pe partea de hosting, releaseul se face de pe o mașină cu IP
> stabil, în una din cele două variante de mai jos.
>
> **Varianta scurtă — `scripts/deploy-cpanel.sh`** face automat toți pașii din această
> secțiune (snapshot DB producție → build → binare `sharp` pentru Linux → upload → restart →
> verificare), și se oprește ÎNAINTE de a atinge serverul dacă ceva nu e în regulă.
> Cere Docker pornit (Postgres local pentru build) și acces SSH:
>
> ```bash
> cp scripts/deploy-cpanel.env.example ~/isad-deploy.env   # completează, NU comite
> scripts/deploy-cpanel.sh ~/isad-deploy.env
> ```
>
> **Varianta manuală** e mai jos. Două capcane care rup producția dacă se sar:
> build-ul trebuie făcut din **DB-ul de producție** (vezi nota de la `npm run build`), iar
> binarele `sharp` trebuie înlocuite cu varianta Linux.

Build-ul NU se face pe server (RAM-ul shared nu ajunge). Local:

> ⚠️ `next build` pre-randează ~45 de pagini statice **din baza de date**, deci
> `DATABASE_URI` trebuie să indice un snapshot al DB-ului de **PRODUCȚIE**, nu baza de dev —
> altfel site-ul live iese cu alt conținut. Snapshot rapid (Postgres-ul serverului nu e expus
> public, deci `pg_dump` rulează pe server):
> ```bash
> ssh <server> "pg_dump --no-owner --no-privileges '<PROD_DATABASE_URI>'" > prod.sql
> docker compose up -d postgres
> docker exec isad-postgres psql -U postgres -c 'CREATE DATABASE isad_deploy;'
> docker exec -i isad-postgres psql -U postgres -d isad_deploy -f - < prod.sql
> # apoi build cu DATABASE_URI=postgres://postgres:postgres@127.0.0.1:5432/isad_deploy
> # și NEXT_PUBLIC_SITE_URL=https://isad.academy (ajunge în bundle-ul de client!)
> ```

```bash
npm run build          # produce .next/standalone (server.js + node_modules minime)

# ⚠️ OBLIGATORIU când build-ul se face pe macOS (serverul e Linux): înlocuiește
# binarele native ale lui `sharp` (procesarea imaginilor) cu varianta Linux x64 —
# altfel upload-urile de imagini crapă în producție.
cd .next/standalone
npm install --os=linux --cpu=x64 --force sharp
cd ../..
```

> Alternativa curată pe termen lung: build în GitHub Actions (rulează pe Linux, deci
> binarele ies corecte din prima) + deploy automat prin SSH la fiecare push pe `main`.
> Spune-i lui Claude „fă pipeline-ul de GitHub Actions" și îl primești gata configurat
> (secrets necesare în repo: SSH_HOST, SSH_USER, SSH_KEY, calea aplicației).

Urcă prin SSH/SFTP în `~/apps/isad`:

```
.next/standalone/*    → ~/apps/isad/            (inclusiv server.js, node_modules, package.json)
.next/static          → ~/apps/isad/.next/static
public                → ~/apps/isad/public
```

Apoi în cPanel → Setup Node.js App → **Restart**. (Semnătura unui deploy reușit: site-ul
răspunde și `/admin` se încarcă.)

⚠️ **Capcană dovedită (2026-08-07) — 503 cu TREI cauze suprapuse.** O seară întreagă pierdută
(inclusiv de suportul Hosterion, care a diagnosticat greșit „procesul nu rămâne asociat
socket-ului Passenger"). Simptomul-momeală: aplicația pornea perfect manual pe :3000, dar
extern dădea 503. Cauzele, în ordinea în care au fost decojite:

1. **Loader-ul LiteSpeed nu ascultă de „Setup Node.js App".** `/usr/local/lsws/fcgi-bin/lsnode.js`
   face `require()` pe `PassengerStartupFile` din **blocul CloudLinux al lui
   `~/public_html/.htaccess`** — care cerea `app_wrapper.cjs`, un fișier generat de selector,
   dispărut de pe server. `stderr.log`: `Cannot find module .../app_wrapper.cjs`. După destule
   eșecuri, Passenger intră în refuz (503 în ~0,08 s, log mut). Bundle-ul livrează acum ambele
   punți (`app_wrapper.cjs` + `app.js`), generate de `scripts/deploy-cpanel.sh`.
2. **`server.js` din Next 15.4 standalone e ESM**, dar scriptul de deploy ștergea
   `"type": "module"` din `package.json` — fix-ul incidentului INVERS din 2026-07-30, când
   server.js era CommonJS. Rezultat: `Cannot use import statement outside a module`, de 16 ori
   în log. Scriptul deduce acum câmpul din forma reală a lui `server.js`, la fiecare build —
   nu-l mai șterge și nu-l mai păstrează „din principiu".
3. **Cea mai perfidă: un rând `name='dev', batch=-1` în `payload_migrations`** (marcajul
   modului push, lăsat de o rulare dev pe baza de producție). Cu `RUN_MIGRATIONS=true`,
   Payload cere la boot confirmare interactivă („data loss will occur, proceed? y/N"). Sub
   Passenger nu există TTY: promptul primește EOF → „N" → **procesul iese cu cod 0, fără nicio
   eroare**, la ~1,6 s după un `listen()` reușit. Diagnostic posibil doar cu o punte
   instrumentată (handlere pe exit/semnale) + rularea manuală a punții, care a AFIȘAT promptul.
   Fix: `DELETE FROM payload_migrations WHERE name='dev' AND batch=-1;` — sigur doar când
   toate migrațiile reale sunt aplicate (verifică `SELECT name FROM payload_migrations`).
   **Regula care previne recidiva: nu rula NICIODATĂ `npm run dev` cu `DATABASE_URI` pe baza
   de producție** — push-ul lasă marcajul `dev` și următorul boot de producție se blochează.

Lecția de diagnostic: „merge manual, deci nu e codul" e o concluzie falsă — manual ≠ sub
loader (alt startup file, alt cwd, stdin fără TTY, stdout în /dev/null). Iar un proces care
moare cu exit 0 și log curat înseamnă aproape sigur un prompt interactiv înghițit de lipsa
TTY-ului.

⚠️ **Capcană dovedită (2026-07-30):** în dev, schema se sincronizează cu `push`, nu cu migrații.
`payload migrate:create` scrie doar *diferența* față de ultimul snapshot `.json` din
`src/migrations/`, deci un tabel creat prin push și nesurprins într-un snapshot NU ajunge
niciodată într-o migrație. Exact asta a doborât producția: tabelele `event_popup*` fuseseră
create prin push, iar migrația rămasă în repo doar ștergea o coloană din ele
(`ALTER TABLE "event_popup" DROP COLUMN "seats_left"`) → în producție tabelul nu exista →
migrația a aruncat la boot → Passenger a dat 503 pe tot site-ul.

**Verifică înainte de fiecare release cu migrații noi:** rulează migrațiile pe o bază care
reproduce producția, nu pe baza ta de dev:
```bash
docker exec isad-postgres psql -U postgres -c 'CREATE DATABASE isad_prodsim;'
# aplică DOAR migrațiile deja aplicate în producție, apoi pornește Payload ca în producție:
NODE_ENV=production RUN_MIGRATIONS=true \
DATABASE_URI=postgres://postgres:postgres@127.0.0.1:5432/isad_prodsim \
  npx tsx -e "import {getPayload} from 'payload'; import c from './src/payload.config'; await getPayload({config:c})"
```
Dacă asta pornește curat, pornește și pe server.

⚠️ **Migrațiile se aplică la pornire DOAR dacă `RUN_MIGRATIONS=true` e setat în env-ul
aplicației din cPanel** (`prodMigrations` e gated în `src/payload.config.ts` — vezi
comentariul de acolo pentru de ce). Un release care aduce migrații noi, pornit fără acest
flag, lasă paginile care ating tabelele noi să dea eroare de coloană inexistentă.
Verifică înainte de restart ce migrații sunt înregistrate în `src/migrations/index.ts`
față de ce e deja aplicat în DB (tabelul `payload_migrations`).

Restul variabilelor se setează tot acolo, o dată, și **nu** vin din `.env`-ul local (acela e
strict pentru dezvoltare: are `DATABASE_URI` pe localhost și `NEXT_PUBLIC_SITE_URL` pe
`http://localhost:3000`). Lista completă e în `.env.example`. De reținut:

- `ALLOW_MOCK_PAYMENTS` — **niciodată setat în producție**: ar confirma automat orice
  comandă, adică ar vinde toate locurile gratis.
- `NETOPIA_SANDBOX` — orice altceva decât exact `false` ține plățile în sandbox.
- `BREVO_API_KEY` — fără el, emailurile nu pleacă deloc (NoopMailer); expeditorul trebuie
  verificat în Brevo.

> Tip: fă-ți un script `deploy.sh` cu `rsync -az --delete` pe cele 3 căi de mai sus.

## 4. Media (uploads)

Payload scrie uploads pe disc — pe cPanel discul e persistent, deci NU e nevoie de
S3/Blob. Asigură-te doar că folderul de media al aplicației e inclus în **backupul
zilnic** al hostului (este, dacă stă sub `~/apps/isad`). NU șterge folderul la deploy
(exclude-l din `rsync --delete`).

## 5. Cron: emailurile de review post-ediție (o singură dată)

Sistemul există în aplicație (Payload Jobs, task `sendReviewRequests`), gate-uit cu
`CRON_SECRET`. cPanel → **Cron Jobs**, două intrări zilnice (ex. 07:00 și 07:05):

```bash
curl -fsS -H "Authorization: Bearer CRON_SECRET_UL_TAU" https://isad.academy/api/payload-jobs/handle-schedules
curl -fsS -H "Authorization: Bearer CRON_SECRET_UL_TAU" https://isad.academy/api/payload-jobs/run
```

## 6. Domeniu + SSL

- Domeniul `isad.academy` pe aplicația Node (Application URL); www → apex prin
  redirect în cPanel (Domains → Redirects).
- **AutoSSL** emite certificatul automat; verifică https + redirectul http→https.

## 7. Primul boot (o singură dată)

1. Deschide `https://isad.academy/admin` → formularul **Create first user** → creează
   contul lui Silviu (parolă puternică).
2. Încarcă conținutul real din dashboard (cursuri + ediții + tagurile de quiz, bio,
   texte). Dacă vrei să pornești de la datele din dev: `pg_dump` local → `psql` în DB-ul
   de producție ÎNAINTE de primul boot, plus copierea folderului `media/`.

## Checklist post-deploy

- [ ] Home, /cursuri, curs, /checkout (MockProvider), /quiz, /blog, /contact, legal — EN + RO
- [ ] /admin login + dashboard-ul cu widgeturi
- [ ] Un checkout de test cap-coadă (comanda apare în admin, locurile scad)
- [ ] Formularul de contact → lead în admin + email Brevo
- [ ] Abonare newsletter (double opt-in Brevo)
- [ ] `sitemap.xml`, `robots.txt`, favicon, OG (share pe LinkedIn)
- [ ] Cron-urile rulează (cPanel → Cron Jobs → email de output la primele rulări)
