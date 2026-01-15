# Environment Variables Setup Guide

## Backend Environment Variables

### Required Variables

```bash
# Server Configuration
NODE_ENV=production                    # Set to 'production' for deployments
PORT=4000                              # Port to run backend on

# Database (CRITICAL)
DATABASE_URL=postgresql://user:password@host:5432/brivara_db

# JWT Authentication
JWT_SECRET=your-very-secure-random-string-32chars
JWT_EXPIRES_IN=7d                      # Token expiration

# Email Service (SMTP)
SMTP_HOST=smtp.gmail.com               # Your SMTP provider
SMTP_PORT=587                          # Usually 587 for TLS or 465 for SSL
SMTP_SECURE=true                       # true for SSL/TLS, false for SMTP
SMTP_USER=your-email@gmail.com         # SMTP username
SMTP_PASS=your-app-password            # SMTP password (use app-specific password for Gmail)
EMAIL_FROM=noreply@brivara.com         # From address for emails
```

### Optional Variables

```bash
# Business Logic
DEPOSIT_FEE_PERCENT=1.5                # Fee charged on deposits
MIN_WITHDRAWAL=10                      # Minimum withdrawal amount
WITHDRAWAL_FEE_PERCENT=5               # Withdrawal fee percentage

# Redis (for rate limiting, caching)
REDIS_URL=redis://:password@localhost:6379

# Logging
LOG_LEVEL=info                         # debug, info, warn, error

# Blockchain Integration
TATUM_API_KEY=your-tatum-api-key       # For blockchain transactions
```

## Frontend Environment Variables

### Required Variables

```bash
# API Configuration (CRITICAL)
NEXT_PUBLIC_API_BASE=https://api.yourdomain.com/api

# Wallet Addresses for Deposits
NEXT_PUBLIC_TRON_ADDRESS=T9yDVwgFoLM8j6MV2...     # Your TRON wallet
NEXT_PUBLIC_BEP20_ADDRESS=0xB8c77482e45F1F44...   # Your BEP20 wallet
```

### Optional Variables

```bash
# Analytics
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX

# Error Tracking
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# Feature Flags
NEXT_PUBLIC_MAINTENANCE_MODE=false
NEXT_PUBLIC_ENABLE_DEPOSITS=true
```

---

## Generate Secure Values

### JWT_SECRET Generation

```bash
# Using openssl (Linux/Mac)
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### SMTP Configuration Examples

#### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-digit-app-password    # Generate at myaccount.google.com/app-passwords
EMAIL_FROM=your-email@gmail.com
```

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
```

#### AWS SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-username
SMTP_PASS=your-ses-password
EMAIL_FROM=noreply@yourdomain.com
```

#### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@mg.yourdomain.com
SMTP_PASS=your-mailgun-password
EMAIL_FROM=noreply@yourdomain.com
```

---

## Setting Up Environment Files

### Step 1: Create .env Files

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

### Step 2: Generate Secrets

```bash
# Generate JWT_SECRET
JWT_SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET=$JWT_SECRET" >> backend/.env
```

### Step 3: Configure Database

For development (PostgreSQL):
```env
# Local docker-compose database (this repo maps Postgres to host port 15432)
DATABASE_URL=postgresql://brivara_user:devpassword@localhost:15432/brivara_db
```

Note: SQLite is no longer supported (Prisma is configured for PostgreSQL).

For production (PostgreSQL):
```env
DATABASE_URL=postgresql://brivara_user:secure_password@your-db-host:5432/brivara_db
```

For production (Supabase PostgreSQL):
```env
DATABASE_URL=postgresql://postgres.<project-ref>:<YOUR-PASSWORD>@aws-1-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
DIRECT_URL=postgresql://postgres.<project-ref>:<YOUR-PASSWORD>@aws-1-<region>.pooler.supabase.com:5432/postgres?sslmode=require

