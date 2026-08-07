#!/usr/bin/env bash
#
# Deploy manual pe cPanel/Hosterion, de pe o mașină de dezvoltare (owner 2026-07-30).
#
# De ce există: deploy-ul automat din .github/workflows/deploy.yml nu mai poate ajunge la
# server — firewall-ul Hosterion blochează SSH-ul de la runnerii GitHub (IP-uri rotative).
# De pe o mașină cu IP stabil, aceiași pași funcționează. Scriptul face EXACT ce face
# workflow-ul, în aceeași ordine, ca artefactul să fie identic:
#
#   1. snapshot al DB-ului de PRODUCȚIE (pg_dump rulat pe server, printr-o comandă ssh
#      scurtă — sesiunile persistente sunt omorâte de firewall);
#   2. restaurare într-un Postgres local, într-o bază SEPARATĂ (baza de dev nu e atinsă);
#   3. `next build` din acel snapshot — paginile statice ies cu CONȚINUTUL REAL;
#   4. binarele native `sharp` înlocuite cu varianta linux-x64 (build-ul se face pe
#      Windows/macOS, serverul e Linux — altfel upload-urile de imagini crapă);
#   5. bundle tar + scp + extract pe server, ștergând doar directoarele de aplicație;
#      `media/` (uploads) și `tmp/` NU se ating;
#   6. restart Passenger prin `tmp/restart.txt`;
#   7. verificare: site-ul și /admin răspund.
#
# Utilizare:
#   scripts/deploy-cpanel.sh /cale/catre/deploy.env [--yes] [--skip-snapshot]
#
# Fișierul de configurare stă ÎN AFARA repo-ului (nu se comite niciodată). Vezi
# scripts/deploy-cpanel.env.example pentru variabilele cerute.

set -euo pipefail

CONFIG="${1:-}"
shift || true

ASSUME_YES=0
SKIP_SNAPSHOT=0
for arg in "$@"; do
  case "$arg" in
    --yes) ASSUME_YES=1 ;;
    --skip-snapshot) SKIP_SNAPSHOT=1 ;;
    *) echo "Argument necunoscut: $arg" >&2; exit 2 ;;
  esac
done

if [[ -z "$CONFIG" || ! -f "$CONFIG" ]]; then
  echo "Utilizare: $0 /cale/catre/deploy.env [--yes] [--skip-snapshot]" >&2
  echo "Vezi scripts/deploy-cpanel.env.example." >&2
  exit 2
fi

# shellcheck disable=SC1090
set -a; source "$CONFIG"; set +a

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

: "${SSH_HOST:?lipsește SSH_HOST}"
: "${SSH_USER:?lipsește SSH_USER}"
: "${SSH_KEY:?lipsește SSH_KEY (cale către cheia privată)}"
: "${APP_DIR:?lipsește APP_DIR (calea aplicației pe server)}"
: "${PROD_DATABASE_URI:?lipsește PROD_DATABASE_URI (string-ul valabil PE server)}"
SSH_PORT="${SSH_PORT:-22}"
SITE_URL="${SITE_URL:-https://isad.academy}"
# Payload cere un secret la build; cel REAL e citit din env-ul de pe server la runtime,
# deci un placeholder e suficient aici dacă nu îl ai la îndemână.
PAYLOAD_SECRET="${PAYLOAD_SECRET:-build-time-placeholder-not-used-at-runtime}"
PG_CONTAINER="${PG_CONTAINER:-isad-postgres}"
SNAPSHOT_DB="${SNAPSHOT_DB:-isad_deploy}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "Cheia privată nu există: $SSH_KEY" >&2
  exit 1
fi

# Sesiuni scurte, fără multiplexare: ControlMaster e exact ce omoară firewall-ul Hosterion.
SSH_COMMON=(-i "$SSH_KEY" -o ControlMaster=no -o ControlPath=none
            -o ConnectTimeout=20 -o StrictHostKeyChecking=accept-new -o BatchMode=yes)
