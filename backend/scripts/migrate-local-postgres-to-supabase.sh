#!/usr/bin/env bash
set -euo pipefail

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found. Install PostgreSQL client tools first (macOS: brew install libpq && brew link --force libpq)." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found. Install PostgreSQL client tools first (macOS: brew install libpq && brew link --force libpq)." >&2
  exit 1
fi

: "${SOURCE_DATABASE_URL:?Set SOURCE_DATABASE_URL to your local Postgres URL (e.g. docker-compose uses localhost:15432)}"
: "${TARGET_DATABASE_URL:?Set TARGET_DATABASE_URL to your Supabase Postgres URL (Direct or Session pooler recommended)}"

work_dir="${WORK_DIR:-/tmp}"
dump_file="$work_dir/brivara_data_$(date +%Y%m%d_%H%M%S).sql"

echo "Dumping data from SOURCE_DATABASE_URL to: $dump_file" >&2
pg_dump \
  --data-only \
  --no-owner \
  --no-privileges \
  "$SOURCE_DATABASE_URL" > "$dump_file"

echo "Restoring data into TARGET_DATABASE_URL..." >&2
psql \
  "$TARGET_DATABASE_URL" \
  -v ON_ERROR_STOP=1 \
  -f "$dump_file"

echo "Done. Data dump file kept at: $dump_file" >&2

echo "NOTE:" >&2
echo "- This script migrates DATA ONLY. Create the schema first (recommended):" >&2
echo "    cd backend && npm run prisma:deploy" >&2