# Optional (strict verification):
# DIRECT_URL=postgresql://postgres.<project-ref>:<YOUR-PASSWORD>@aws-1-<region>.pooler.supabase.com:5432/postgres?sslmode=verify-full
```

If you get `FATAL: Address not in tenant allow_list`, check Supabase project network restrictions/allowlist settings and add your server's outbound IP.

Apply Prisma migrations to Supabase (recommended from your machine/CI):
```bash
cd backend
export DATABASE_URL="postgresql://postgres.<project-ref>:<YOUR-PASSWORD>@aws-1-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
export DIRECT_URL="postgresql://postgres.<project-ref>:<YOUR-PASSWORD>@aws-1-<region>.pooler.supabase.com:5432/postgres?sslmode=require"

# Optional (strict verification):
# export DATABASE_URL="postgresql://postgres:<YOUR-PASSWORD>@db.<project-ref>.supabase.co:5432/postgres?sslmode=verify-full"
npx prisma migrate deploy
npx prisma generate
```

If you use `sslmode=verify-full` in Docker, the backend image trusts Supabase Root 2021 CA via `backend/certs/supabase-prod-ca-2021.crt`.

### Step 4: Set Up SMTP

Choose your email service and add credentials.

### Step 5: Add Wallet Addresses

```env
NEXT_PUBLIC_TRON_ADDRESS=<your-tron-wallet>
NEXT_PUBLIC_BEP20_ADDRESS=<your-bep20-wallet>
```

### Step 6: Update API Base URL

For production:
```env
NEXT_PUBLIC_API_BASE=https://api.yourdomain.com/api
```

For development:
```env
NEXT_PUBLIC_API_BASE=http://localhost:4000/api
```

---

## Environment-Specific Configurations

### Development

```env
# backend/.env
NODE_ENV=development
JWT_SECRET=dev-secret-key
DATABASE_URL=file:./prisma/dev.db
SMTP_HOST=smtp.ethereal.email
```

### Staging

```env
# backend/.env.staging
NODE_ENV=staging
DATABASE_URL=postgresql://user:pass@staging-db:5432/brivara_staging
SMTP_HOST=smtp.gmail.com
```

### Production

```env
# backend/.env.production
NODE_ENV=production
JWT_SECRET=<use-secure-generated-value>
DATABASE_URL=postgresql://user:pass@prod-db:5432/brivara_db
SMTP_HOST=<production-smtp>
SMTP_SECURE=true
```

---

## Validation Checklist

- [ ] `NODE_ENV` set correctly for your environment
- [ ] `JWT_SECRET` is strong (32+ chars) and unique
- [ ] `DATABASE_URL` points to correct database
- [ ] SMTP credentials are valid and tested
- [ ] `NEXT_PUBLIC_API_BASE` matches backend URL
- [ ] Wallet addresses are correct (copy-paste verified)
- [ ] No secrets committed to git (check `.gitignore`)
- [ ] All required variables set (no undefined)

---

## Security Best Practices

### DO
✅ Use strong, random passwords
✅ Use app-specific passwords for email (not main password)
✅ Rotate secrets periodically
✅ Store secrets in secure secret manager
✅ Use HTTPS for all URLs
✅ Keep `.env` files local (never commit)

### DON'T
❌ Hardcode secrets in code
❌ Use simple/weak passwords
❌ Share `.env` files via email/slack
❌ Use HTTP in production
❌ Commit `.env` to git (add to `.gitignore`)
❌ Reuse JWT_SECRET across environments

---

## Troubleshooting

### "SMTP Error: Invalid credentials"
- Verify SMTP username and password
- Check if Gmail/SendGrid requires app-specific password
- Verify SMTP_HOST and SMTP_PORT are correct

### "Database connection refused"
- Check DATABASE_URL format
- Verify database server is running
- Check database credentials

### "API calls failing from frontend"
- Verify NEXT_PUBLIC_API_BASE is correct
- Check CORS configuration in backend
- Ensure API is accessible from frontend URL

### "Emails not sending"
- Check EMAIL_FROM format
- Verify SMTP credentials
- Check spam/junk folders
- View server logs for errors

