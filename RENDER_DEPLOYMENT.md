# Render deployment (Backend)

This project hosts the **database on Supabase** and the **backend API on Render**.

## 1) Create the service

1. Push the repo to GitHub.
2. In Render: **New** → **Blueprint** → select the repo.
3. Render will pick up `render.yaml` and create the `brivara-backend` service.

Health check: `https://<render-service>.onrender.com/api/health`

## 2) Set environment variables in Render

Minimum required:

- `DATABASE_URL` (Supabase **transaction pooler**, port `6543`):
  - Must include `pgbouncer=true` and `sslmode=require`.
- `DIRECT_URL` (Supabase **session pooler**, port `5432`):
  - Use for migrations; include `pgbouncer=true` and `sslmode=require`.
- `JWT_SECRET` (strong random)
- `TRANSACTION_AUTH_SECRET` (strong random)
- `FRONTEND_URL` (your public website URL)
- `WEBSITE_URL` (same as above)
- `API_URL` (your backend public base, usually `https://api.<domain>/api`)
- `CORS_ORIGINS` (comma-separated list, e.g. `https://www.example.com,https://example.com`)

Recommended:

- `TRUST_PROXY=true`
- `REDIS_URL` (if you use managed Redis for rate limiting)
- SMTP vars if you enable password reset email:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`

## 3) Migrations on deploy

Render runs `npm start`, which triggers:

- `prestart`: `prisma migrate deploy`
- `start`: `node dist/server.js`

So every deploy applies pending migrations to Supabase automatically.

## 4) Point the frontend to the backend

Set frontend env:

- `NEXT_PUBLIC_API_BASE=https://<render-service>.onrender.com/api`

If you add a custom domain (recommended):

- `NEXT_PUBLIC_API_BASE=https://api.yourdomain.com/api`

## 5) DNS + custom domain (recommended)

- Add `api.yourdomain.com` as a custom domain in Render.
- Create the DNS record Render asks for.
- Update backend env vars:
  - `API_URL=https://api.yourdomain.com/api`
  - `CORS_ORIGINS=https://www.yourdomain.com,https://yourdomain.com`

## 6) Security hygiene (do this before public launch)

- Rotate any DB passwords/keys that were ever shared.
- Use real transactional email provider (SES/SendGrid/Mailgun) for scale.
- Keep withdrawals disabled until the provider integration is fully verified.
