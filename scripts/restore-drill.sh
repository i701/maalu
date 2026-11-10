#!/usr/bin/env bash
# Restore drill for a Maalu install: proves a backup of your REAL data can be restored.
#
# It takes a dump of the running database, brings up a second, throwaway copy of Maalu next to it
# (its own project name, volumes and port), restores the dump into that, and checks the copy:
# every table has the same number of rows, the migration version matches, the API answers and
# the web app serves the sign-in page. Then it throws the copy away. Your live install is only
# READ from: it is never stopped, changed or restarted.
#
# Run it on the server, in the folder that holds your compose file and .env:
#   curl -fsSLO https://raw.githubusercontent.com/i701/maalu/main/scripts/restore-drill.sh
#   bash restore-drill.sh
#
# Options:
#   --file PATH        the compose file (default: compose.yaml, docker-compose.yml, ... in this folder)
#   --port N           host port for the copy's web app, on 127.0.0.1 only (default 3999)
#   --save-dump DIR    also keep the dump as DIR/maalu-<date>-<time>.dump (a real backup, in
#                      pg_dump's custom format; restore it with pg_restore). Keep it somewhere safe:
#                      it is your financial data in plain text.
#   --keep             leave the copy running afterwards so you can look at it on the port above
#                      (remove it later with: docker compose -p maalu-drill down -v)
#   -h, --help         this text
#
# Safety: the copy NEVER starts the worker and NEVER gets your receipts-bucket settings, so it
# cannot delete or write anything in your real bucket. Its project name is checked against the live
# one before anything is created, and only that project is removed at the end.

set -euo pipefail

DRILL_PROJECT="${DRILL_PROJECT:-maalu-drill}"
DRILL_PORT=3999
KEEP=0
SAVE_DIR=""
FILE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --file) FILE="${2:?--file needs a path}"; shift 2 ;;
    --port) DRILL_PORT="${2:?--port needs a number}"; shift 2 ;;
    --save-dump) SAVE_DIR="${2:?--save-dump needs a folder}"; shift 2 ;;
    --keep) KEEP=1; shift ;;
    -h|--help) sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1 (try --help)" >&2; exit 2 ;;
  esac
done

# ── output helpers ─────────────────────────────────────────────────────────────────────────────
if [ -t 1 ]; then B=$'\033[1m'; G=$'\033[32m'; R=$'\033[31m'; Y=$'\033[33m'; N=$'\033[0m'; else B=""; G=""; R=""; Y=""; N=""; fi
STEP=0; TOTAL=9; FAILED=0
CHECKS=()
step() { STEP=$((STEP + 1)); printf '\n%s[%d/%d] %s%s\n' "$B" "$STEP" "$TOTAL" "$1" "$N"; }
ok()   { printf '  %s✓%s %s\n' "$G" "$N" "$1"; CHECKS+=("PASS  $1"); }
warn() { printf '  %s!%s %s\n' "$Y" "$N" "$1"; }
bad()  { printf '  %s✗%s %s\n' "$R" "$N" "$1"; CHECKS+=("FAIL  $1"); FAILED=1; }
die()  { printf '\n%sStopped:%s %s\n' "$R" "$N" "$1" >&2; exit 1; }
# Run a command quietly (docker compose prints a lot of progress); show its output only if it fails.
quiet() { local out; if ! out="$("$@" 2>&1)"; then printf '%s\n' "$out" >&2; return 1; fi; }

# ── find the compose file ──────────────────────────────────────────────────────────────────────
if [ -z "$FILE" ]; then
  for f in compose.yaml compose.yml docker-compose.yaml docker-compose.yml docker-compose.prod.yml; do
    [ -f "$f" ] && { FILE="$f"; break; }
  done
fi
[ -n "$FILE" ] && [ -f "$FILE" ] || die "no compose file found here. Run this in the folder with your compose file, or pass --file."
FILE="$(cd "$(dirname "$FILE")" && pwd)/$(basename "$FILE")"
cd "$(dirname "$FILE")"
[ -f .env ] || die "no .env next to $FILE (the secrets live there)."

command -v docker >/dev/null || die "docker is not installed."
docker compose version >/dev/null 2>&1 || die "the docker compose plugin is not installed."

live()  { docker compose -f "$FILE" "$@"; }
# The copy: its own project, port on localhost only, and NO receipts bucket (volume mode, empty).
drill() {
  env PORT="127.0.0.1:${DRILL_PORT}" \
      ATTACHMENTS_S3_BUCKET= ATTACHMENTS_S3_ENDPOINT= ATTACHMENTS_S3_ACCESS_KEY_ID= \
      ATTACHMENTS_S3_SECRET_ACCESS_KEY= \
      docker compose -f "$FILE" -p "$DRILL_PROJECT" "$@"
}

