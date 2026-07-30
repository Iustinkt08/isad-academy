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
SSH_OPTS=(-i "$SSH_KEY" -p "$SSH_PORT" -o ControlMaster=no -o ControlPath=none
          -o ConnectTimeout=20 -o StrictHostKeyChecking=accept-new -o BatchMode=yes)
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
( cd .next/standalone && npm install --os=linux --cpu=x64 --force sharp >/dev/null 2>&1 ) \
  || fail "instalarea sharp pentru linux-x64 a eșuat"
ls .next/standalone/node_modules/@img 2>/dev/null | grep -q linux \
  || fail "binarele linux ale sharp nu au apărut în bundle — upload-urile de imagini ar crăpa în producție"
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

tar czf bundle.tar.gz -C deploy .
echo "  bundle.tar.gz: $(du -h bundle.tar.gz | cut -f1)"

# ------------------------------------------------------------------ 6. upload

step "Upload pe server"
scp "${SSH_OPTS[@]}" bundle.tar.gz "$TARGET:~/bundle.tar.gz" >/dev/null \
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
