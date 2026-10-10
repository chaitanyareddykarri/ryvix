#!/bin/sh
set -eu
role="${1:-operations}"
case "$role" in
  operations|gmail|whatsapp|experience) ;;
  *) echo 'Railway supports operations, gmail, whatsapp or experience; Docker workspaces require the VM.' >&2; exit 1 ;;
esac
[ -n "${DATABASE_URL:-}" ] || { echo 'DATABASE_URL is required.' >&2; exit 1; }
# Railway volumes initially have root ownership. Repair only the mount directory,
# not arbitrary existing files, then drop privileges before loading application code.
[ ! -L /app/ai/data ] || { echo 'AI data directory must not be a symlink.' >&2; exit 1; }
if [ "$(id -u)" = 0 ]; then
  mkdir -p /app/ai/data
  chown 1000:1000 /app/ai/data
  chmod 700 /app/ai/data
  exec su-exec 1000:1000 node /app/scripts/worker-entry.mjs "$role"
fi
exec node /app/scripts/worker-entry.mjs "$role"
