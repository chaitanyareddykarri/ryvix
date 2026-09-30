#!/usr/bin/env bash
set -euo pipefail
# The control plane serves a versioned installer with an operator-pinned checksum.
: "${RYVIX_PUBLIC_URL:?Set the HTTPS Ryvix control plane origin}"
case "$RYVIX_PUBLIC_URL" in https://*) ;; *) echo 'HTTPS origin required.' >&2; exit 1 ;; esac
curl --proto '=https' --tlsv1.2 --fail --silent --show-error "${RYVIX_PUBLIC_URL%/}/api/install" | bash