SSH_OPTS=(-p "$SSH_PORT" "${SSH_COMMON[@]}")
# `scp` cere portul cu -P MARE. Cu `-p` (ca la ssh) îl citește ca „păstrează timestamp-urile",
# iar numărul portului devine un nume de fișier: „scp: stat local 8888: No such file or
# directory". Nu se vedea cu portul implicit 22, unde flag-ul lipsește cu totul (2026-08-07).
SCP_OPTS=(-P "$SSH_PORT" "${SSH_COMMON[@]}")
TARGET="${SSH_USER}@${SSH_HOST}"

step() { printf '\n\033[1;34m▶ %s\033[0m\n' "$1"; }
fail() { printf '\n\033[1;31m✗ %s\033[0m\n' "$1" >&2; exit 1; }

# ---------------------------------------------------------------- 0. preflight

step "Preflight"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
COMMIT="$(git rev-parse --short HEAD)"
echo "  branch: $BRANCH ($COMMIT)"
[[ "$BRANCH" == "main" ]] || echo "  ⚠ nu ești pe main — se va publica exact ce ai în arborele curent"
git diff --quiet && git diff --cached --quiet || echo "  ⚠ ai modificări necomise — intră în bundle"

command -v ssh >/dev/null || fail "ssh lipsește"
command -v tar >/dev/null || fail "tar lipsește"
docker info >/dev/null 2>&1 || fail "Docker nu rulează — pornește Docker Desktop (e nevoie de Postgres local pentru build)"

echo -n "  SSH către $SSH_HOST:$SSH_PORT ... "
ssh "${SSH_OPTS[@]}" "$TARGET" 'echo ok' >/dev/null 2>&1 \
  || fail "conexiunea SSH a eșuat. Verifică host/port/user/cheie și că IP-ul tău nu e blocat de firewall-ul Hosterion."
echo "ok"

echo -n "  APP_DIR pe server ... "
ssh "${SSH_OPTS[@]}" "$TARGET" "test -d '$APP_DIR'" \
  || fail "APP_DIR nu există pe server: $APP_DIR"
echo "ok"

if [[ "$ASSUME_YES" -ne 1 ]]; then
  printf '\nSe publică %s (%s) pe %s. Continui? [y/N] ' "$BRANCH" "$COMMIT" "$SITE_URL"
  read -r answer
  [[ "$answer" == "y" || "$answer" == "Y" ]] || { echo "Anulat."; exit 0; }
fi

# ------------------------------------------------- 1-2. snapshot DB producție

LOCAL_DB_URI="postgres://postgres:postgres@127.0.0.1:5432/${SNAPSHOT_DB}"

if [[ "$SKIP_SNAPSHOT" -eq 1 ]]; then
  step "Snapshot DB — SĂRIT (--skip-snapshot); se refolosește $SNAPSHOT_DB"
else
  step "Pornire Postgres local"
  docker compose up -d postgres >/dev/null
  for i in $(seq 1 30); do
    docker exec "$PG_CONTAINER" pg_isready -U postgres >/dev/null 2>&1 && break
    [[ "$i" -eq 30 ]] && fail "Postgres local nu a pornit"
    sleep 2
  done
  echo "  gata"

  step "Snapshot al DB-ului de producție (pg_dump pe server)"
  ssh "${SSH_OPTS[@]}" "$TARGET" "pg_dump --no-owner --no-privileges '$PROD_DATABASE_URI'" > prod.sql \
    || fail "pg_dump a eșuat pe server"
  [[ -s prod.sql ]] || fail "snapshot-ul e gol"
  echo "  $(wc -l < prod.sql) linii SQL"

  step "Restaurare în baza locală $SNAPSHOT_DB (baza de dev nu e atinsă)"
  docker exec "$PG_CONTAINER" psql -U postgres -q -c "DROP DATABASE IF EXISTS $SNAPSHOT_DB;" >/dev/null
  docker exec "$PG_CONTAINER" psql -U postgres -q -c "CREATE DATABASE $SNAPSHOT_DB;" >/dev/null
  docker exec -i "$PG_CONTAINER" psql -U postgres -d "$SNAPSHOT_DB" -q -v ON_ERROR_STOP=0 < prod.sql >/dev/null
  rm -f prod.sql
  echo "  gata"
