#!/usr/bin/env bash
# The local Postgres for development and tests (B05). Never Neon: nothing is tested against a
# database that holds real money (docs/cloud.md §3). docs/cloud.md §5 records how it runs here.
#
#   scripts/local-db.sh start   start it, creating the cluster and both databases the first time
#   scripts/local-db.sh stop
#   scripts/local-db.sh reset   drop and recreate sen_dev and sen_test, empty (migrations then run)
#   scripts/local-db.sh url     print the owner's URL for sen_dev
#
# Postgres 16 from Ubuntu's packages, run as the `postgres` system user in $SEN_PG_DIR, on
# 127.0.0.1:$SEN_PG_PORT with trust authentication: it's a throwaway inside one VM. The roles are
# the production ones (packages/db/README.md): `sen_owner` owns everything and runs migrations,
# `app_user` and `sen_auth` are created by the first migration. pgTAP and pg_prove come from apt.
set -euo pipefail

PG_BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
DIR="${SEN_PG_DIR:-/var/lib/sen-pg}"
PORT="${SEN_PG_PORT:-5432}"
OWNER=sen_owner
DBS=(sen_dev sen_test)

as_pg() { if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
psql_owner() { "$PG_BIN/psql" -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$PORT" -U "$OWNER" "$@"; }

ensure_pgtap() {
  [ -f /usr/share/postgresql/16/extension/pgtap.control ] && command -v pg_prove >/dev/null && return
  [ "$(id -u)" = 0 ] || { echo "pgTAP is missing: apt-get install postgresql-16-pgtap libtap-parser-sourcehandler-pgtap-perl"; return; }
  # Ubuntu's index in a fresh VM doesn't list pgTAP until it's refreshed (measured 15 Oct, B05)
  apt-get update -q >/dev/null 2>&1 || true
  DEBIAN_FRONTEND=noninteractive apt-get install -y -q postgresql-16-pgtap libtap-parser-sourcehandler-pgtap-perl >/dev/null
}

create_dbs() {
  for db in "${DBS[@]}"; do
    psql_owner -d postgres -tAc "select 1 from pg_database where datname = '$db'" | grep -q 1 \
      || psql_owner -d postgres -c "create database $db owner $OWNER"
  done
}

start() {
  ensure_pgtap
  if [ ! -s "$DIR/PG_VERSION" ]; then
    mkdir -p "$DIR" && chown postgres:postgres "$DIR" 2>/dev/null || true
    as_pg "$PG_BIN/initdb" -D "$DIR" -U postgres --auth=trust --encoding=UTF8 --locale=C.UTF-8 >/dev/null
  fi
  if ! as_pg "$PG_BIN/pg_ctl" -D "$DIR" status >/dev/null 2>&1; then
    as_pg "$PG_BIN/pg_ctl" -D "$DIR" -l "$DIR/server.log" -w \
      -o "-c listen_addresses=127.0.0.1 -p $PORT -k /tmp -c timezone=UTC" start >/dev/null
  fi
  "$PG_BIN/psql" -X -q -h 127.0.0.1 -p "$PORT" -U postgres -d postgres -tAc \
    "select 1 from pg_roles where rolname = '$OWNER'" | grep -q 1 \
    || "$PG_BIN/psql" -X -q -h 127.0.0.1 -p "$PORT" -U postgres -d postgres \
      -c "create role $OWNER login createrole createdb"
  create_dbs
  echo "local Postgres on 127.0.0.1:$PORT: ${DBS[*]}"
}

stop() { as_pg "$PG_BIN/pg_ctl" -D "$DIR" -m fast stop >/dev/null 2>&1 || true; }

reset() {
  start >/dev/null
  for db in "${DBS[@]}"; do psql_owner -d postgres -c "drop database if exists $db with (force)"; done
  # roles are cluster-wide: drop them too, so the first migration creates them as it would on Neon
  for role in app_user sen_auth; do
    "$PG_BIN/psql" -X -q -h 127.0.0.1 -p "$PORT" -U postgres -d postgres -c "drop role if exists $role"
  done
  create_dbs
  echo "reset: ${DBS[*]} are empty"
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  reset) reset ;;
  url) echo "postgres://$OWNER@127.0.0.1:$PORT/sen_dev" ;;
  *) echo "usage: $0 start|stop|reset|url" >&2; exit 2 ;;
esac