WORK="$(mktemp -d)"
CLEANED=0
# Only once the copy has really been created by THIS run is it ours to remove. Until then (a refusal
# in the checks below, or a copy left by an earlier --keep) nothing may be torn down: a refused run
# must never delete a project it did not make.
OWN_COPY=0
cleanup() {
  [ "$CLEANED" = 1 ] && return
  CLEANED=1
  rm -rf "$WORK"
  [ "$OWN_COPY" = 1 ] || return 0
  if [ "$KEEP" = 1 ]; then
    printf '\n%sThe copy is still running%s: http://127.0.0.1:%s (sign in with your own account).\n' "$B" "$N" "$DRILL_PORT"
    printf 'Remove it with: docker compose -f %s -p %s down -v\n' "$FILE" "$DRILL_PROJECT"
  else
    drill down -v --remove-orphans >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

# ── 1. preflight ───────────────────────────────────────────────────────────────────────────────
step "Check the live install is up"
LIVE_DB="$(live ps -q db 2>/dev/null || true)"
[ -n "$LIVE_DB" ] || die "the live database container is not running. Start your install first (docker compose up -d)."
LIVE_PROJECT="$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project" }}' "$LIVE_DB")"
[ "$LIVE_PROJECT" != "$DRILL_PROJECT" ] || die "the live project is called '$DRILL_PROJECT', the same as the drill's. Set DRILL_PROJECT to another name."
ok "live project: $LIVE_PROJECT"
if [ -n "$(drill ps -aq 2>/dev/null)" ]; then
  die "a drill copy already exists ($DRILL_PROJECT). Remove it first: docker compose -f $FILE -p $DRILL_PROJECT down -v"
fi
LIVE_VOL="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/data/attachments"}}{{.Name}}{{end}}{{end}}' "$(live ps -q api)" 2>/dev/null || true)"
BUCKET="$(live exec -T api printenv ATTACHMENTS_S3_BUCKET 2>/dev/null || true)"
if [ -n "$BUCKET" ]; then warn "receipts are in a bucket ($BUCKET): they are not part of this drill (the copy never touches it)."; fi

