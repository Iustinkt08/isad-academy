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

Build-ul NU se face pe server (RAM-ul shared nu ajunge). Local:

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

Apoi în cPanel → Setup Node.js App → **Restart**. La pornire, în producție, Payload
aplică automat migrațiile noi. (Semnătura unui deploy reușit: site-ul răspunde și
`/admin` se încarcă.)

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
