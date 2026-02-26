#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-$(pwd)}"
PHP_BIN="${PHP_BIN:-php}"
COMPOSER_BIN="${COMPOSER_BIN:-composer}"

cd "$APP_DIR"

echo "[1/8] Composer autoload rebuild"
"$COMPOSER_BIN" dump-autoload -o --no-interaction

echo "[2/8] Clear all Laravel caches"
"$PHP_BIN" artisan optimize:clear

echo "[3/8] Database migrations"
"$PHP_BIN" artisan migrate --force

echo "[4/8] Rebuild config cache"
"$PHP_BIN" artisan config:cache

echo "[5/8] Rebuild routes cache"
"$PHP_BIN" artisan route:cache

echo "[6/8] Rebuild views cache"
"$PHP_BIN" artisan view:cache

echo "[7/8] Rebuild events cache"
"$PHP_BIN" artisan event:cache

echo "[8/8] Voice route sanity checks"
"$PHP_BIN" artisan route:list | grep -E "voice/logs|voice/client-health|voice/calls/.*/status" >/dev/null

echo "Deploy routine complete."
