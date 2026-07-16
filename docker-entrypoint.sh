#!/bin/sh
set -eu

cat > /etc/caddy/Caddyfile <<EOF
:{\$PORT:3000} {
EOF

if [ -n "${BOOKIA_API_UPSTREAM_URL:-}" ]; then
  cat >> /etc/caddy/Caddyfile <<EOF
  @api path /api /api/*
  handle @api {
    uri strip_prefix /api
    reverse_proxy ${BOOKIA_API_UPSTREAM_URL}
  }

EOF
  api_base_url="/api"
else
  cat >> /etc/caddy/Caddyfile <<EOF
  @api path /api /api/*
  handle @api {
    header Content-Type application/json
    respond "{\"detail\":\"BOOKIA_API_UPSTREAM_URL no esta configurada; el proxy /api no puede llegar al backend.\"}" 503
  }

EOF
  api_base_url="${VITE_API_BASE_URL:-/api}"
fi

cat >> /etc/caddy/Caddyfile <<EOF
  handle {
    root * /srv
    encode gzip zstd
    try_files {path} /index.html
    file_server
  }
}
EOF

cat > /srv/runtime-config.js <<EOF
window.__BOOKIA_CONFIG__ = {
  apiBaseUrl: "${api_base_url}"
};
EOF
exec "$@"
