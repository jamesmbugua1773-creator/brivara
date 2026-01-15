# Supabase Database Setup (Prisma + PostgreSQL)

This project uses Prisma with PostgreSQL. Supabase is a good managed PostgreSQL option.

## 1) Create Supabase project
- Create a project in Supabase
- Choose region close to your users
- Set a strong database password

## 2) Get the connection string
Supabase → Project Settings → Database → Connection string (URI)

Prefer using two URLs:

- `DATABASE_URL` for runtime pooling
- `DIRECT_URL` for Prisma migrations

Examples (use the exact strings from Supabase dashboard → Connect):

`DATABASE_URL=postgresql://postgres.<project-ref>:<YOUR-PASSWORD>@aws-1-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require`

`DIRECT_URL=postgresql://postgres.<project-ref>:<YOUR-PASSWORD>@aws-1-<region>.pooler.supabase.com:5432/postgres?sslmode=require`

Notes:
- Supabase requires SSL in most environments; keep `sslmode=require`.
- If you want strict certificate verification, use `sslmode=verify-full`.
- The backend Docker image trusts Supabase Root 2021 CA (see `backend/certs/supabase-prod-ca-2021.crt`).
- If you see an error like `FATAL: Address not in tenant allow_list`, your Supabase project has network restrictions enabled. In the Supabase dashboard, allowlist your server's outbound IP (and later your Hostinger backend IP), or disable the restriction.
- Never commit the real password to git.

## 3) Apply Prisma migrations
From your local machine:

```bash
cd backend
export DATABASE_URL="postgresql://postgres.<project-ref>:<YOUR-PASSWORD>@aws-1-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
export DIRECT_URL="postgresql://postgres.<project-ref>:<YOUR-PASSWORD>@aws-1-<region>.pooler.supabase.com:5432/postgres?sslmode=require"

# Optional (strict verification):
# export DATABASE_URL="postgresql://postgres:<YOUR-PASSWORD>@db.<project-ref>.supabase.co:5432/postgres?sslmode=verify-full"

npx prisma migrate deploy
npx prisma generate
```

## 3b) (Optional) Migrate existing local Postgres data into Supabase
Prisma migrations create tables, but they do not copy your existing data.

If your local database is Postgres (for example the docker-compose database), you can copy data into Supabase with:

```bash
chmod +x backend/scripts/migrate-local-postgres-to-supabase.sh

# Source: local docker-compose Postgres (example)
export SOURCE_DATABASE_URL="postgresql://brivara_user:devpassword@localhost:15432/brivara_db"

# Target: Supabase (Direct or Session pooler recommended)
export TARGET_DATABASE_URL="postgresql://postgres:<URL_ENCODED_PASSWORD>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require"

backend/scripts/migrate-local-postgres-to-supabase.sh
```

## 4) Configure your backend host
Set `DATABASE_URL` in your backend host environment to the same Supabase URL.

If your backend runs behind a proxy (common), also set:
- `TRUST_PROXY=true`

## 5) Verify
- Start backend
- Call `/api/health`
- Register/login and confirm DB writes succeed
