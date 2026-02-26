#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-$(pwd)}"
PHP_BIN="${PHP_BIN:-php}"

cd "$APP_DIR"

echo "Run manual calls now for these scenarios: answered, busy, noanswer, rejected, inbound"
echo "Then run smoke check:"
"$PHP_BIN" artisan voice:smoke-check --hours=2 --require=answered,busy,noanswer,rejected,inbound
