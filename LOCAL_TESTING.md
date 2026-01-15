# 🚀 Local Testing Guide - Brivara Capital

## Quick Start (5 minutes)

### Step 1: Generate JWT Secret
```bash
openssl rand -hex 32
```
Copy the output and update `backend/.env`:
```
JWT_SECRET="<paste-generated-secret-here>"
```

### Step 2: Configure Database (Choose One)

#### Option A: Docker PostgreSQL (Recommended)
```bash
# Already configured in docker-compose.yml
# Just run: docker-compose up -d
```

#### Option B: Local PostgreSQL
```bash
# Install PostgreSQL locally or use Docker:
docker run -d \
  --name postgres_brivara \
  -e POSTGRES_USER=brivara_user \
  -e POSTGRES_PASSWORD=brivara_password \
  -e POSTGRES_DB=brivara_db \
  -p 5432:5432 \
  postgres:15

# Update backend/.env:
DATABASE_URL="postgresql://brivara_user:brivara_password@localhost:5432/brivara_db"
```

#### Option C: Remote PostgreSQL
```bash
# Update backend/.env with your remote connection string:
DATABASE_URL="postgresql://user:password@host:5432/database"
```

### Step 3: Build & Start Services
```bash
cd /Users/macbookpro/Desktop/projects/brivara-3

# Build Docker images
docker-compose build

# Start all services
docker-compose up -d

# Verify services are running
docker-compose ps
```

Expected output:
```
NAME                COMMAND             STATUS        PORTS
brivara-frontend    npm start           Up 2 minutes  0.0.0.0:3000->3000/tcp
brivara-backend     npm start           Up 2 minutes  0.0.0.0:4000->4000/tcp
brivara-postgres    postgres            Up 2 minutes  0.0.0.0:5432->5432/tcp
brivara-redis       redis-server        Up 2 minutes  0.0.0.0:6379->6379/tcp
```

### Step 4: Run Database Migrations
```bash
docker-compose exec backend npm run prisma:migrate
```

This will:
- Run all pending Prisma migrations
- Create database tables
- Seed initial data (if configured)

### Step 5: Verify Services Are Running
```bash
# Backend health check
curl http://localhost:4000/api/health

# Expected response:
# {"status":"ok","uptime":"123.45s"}

# Frontend check
curl http://localhost:3000

# Should return HTML content
```

---

## Access Your Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000/api
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

---

## Test User Credentials

Check the seed data in `backend/scripts/seed.mjs` for test accounts:

```bash
# View seed script
cat backend/scripts/seed.mjs

# Run seed script manually (optional)
docker-compose exec backend npm run seed
```

---

## Common Testing Workflows

### Test Authentication
```bash
# Register new user
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'

# Response includes JWT token - save it:
# TOKEN="eyJhbGc..."
```

### Test Protected Routes
```bash
# Get dashboard data (replace TOKEN)
curl -X GET http://localhost:4000/api/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

### Test Admin Routes
```bash
# Get all users (admin only)
curl -X GET http://localhost:4000/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### View Database with Prisma Studio
```bash
# Open interactive database viewer
docker-compose exec backend npx prisma studio
```
Then visit: http://localhost:5555

---

## Troubleshooting

### Docker daemon not running
```bash
# On macOS with Colima
colima start

# On macOS with Docker Desktop
open /Applications/Docker.app

# Verify
docker --version
```

### Port already in use
```bash
# Find process using port (example: 4000)
lsof -i :4000

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml
```

### Database connection failed
```bash
# Check PostgreSQL is running
docker-compose ps | grep postgres

# Restart database
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### Frontend not loading
```bash
# Check Node.js version
node --version  # Should be 18+

# Rebuild images
docker-compose build --no-cache

# Clear cache and restart
docker-compose down -v
docker-compose up -d
```

### Backend API errors
```bash
# View backend logs
docker-compose logs backend -f

# Check if migrations ran
docker-compose exec backend npm run prisma:migrate

# Restart backend only
docker-compose restart backend
```

---

## Environment Variables Guide

### Backend (.env)
```
NODE_ENV=development              # dev, test, or production
DATABASE_URL=postgresql://...      # PostgreSQL connection string
JWT_SECRET=<generate-with-openssl> # 32+ character random string
JWT_EXPIRES_IN=7d                  # JWT expiration time
SMTP_HOST=smtp.gmail.com           # Email provider
SMTP_USER=your-email@gmail.com     # SMTP username
SMTP_PASSWORD=app-password         # SMTP password (Gmail: use app-specific)
FRONTEND_URL=http://localhost:3000 # Frontend origin
API_URL=http://localhost:4000      # Backend origin
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_BASE=http://localhost:4000/api        # Backend API URL
NEXT_PUBLIC_TRON_ADDRESS=T9yDVwg...                   # TRON wallet address
NEXT_PUBLIC_BEP20_ADDRESS=0xB8c77...                  # BEP20 wallet address
```

---

## Performance Testing

### Load test backend
```bash
# Install Apache Bench (macOS)
brew install httpd

# Run test (100 requests, 10 concurrent)
ab -n 100 -c 10 http://localhost:4000/api/health
```

### Monitor resource usage
```bash
# Watch Docker container stats
docker stats

# Or specific container
docker stats brivara-backend
```

---

## Production vs Development

| Feature | Development | Production |
|---------|------------|-----------|
| Database | SQLite/PostgreSQL local | Managed PostgreSQL (AWS RDS, etc.) |
| NODE_ENV | development | production |
| CORS | All localhost | Specific domains |
| JWT_SECRET | Any string | Strong 32+ char random |
| SSL | None | Required |
| Redis | Local | Managed (AWS ElastiCache, etc.) |
| Logs | Console | File/CloudWatch |

---

## Next Steps After Local Testing

1. **Verify all features work** in development environment
2. **Fix any bugs** found during testing
3. **Load test** to ensure performance is acceptable
4. **Review security** checklist in PRODUCTION_CHECKLIST.md
5. **Choose hosting platform** (see DEPLOYMENT_GUIDE.md)
6. **Deploy to staging** for final testing
7. **Deploy to production** with proper monitoring

---

## Support Resources

- **Documentation**: See [START_HERE.md](START_HERE.md)
- **Deployment**: See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **Configuration**: See [ENV_SETUP_GUIDE.md](ENV_SETUP_GUIDE.md)
- **Checklist**: See [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)

---

**Status**: ✅ Ready for local testing
**Last Updated**: December 29, 2025
**Next Action**: Run `docker-compose build && docker-compose up -d`
