#!/bin/sh
set -eu
cat > /srv/runtime-config.js <<EOF
window.__BOOKIA_CONFIG__ = {
  apiBaseUrl: "${VITE_API_BASE_URL:-}"
};
EOF
exec "$@"
