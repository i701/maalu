#!/usr/bin/env bash
#
# backup.sh: pg_dump (custom format) -> age-encrypt -> rclone to a bucket (Cloudflare R2, S3, any rclone remote).
#
# Run it on the server, in the folder that holds your compose file and .env (no repo needed):
#   curl -fsSLO https://raw.githubusercontent.com/i701/maalu/main/scripts/backup.sh && chmod +x backup.sh
#   ./backup.sh                      # then put it in cron (below)
#
# Settings: environment variables, or lines in the same .env the compose file reads.
#   AGE_RECIPIENT   required. An age PUBLIC key (age1...). Make a pair with `age-keygen -o key.txt` on
#                   your own computer and keep the private key file OFF this machine: then a stolen
#                   server cannot read old backups. Only the public key is ever needed here.
#   RCLONE_DEST     where to upload, as an rclone destination, e.g. r2:maalu-backups (a separate bucket
#                   from the receipts). Unset = test mode: the encrypted dump is kept in this folder.
#   RETENTION_DAYS  delete uploaded backups older than this many days (default 30, 0 = keep forever).
#                   Only files named maalu-*.dump.age are ever deleted.
#   TG_BOT_TOKEN, TG_CHATID   optional. A Telegram message when the backup FAILS (never on success: a
#                   silent cron run is a healthy one).
#
# The file name pairs the dump with the build that made it:
#   maalu-2026-11-09T023000Z-abc1234abcde.dump.age
# The commit is read from the running api container's org.opencontainers.image.revision label (the
# published images carry it). To restore that exact version, run that image: MAALU_VERSION=sha-abc1234...
# A dump from an older commit also restores into a newer one (the API upgrades the schema on start);
# a dump from a NEWER commit does not restore into an older one.
#
# Cron (nightly at 02:15; the log shows each run):
#   15 2 * * * cd /home/you/maalu && ./backup.sh >> backup.log 2>&1
#
# One-time rclone setup for Cloudflare R2 (token scoped to the one bucket, Object Read & Write):
#   rclone config create r2 s3 provider=Cloudflare access_key_id=KEY secret_access_key=SECRET \
#       endpoint=https://ACCOUNT_ID.r2.cloudflarestorage.com no_check_bucket=true
#
# Restore (with the PRIVATE key, from wherever you keep it; the app must be stopped):
#   rclone copy r2:maalu-backups/maalu-<file>.dump.age .
#   age -d -i ~/maalu-age-key.txt -o maalu.dump maalu-<file>.dump.age
#   then the five steps of "Restore for real" in the backup guide: stop web/api/worker, dump what is
#   there now (pre-restore.dump), recreate the database, pg_restore, start the app.
#   `scripts/restore-drill.sh` proves a restore works without touching the live install.
#
# Secrets never appear in process arguments (anyone on the machine can read /proc/<pid>/cmdline): the
# database password never leaves the db container, and the Telegram token goes in through stdin.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

for tool in docker age; do
    command -v "$tool" >/dev/null || { echo "!!  $tool is not installed." >&2; exit 1; }
done

# Read only what this script needs from .env. The compose .env is not a shell file (a value such as
# MAP_ATTRIBUTION=&copy; would break `source`), and environment variables win over it.
env_value() {
    [ -f .env ] || return 0
    grep -E "^$1=" .env | tail -1 | cut -d= -f2- | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/" || true
}
for name in AGE_RECIPIENT RCLONE_DEST RETENTION_DAYS TG_BOT_TOKEN TG_CHATID; do
    if [ -z "${!name:-}" ]; then
        value="$(env_value "$name")"
        [ -n "$value" ] && export "$name=$value"
    fi
done
RETENTION_DAYS="${RETENTION_DAYS:-30}"

OUT=""          # the local file this run is making
DUMP_OK=0       # set once the dump is complete and checked: after that the file is never thrown away

