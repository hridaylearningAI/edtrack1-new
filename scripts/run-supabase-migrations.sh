#!/usr/bin/env bash
# Run pending Supabase migrations against wyhrdtxqnudedceeujgz.
# Uses psql (Postgres CLI) — no Supabase MCP required.
# Usage: ./scripts/run-supabase-migrations.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local — need DATABASE_URL or SUPABASE_DB_PASSWORD"
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env.local
set +a

PROJECT_REF="wyhrdtxqnudedceeujgz"

if [[ -n "${DATABASE_URL:-}" ]]; then
  DB_URL="$DATABASE_URL"
elif [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
  DB_URL="postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"
else
  echo "Set DATABASE_URL or SUPABASE_DB_PASSWORD in .env.local"
  exit 1
fi

MIGRATIONS_DIR="$ROOT/supabase/migrations"
if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "No migrations found at $MIGRATIONS_DIR"
  exit 1
fi

echo "Connecting to db.${PROJECT_REF}.supabase.co …"

for migration in "$MIGRATIONS_DIR"/*.sql; do
  name="$(basename "$migration")"
  echo "Applying $name …"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$migration"
  echo "  OK"
done

echo ""
echo "Verifying schema …"
psql "$DB_URL" -v ON_ERROR_STOP=1 -c "
  SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'tenant_id';
"
psql "$DB_URL" -v ON_ERROR_STOP=1 -c "
  SELECT to_regclass('public.platform_audit_logs') AS platform_audit_logs;
"
psql "$DB_URL" -v ON_ERROR_STOP=1 -c "
  SELECT COUNT(*) AS users_with_tenant FROM public.users WHERE tenant_id IS NOT NULL;
"

echo "Migrations complete."