# ── 2. dump ────────────────────────────────────────────────────────────────────────────────────
COUNT_SQL="select table_name || ' ' || (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1"
live_counts()  { live  exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At' <<<"$COUNT_SQL"; }
drill_counts() { drill exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At' <<<"$COUNT_SQL"; }
live_rev()  { live  exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "select version_num from alembic_version"'; }
drill_rev() { drill exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "select version_num from alembic_version"'; }

step "Take a dump of the live database"
live_counts > "$WORK/before.txt"
live exec -T db sh -c 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$WORK/maalu.dump"
live_counts > "$WORK/after.txt"
DUMP_BYTES="$(wc -c < "$WORK/maalu.dump" | tr -d ' ')"
[ "$DUMP_BYTES" -gt 1000 ] || die "the dump is only $DUMP_BYTES bytes. Something is wrong with pg_dump."
ok "dump made ($((DUMP_BYTES / 1024)) KB, custom format)"
LIVE_REV="$(live_rev)"
ok "live migration version: $LIVE_REV"
if [ -n "$SAVE_DIR" ]; then
  mkdir -p "$SAVE_DIR"
  OUT="$SAVE_DIR/maalu-$(date -u +%Y-%m-%dT%H%MZ).dump"
  cp "$WORK/maalu.dump" "$OUT"
  chmod 600 "$OUT"
  ok "kept a copy: $OUT (your data in plain text: store it somewhere safe)"
fi

# ── 3. the copy ────────────────────────────────────────────────────────────────────────────────
step "Start an empty copy of the database ($DRILL_PROJECT)"
OWN_COPY=1   # from here on the copy exists because of this run, so this run cleans it up
quiet drill up -d --wait db || die "could not start the copy's database."
ok "empty database is up and healthy"

# ── 4. restore ─────────────────────────────────────────────────────────────────────────────────
step "Restore the dump into the copy"
if drill exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --exit-on-error' < "$WORK/maalu.dump"; then
  ok "pg_restore finished without errors"
else
  bad "pg_restore failed (see the messages above)"
  die "the dump did not restore."
fi

# ── 5. compare the data ────────────────────────────────────────────────────────────────────────
step "Compare the restored data with the live data"
drill_counts > "$WORK/drill.txt"
DRILL_REV="$(drill_rev)"
if [ "$LIVE_REV" = "$DRILL_REV" ]; then ok "migration version matches ($DRILL_REV)"; else bad "migration version differs: live $LIVE_REV, copy $DRILL_REV"; fi
# A table passes when the copy's row count equals the live count taken just before or just after the
# dump, or lies between them (someone may have used the app while the drill ran). The job queue's
# own tables are skipped: they change constantly and hold no user data.
MISMATCH="$(awk '
  FILENAME == ARGV[1] { before[$1] = $2; next }
  FILENAME == ARGV[2] { after[$1] = $2; next }
  { d = $2 + 0; b = before[$1] + 0; a = after[$1] + 0
    lo = (a < b ? a : b); hi = (a < b ? b : a)
    if ($1 ~ /^procrastinate_/) next
    if (!($1 in before) || d < lo || d > hi) printf "%s (live %s to %s, copy %s)\n", $1, b, a, d }
' "$WORK/before.txt" "$WORK/after.txt" "$WORK/drill.txt")"
TABLES="$(wc -l < "$WORK/drill.txt" | tr -d ' ')"
ROWS="$(awk '{ s += $2 } END { print s + 0 }' "$WORK/drill.txt")"
LIVE_TABLES="$(wc -l < "$WORK/before.txt" | tr -d ' ')"
if [ "$TABLES" != "$LIVE_TABLES" ]; then bad "the copy has $TABLES tables, the live database has $LIVE_TABLES"; fi
if [ -z "$MISMATCH" ]; then
  ok "all $TABLES tables have the same row counts ($ROWS rows in all)"
else
  bad "row counts differ in:"
  echo "$MISMATCH" | sed 's/^/      /' >&2
  warn "if someone was using the app during the drill, small differences are possible: run it again."
fi

# ── 6. start the app on the copy ───────────────────────────────────────────────────────────────
step "Start the app (API and web, NOT the worker) on the copy"
quiet drill up -d api web || die "could not start the copy's api and web."
ok "api and web started (the API applies migrations on start: a no-op if the version matches)"

# ── 7. the app answers ─────────────────────────────────────────────────────────────────────────
step "Check the restored app answers"
CODE=000
for _ in $(seq 1 45); do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${DRILL_PORT}/login" || true)"
  [ "$CODE" = 200 ] && break
  sleep 2
done
if [ "$CODE" = 200 ]; then ok "web: the sign-in page answers (HTTP 200) on port $DRILL_PORT"; else bad "web did not answer (last HTTP code: $CODE). See: docker compose -f $FILE -p $DRILL_PROJECT logs"; fi
# the API can still be applying migrations when the web app is already up, so ask for up to a minute
REG=""
for _ in $(seq 1 30); do
  REG="$(drill exec -T api python -c "import urllib.request;print(urllib.request.urlopen('http://localhost:8000/api/v1/auth/registration', timeout=5).read().decode())" 2>/dev/null || true)"
  [ -n "$REG" ] && break
  sleep 2
done
if [ -n "$REG" ]; then ok "api: answered from the restored database: $REG"; else bad "api did not answer. See: docker compose -f $FILE -p $DRILL_PROJECT logs api"; fi
USERS="$(drill exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "select count(*) from users"' 2>/dev/null || echo 0)"
if [ "${USERS:-0}" -gt 0 ]; then ok "the copy has $USERS user account(s)"; else bad "the copy has no user accounts"; fi

# ── 8. receipts (volume mode only) ─────────────────────────────────────────────────────────────
step "Receipts"
if [ -n "$BUCKET" ]; then
  warn "skipped: your receipts are in the bucket '$BUCKET'. Back that bucket up with its own tools."
  CHECKS+=("SKIP  receipts are in a bucket")
elif [ -z "$LIVE_VOL" ]; then
  warn "skipped: could not find the live attachments volume."
else
  DRILL_VOL="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/data/attachments"}}{{.Name}}{{end}}{{end}}' "$(drill ps -q api)")"
  count_files() { docker run --rm -v "$1":/d:ro alpine sh -c 'find /d -type f | wc -l' | tr -d ' '; }
  docker run --rm -v "$LIVE_VOL":/from:ro alpine tar cf - -C /from . | docker run --rm -i -v "$DRILL_VOL":/to alpine tar xf - -C /to
  L="$(count_files "$LIVE_VOL")"; D="$(count_files "$DRILL_VOL")"
  if [ "$L" = "$D" ]; then ok "receipts: $D file(s) copied through tar and back, counts match"; else bad "receipts: live has $L file(s), the copy has $D"; fi
fi

# ── 9. result ──────────────────────────────────────────────────────────────────────────────────
step "Result"
printf '%s\n' "${CHECKS[@]}" | sed 's/^PASS /  PASS /; s/^FAIL /  FAIL /; s/^SKIP /  SKIP /'
if [ "$FAILED" = 0 ]; then
  printf '\n%sPASS%s  A backup of this install restores. Worth re-running after big upgrades, and every few months.\n' "$G$B" "$N"
else
  printf '\n%sFAIL%s  Something did not restore cleanly. Do not trust this backup until it does.\n' "$R$B" "$N"
fi
printf 'Your live install was not touched.\n'
exit "$FAILED"
