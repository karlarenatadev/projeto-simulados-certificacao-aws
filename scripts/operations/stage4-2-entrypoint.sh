#!/bin/sh
set -eu
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH

mkdir -p "$STAGE42_ROOT" "$DB_DATA_DIR" "$BACKUP_OUTPUT_DIR"
chmod 700 "$STAGE42_ROOT" "$DB_DATA_DIR" "$BACKUP_OUTPUT_DIR"
chown -R node:node /var/lib/cloudacademy
chown -R node:node "$STAGE42_ROOT"
exec su -p -s /bin/sh node -c 'node /app/scripts/operations/stage4-2-linux-smoke.mjs'
