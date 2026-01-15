# PostgreSQL Setup Guide

## Quick Start - Choose Your Option

### Option 1: Local PostgreSQL (Recommended for Development)

#### macOS
```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# Create database
createdb brivara

# Update .env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/brivara?schema=public"
```

#### Ubuntu/Debian
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create user and database
sudo -u postgres psql
CREATE USER brivara_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE brivara OWNER brivara_user;
GRANT ALL PRIVILEGES ON DATABASE brivara TO brivara_user;
\q

# Update .env
DATABASE_URL="postgresql://brivara_user:your_secure_password@localhost:5432/brivara?schema=public"
```

#### Windows
```bash
# Download installer from https://www.postgresql.org/download/windows/
# Run installer and set password
# Open pgAdmin and create database 'brivara'

# Update .env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/brivara?schema=public"
```

---

### Option 2: Supabase (Free Cloud PostgreSQL - Recommended for Testing)

1. **Sign up**: https://supabase.com
2. **Create project**: Choose region closest to you
3. **Get connection string**: Settings → Database → Connection String
4. **Update .env**:
```bash
# Preferred (Direct connection; requires IPv6 support on your host):
DATABASE_URL="postgresql://postgres:<URL_ENCODED_PASSWORD>@db.<PROJECT-REF>.supabase.co:5432/postgres?sslmode=require"

# IPv4-only hosts: use the Supabase Session Pooler connection string from the dashboard instead.
# It typically looks like:
# DATABASE_URL="postgresql://postgres.<PROJECT-REF>:<URL_ENCODED_PASSWORD>@aws-0-<REGION>.pooler.supabase.com:5432/postgres?sslmode=require"
```

Notes:
- If your password contains special characters (e.g. `#`, `@`, `:`), URL-encode it in the connection string.
- Prisma is generally happier with Direct or Session pooler connections than Transaction pooler for migrations.

**Benefits:**
- Free tier (500MB database)
- No installation needed
- Automatic backups
- Dashboard for monitoring

---

### Option 3: Heroku Postgres (Free Tier)

```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login

# Create app
heroku create brivara-backend

# Add PostgreSQL
heroku addons:create heroku-postgresql:essential-0

# Get connection string
heroku config:get DATABASE_URL

# Update .env with the connection string
```

---

## Migration Steps (After PostgreSQL Setup)

### 1. Update Environment Variables
```bash
cd /Users/macbookpro/Desktop/projects/brivara-3/backend

# Edit .env file and update DATABASE_URL with your PostgreSQL connection string
```

### 2. Run Database Migration
```bash
# Generate Prisma client for PostgreSQL
npx prisma generate

# Create tables and indexes
npx prisma db push

# Or use migrations (recommended for production)
npx prisma migrate dev --name init_postgresql
```

### 3. Seed Database (Optional)
```bash
# If you have seed data
npm run seed
```

### 4. Verify Connection
```bash
# Test database connection
npx prisma studio

# This opens a browser interface to view your database
# If it loads successfully, your PostgreSQL connection is working!
```

---

## Connection String Format

```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?schema=public
```

**Examples:**
- Local: `postgresql://postgres:postgres@localhost:5432/brivara?schema=public`
- Supabase: `postgresql://postgres.[password]@db.[project].supabase.co:5432/postgres`
- Heroku: `postgresql://user:pass@ec2-host.compute.amazonaws.com:5432/dbname`

**Connection Options:**
- `?schema=public` - Use public schema
- `?sslmode=require` - Require SSL (for production)
- `?connection_limit=20` - Limit connections
- `?pool_timeout=10` - Connection timeout (seconds)

---

## Testing the Migration

### 1. Check Database Tables
```bash
cd backend
npx prisma studio
```
You should see all your tables: User, Deposit, Withdrawal, etc.

### 2. Test Backend
```bash
# Start backend
npm run dev

# In another terminal, test health endpoint
curl http://localhost:4000/api/health
```

### 3. Test Registration
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "username": "testuser",
    "country": "US",
    "sponsorCode": "WELCOME"
  }'
```

---

## Troubleshooting

### Error: "Can't reach database server"
**Solution:**
- Check PostgreSQL is running: `brew services list` (macOS) or `sudo systemctl status postgresql` (Linux)
- Verify connection string in .env
- Check firewall allows port 5432

### Error: "Authentication failed"
**Solution:**
- Verify username and password in connection string
- Check PostgreSQL user exists: `psql -U postgres -c "\du"`

### Error: "Database does not exist"
**Solution:**
- Create database: `createdb brivara`
- Or via psql: `psql -U postgres -c "CREATE DATABASE brivara;"`

### Error: "SSL connection required"
**Solution:**
- Add `?sslmode=require` to connection string
- Or disable SSL (development only): `?sslmode=disable`

### Error: "Too many connections"
**Solution:**
- Reduce connection_limit in connection string
- Check for connection leaks (we fixed this with singleton pattern)
- Restart PostgreSQL: `brew services restart postgresql@15`

---

## Performance Tips

### 1. Enable Connection Pooling
Already configured in `backend/src/services/db.ts` with singleton pattern.

### 2. Monitor Connections
```bash
# Check active connections
psql -U postgres -d brivara -c "SELECT count(*) FROM pg_stat_activity;"

# Show connection details
psql -U postgres -d brivara -c "SELECT * FROM pg_stat_activity;"
```

### 3. Optimize Queries
```bash
# View slow queries
psql -U postgres -d brivara -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

### 4. Regular Maintenance
```bash
# Vacuum database (reclaim space)
psql -U postgres -d brivara -c "VACUUM ANALYZE;"

# Reindex database
psql -U postgres -d brivara -c "REINDEX DATABASE brivara;"
```

---

## Backup & Restore

### Manual Backup
```bash
# Backup database
pg_dump -U postgres brivara > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -U postgres brivara < backup_20251229.sql
```

### Automated Backups
```bash
# Add to crontab (runs daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * pg_dump -U postgres brivara > /backups/brivara_$(date +\%Y\%m\%d).sql
```

---

## Production Checklist

- [ ] Use managed PostgreSQL service (AWS RDS, Supabase, Heroku)
- [ ] Enable SSL: `?sslmode=require`
- [ ] Set strong database password (20+ chars)
- [ ] Configure automated backups
- [ ] Set up monitoring and alerts
- [ ] Limit connections: `?connection_limit=50`
- [ ] Use read replicas for heavy read workloads
- [ ] Configure firewall (only backend IP can access)
- [ ] Enable connection pooling
- [ ] Regular security updates

---

## Next Steps

1. ✅ Choose PostgreSQL option (Local, Supabase, or Heroku)
2. ✅ Update DATABASE_URL in .env
3. ✅ Run `npx prisma generate`
4. ✅ Run `npx prisma db push`
5. ✅ Test with `npx prisma studio`
6. ✅ Start backend: `npm run dev`
7. ✅ Test API endpoints
8. ✅ Review security settings in SECURITY_GUIDE.md

---

*Need help? Check PRODUCTION_SCALABILITY_REPORT.md for detailed instructions*
