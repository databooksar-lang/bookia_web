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

  @admin path /admin /admin/*
  handle @admin {
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

    @runtime_config path /runtime-config.js
    @vite_assets path /assets/*

    route {
      try_files {path} /index.html
      header /index.html Cache-Control "no-cache"
      header @runtime_config Cache-Control "no-cache"
      header @vite_assets Cache-Control "public, max-age=31536000, immutable"
      file_server
    }
  }
}
EOF

cat > /srv/runtime-config.js <<EOF
window.__BOOKIA_CONFIG__ = {
  apiBaseUrl: "${api_base_url}"
};
EOF
exec "$@"
