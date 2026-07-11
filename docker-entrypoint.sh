#!/bin/sh
set -eu

cat > /etc/caddy/Caddyfile <<EOF
:{\$PORT:3000} {
EOF

if [ -n "${BOOKIA_API_UPSTREAM_URL:-}" ]; then
  cat >> /etc/caddy/Caddyfile <<EOF
  @api path /search* /bookstores* /auth* /me* /dashboard* /catalog* /media* /static*
  reverse_proxy @api ${BOOKIA_API_UPSTREAM_URL}

EOF
  api_base_url=""
else
  api_base_url="${VITE_API_BASE_URL:-}"
fi

cat >> /etc/caddy/Caddyfile <<EOF
  root * /srv
  encode gzip zstd
  file_server

  try_files {path} /index.html
}
EOF

cat > /srv/runtime-config.js <<EOF
window.__BOOKIA_CONFIG__ = {
  apiBaseUrl: "${api_base_url}"
};
EOF
exec "$@"