# On any failure: remove a dump that is not complete (an upload that fails keeps the good local file
# so it can be uploaded by hand), and tell Telegram. Success is silent.
on_exit() {
    local ec=$?                       # must be the first line: later commands clobber $?
    [ "$ec" -eq 0 ] && return 0
    if [ "$DUMP_OK" -ne 1 ] && [ -n "$OUT" ]; then rm -f "$OUT"; fi
    if [ -n "${TG_BOT_TOKEN:-}" ] && [ -n "${TG_CHATID:-}" ]; then
        local msg="❌ Maalu backup FAILED on $(uname -n) at $(date -Is): exit ${ec}. Check backup.log."
        # curl config values are double-quoted with backslash escapes, so escape both.
        msg="${msg//\\/\\\\}"
        msg="${msg//\"/\\\"}"
        # The token goes through a config file on stdin, not the URL argument (which `ps` would show).
        curl -sf -X POST --config - >/dev/null 2>&1 <<CURLCFG || true
url = "https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage"
data-urlencode = "chat_id=${TG_CHATID}"
data-urlencode = "text=${msg}"
CURLCFG
    fi
}
trap on_exit EXIT

: "${AGE_RECIPIENT:?AGE_RECIPIENT is not set (an age public key, age1...). See the top of this script.}"
case "$AGE_RECIPIENT" in age1*) ;; *) echo "!!  AGE_RECIPIENT must be a public key starting with age1." >&2; exit 1 ;; esac
case "$RETENTION_DAYS" in ''|*[!0-9]*) echo "!!  RETENTION_DAYS must be a whole number (0 keeps everything)." >&2; exit 1 ;; esac
if [ -n "${RCLONE_DEST:-}" ]; then
    command -v rclone >/dev/null || { echo "!!  rclone is not installed (RCLONE_DEST is set)." >&2; exit 1; }
fi

# Which build is this database from? The running image says so; the file name carries it.
API="$(docker compose ps -q api 2>/dev/null | head -1 || true)"
REV=""
[ -n "$API" ] && REV="$(docker inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$API" 2>/dev/null || true)"
COMMIT="$(printf '%s' "$REV" | grep -Eo '^[0-9a-f]{40}$' | cut -c1-12 || true)"
if [ -z "$COMMIT" ]; then
    COMMIT="unknown"
    echo "!!  The api container has no org.opencontainers.image.revision label (is it running? a local build?)." >&2
    echo "!!  The file will be named ...-unknown: note by hand which image this dump belongs to." >&2
fi

OUT="maalu-$(date -u +%Y-%m-%dT%H%M%SZ)-${COMMIT}.dump.age"
[ -e "$OUT" ] && { echo "!!  $OUT already exists; not overwriting it." >&2; OUT=""; exit 1; }

echo "==> Dumping the database (build ${COMMIT})..."
# pg_dump runs inside the db container, which has the password in its own environment: nothing to
# pass on, no port to publish, and the client is always the server's own version.
docker compose exec -T db sh -c 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' \
    | age -r "$AGE_RECIPIENT" -o "$OUT"

# An empty or failed dump still yields a ~200 byte age header. A real one is far larger.
BYTES="$(stat -c%s "$OUT")"
if [ "$BYTES" -lt 5000 ]; then
    echo "!!  The dump is suspiciously small (${BYTES} bytes). A failed dump, or the wrong database?" >&2
    exit 1
fi
DUMP_OK=1
echo "==> Created ${OUT} ($(du -h "$OUT" | cut -f1))"

if [ -z "${RCLONE_DEST:-}" ]; then
    echo "==> RCLONE_DEST is not set: test mode, keeping ${OUT} here."
    echo "==> Done."
    exit 0
fi

echo "==> Uploading to ${RCLONE_DEST}..."
rclone copy "$OUT" "$RCLONE_DEST" --log-level INFO
# Make sure it really is there before the local copy goes.
if ! rclone lsf "$RCLONE_DEST" --files-only --include "$OUT" | grep -qxF "$OUT"; then
    echo "!!  ${OUT} is not in ${RCLONE_DEST} after the upload. Keeping the local file." >&2
    exit 1
fi
rm "$OUT"
echo "==> Uploaded and checked; the local copy is removed."

if [ "$RETENTION_DAYS" -gt 0 ]; then
    echo "==> Removing backups older than ${RETENTION_DAYS} days from ${RCLONE_DEST}..."
    rclone delete "$RCLONE_DEST" --min-age "${RETENTION_DAYS}d" --include "maalu-*.dump.age" --log-level INFO
fi

echo "==> Done."
