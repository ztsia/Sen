#!/usr/bin/env bash
# The database tests (B05): a fresh sen_test, every migration, then pgTAP. Local Postgres only
# (scripts/local-db.sh), never Neon. CI runs the same.
set -euo pipefail
cd "$(dirname "$0")/.."
HOST="${PGHOST:-127.0.0.1}" PORT="${PGPORT:-5432}"
OWNER_URL="postgres://sen_owner@$HOST:$PORT"
psql -X -q -v ON_ERROR_STOP=1 "$OWNER_URL/postgres" -c "drop database if exists sen_test with (force)" -c "create database sen_test"
npx tsx src/migrate-cli.ts "$OWNER_URL/sen_test"
# the tests switch to the two roles, as the API's connections are; the owner created them, so may join them
psql -X -q -v ON_ERROR_STOP=1 "$OWNER_URL/sen_test" -c "grant app_user, sen_auth to current_user"
pg_prove -h "$HOST" -p "$PORT" -U sen_owner -d sen_test test/*.sql "$@"