fi

# ------------------------------------------------------------------- 3. build

step "Build standalone din snapshot-ul de producție"
# CLAUDE.md: un .next vechi de la dev server poate face prerender-ul să cadă pe Windows.
rm -rf .next deploy bundle.tar.gz
DATABASE_URI="$LOCAL_DB_URI" \
PAYLOAD_SECRET="$PAYLOAD_SECRET" \
NEXT_PUBLIC_SITE_URL="$SITE_URL" \
  npm run build || fail "build eșuat"

[[ -f .next/standalone/server.js ]] || fail ".next/standalone/server.js lipsește (output: 'standalone' e setat?)"

# ------------------------------------------------------- 4. sharp pentru Linux

step "Înlocuire binare sharp cu varianta linux-x64"
# `--ignore-scripts` NU e opțional: fără el, npm rulează postinstall-urile din bundle, iar
# `@esbuild-kit/core-utils` verifică versiunea binarului esbuild pe care-l găsește în PATH și
# eșuează dacă nu se potrivește („Expected 0.18.20 but got …"). N-are nicio legătură cu sharp,
# dar oprea tot deploy-ul de pe o mașină de dezvoltare (2026-08-07). Aici doar descărcăm
# binare precompilate — nu e nimic de compilat.
#
# Pachetul de platformă se cere EXPLICIT: `--os/--cpu` singure nu au adus optional dependency-ul
# pe macOS, iar verificarea de mai jos ar fi picat.
SHARP_VERSION=$(node -p "require('./.next/standalone/node_modules/sharp/package.json').version" 2>/dev/null || echo "")
[[ -n "$SHARP_VERSION" ]] || fail "nu am putut citi versiunea sharp din bundle"
LIBVIPS_VERSION=$(node -p "require('./.next/standalone/node_modules/sharp/package.json').optionalDependencies['@img/sharp-libvips-linux-x64']" 2>/dev/null || echo "")
[[ -n "$LIBVIPS_VERSION" ]] || fail "nu am putut citi versiunea @img/sharp-libvips-linux-x64"

# Cele DOUA pachete se cer EXPLICIT si cu versiunea FIXATA a lui sharp din bundle. Lectii din
# 2026-08-07, platite cu productia cazuta:
#   - `--os/--cpu` singure nu aduc dependinta pe macOS; a lipsit libvips si aplicatia a murit
#     la boot cu "libvips-cpp.so...: cannot open shared object file";
#   - fara versiune, npm ia `latest`, care aduce alt ABI decat cere sharp-ul din bundle
#     (8.18.3 vs 8.17.3) => aceeasi cadere;
#   - `@img/colour` vine din build-ul normal si NU trebuie sters: fara el, `Cannot find
#     module '@img/colour'` la pornire.
( cd .next/standalone \
  && npm install --os=linux --cpu=x64 --force --ignore-scripts \
       "@img/sharp-linux-x64@${SHARP_VERSION}" "@img/sharp-libvips-linux-x64@${LIBVIPS_VERSION}" >/dev/null 2>&1 ) \
  || fail "instalarea sharp pentru linux-x64 a esuat"

ls .next/standalone/node_modules/@img/sharp-libvips-linux-x64/lib/libvips-cpp.so.* >/dev/null 2>&1 \
  || fail "biblioteca nativa libvips lipseste din bundle — aplicatia ar muri la boot"
[[ -d .next/standalone/node_modules/@img/colour ]] \
  || fail "@img/colour lipseste din bundle — aplicatia ar muri la boot"
echo "  ok: $(ls .next/standalone/node_modules/@img | tr '\n' ' ')"

# ---------------------------------------------------------------- 5. assemble

step "Asamblare bundle"
mkdir -p deploy/.next
cp -R .next/standalone/. deploy/
cp -R .next/static deploy/.next/static
cp -R public deploy/public

# Next copiază package.json-ul din rădăcină în .next/standalone, deci bundle-ul moștenește
# "type": "module". Dar server.js generat de Next e CommonJS (`require('next')`): cu type
# module lângă el, Node îl încarcă drept ESM și moare cu `Cannot find module 'next'` —
# aplicația nu pornește deloc, 503 pe tot site-ul (incident 2026-07-30). Scripturile din acest
# package.json nu se rulează niciodată pe server, deci câmpul se poate scoate în siguranță.
node -e '
  const fs = require("fs")
  const p = "deploy/package.json"
  const pkg = JSON.parse(fs.readFileSync(p, "utf8"))
  if (pkg.type === "module") {
    delete pkg.type
    fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + "\n")
    console.log("  package.json: type=module eliminat (server.js e CommonJS)")
  }
' || fail "nu am putut normaliza deploy/package.json"

# Puntea pentru loader-ul LiteSpeed. `lsnode.js` cere `app.js`, chiar daca in Setup Node.js
# App scrie `server.js` — desincronizare care a tinut productia jos ore intregi pe 2026-08-07,
# cu "Cannot find module .../app.js" in stderr.log si 503 pe tot site-ul, desi aplicatia
# pornea perfect manual. Fisierul e inofensiv daca loader-ul cere `server.js`: nu-l citeste
# nimeni. Costa o linie si scuteste o vanatoare de cateva ore.
cat > deploy/app.js <<'APPJS'
// Punte pentru loader-ul LiteSpeed (lsnode.js), care poate cere `app.js` in loc de
// `server.js`. Generat de scripts/deploy-cpanel.sh — nu edita in bundle.
require('./server.js')
APPJS
echo "  app.js: punte pentru lsnode.js"

tar czf bundle.tar.gz -C deploy .
echo "  bundle.tar.gz: $(du -h bundle.tar.gz | cut -f1)"

# ------------------------------------------------------------------ 6. upload

step "Upload pe server"
scp "${SCP_OPTS[@]}" bundle.tar.gz "$TARGET:~/bundle.tar.gz" >/dev/null \
  || fail "scp a eșuat"

step "Extract pe server (media/ și tmp/ rămân neatinse)"
ssh "${SSH_OPTS[@]}" "$TARGET" \
  "cd '$APP_DIR' && rm -rf .next node_modules public server.js package.json && tar xzf ~/bundle.tar.gz && rm ~/bundle.tar.gz" \
  || fail "extract-ul pe server a eșuat — aplicația poate fi într-o stare incompletă, repetă deploy-ul"

step "Restart Passenger"
ssh "${SSH_OPTS[@]}" "$TARGET" "mkdir -p '$APP_DIR/tmp' && touch '$APP_DIR/tmp/restart.txt'" \
  || fail "restart-ul a eșuat"

rm -rf deploy bundle.tar.gz

# ------------------------------------------------------------ 7. verificare

step "Verificare"
echo "  aștept repornirea aplicației (migrațiile se aplică la boot dacă RUN_MIGRATIONS=true)"
ok=0
for i in $(seq 1 20); do
  sleep 6
  code="$(curl -s -o /dev/null -w '%{http_code}' -L --max-time 25 "$SITE_URL/" || true)"
  printf '  încercare %s: / -> %s\n' "$i" "$code"
  [[ "$code" == "200" ]] && { ok=1; break; }
done
[[ "$ok" -eq 1 ]] || fail "site-ul nu răspunde 200 după restart — verifică logurile din cPanel (Setup Node.js App)"

admin="$(curl -s -o /dev/null -w '%{http_code}' -L --max-time 25 "$SITE_URL/admin" || true)"
echo "  /admin -> $admin"
[[ "$admin" == "200" ]] || echo "  ⚠ /admin nu răspunde 200 — semn de migrații neaplicate (RUN_MIGRATIONS) sau eroare la boot"

printf '\n\033[1;32m✓ Deploy terminat: %s (%s) e live pe %s\033[0m\n' "$BRANCH" "$COMMIT" "$SITE_URL"
