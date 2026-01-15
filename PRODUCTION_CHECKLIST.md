# Brivara Production Deployment Checklist

## 🔴 CRITICAL ISSUES (Must Fix Before Hosting)

### 1. **Missing Environment Configuration Files**
- ❌ No `.env.example` files for backend or frontend
- ❌ No `.env.production` configuration templates
- **Impact**: Deployment will fail; no way to set production variables
- **Action**: Create `.env.example` for both backend and frontend with all required variables

### 2. **Database Issues**
- ❌ Schema uses SQLite (`provider = "sqlite"`) - NOT suitable for production
- ❌ README mentions PostgreSQL but schema uses SQLite
- **Impact**: SQLite will lose data when container restarts; can only handle single-user
- **Action**: 
  - Change schema to PostgreSQL: `provider = "postgresql"`
  - Update `DATABASE_URL` to use PostgreSQL connection string
  - Run migrations on PostgreSQL

### 3. **Missing Docker Configuration**
- ❌ No `Dockerfile` for backend
- ❌ No `Dockerfile` for frontend
- ❌ No `docker-compose.yml` for orchestration
- ❌ No `.dockerignore` files
- **Impact**: Cannot containerize or deploy to cloud platforms (AWS, Heroku, Vercel, etc.)
- **Action**: Create Docker files for production-ready deployment

### 4. **Missing Server Binding Configuration**
- ⚠️ Backend listens on `127.0.0.1` only (localhost)
  ```typescript
  app.listen(port, '127.0.0.1', () => {...})
  ```
- **Impact**: Unreachable from internet/other containers
- **Action**: Change to `0.0.0.0` for production

---

## 🟠 HIGH PRIORITY (Required for Production)

### 5. **Missing Environment Variables Documentation**
Required variables NOT documented:
- `JWT_SECRET` - Generate strong production key
- `JWT_EXPIRES_IN` - Set expiration time
- `NODE_ENV` - Must be "production"
- `PORT` - Set port (typically 3000/4000)
- `DATABASE_URL` - PostgreSQL connection string
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email configuration
- `SMTP_SECURE` - TLS/SSL setting
- `EMAIL_FROM` - Sender email address
- `DEPOSIT_FEE_PERCENT` - Default 1.5% (fallback exists)
- `NEXT_PUBLIC_API_BASE` - Frontend API endpoint
- `NEXT_PUBLIC_TRON_ADDRESS` - Wallet address for TRC20
- `NEXT_PUBLIC_BEP20_ADDRESS` - Wallet address for BEP20

### 6. **Missing Deployment Configuration**
- ❌ No `vercel.json` for Vercel deployment
- ❌ No `.github/workflows` for CI/CD
- ❌ No production build scripts
- **Action**: Add deployment configs for chosen platform

### 7. **CORS Configuration Issues**
- ⚠️ Production CORS only allows hardcoded localhost URLs
  ```typescript
  const allowed = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    // ... more localhost URLs
  ];
  ```
- **Impact**: Will reject requests from actual domain
- **Action**: Update with actual production domain

### 8. **Rate Limiting Insufficient**
- ⚠️ Uses in-memory RateLimiterMemory
  ```typescript
  const limiter = new RateLimiterMemory({ points: 100, duration: 60 });
  ```
- **Impact**: Resets on server restart; no persistence; won't scale
- **Action**: Switch to Redis-based rate limiting for production

### 9. **Missing Error Handling & Logging**
- ❌ No centralized error handling middleware
- ❌ No logging system (structured logs for debugging)
- ❌ No monitoring/alerting setup
- **Action**: Add Winston/Pino for logging; implement error handler

### 10. **Missing Security Headers**
- ⚠️ CSP header allows `unsafe-inline` and `unsafe-eval` for scripts
  ```typescript
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  ```
- ❌ No HTTPS/SSL configuration
- **Action**: 
  - Use HTTPS in production
  - Remove unsafe directives from CSP
  - Add HSTS max-age optimization

---

## 🟡 MEDIUM PRIORITY (Important Features)

### 11. **Scheduled Tasks Not Running**
- ⚠️ ROI scheduler is commented out in server.ts:
  ```typescript
  // try {
  //   scheduleDailyROI();
  // } catch (e) {
  //   console.error('Failed to start ROI scheduler:', (e as any)?.message || e);
  // }
  ```
- **Impact**: Daily ROI won't be calculated
- **Action**: Uncomment and test; or use separate cron service

### 12. **Missing API Documentation**
- ❌ No OpenAPI/Swagger docs
- ❌ No API endpoint documentation
- **Action**: Generate with Swagger/OpenAPI for API clarity

### 13. **Database Backup Strategy**
- ❌ No backup scripts
- ❌ No migration rollback plan
- **Action**: Implement automated backups (daily)

### 14. **Prisma Configuration Issues**
- ⚠️ Using custom `prisma.config.ts` (non-standard)
- Should use standard `prisma` config in `package.json`
- **Action**: Move to standard Prisma configuration

---

## 🟢 NICE TO HAVE (Optimization)

### 15. **Frontend Optimization**
- ⚠️ Static API base with fallback:
  ```typescript
  const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api'
  ```
- ⚠️ Hardcoded wallet addresses with defaults
- **Action**: Use environment variables consistently

### 16. **Missing Monitoring**
- ❌ No health check endpoint (only `/api/health`)
- ❌ No performance metrics
- **Action**: Add Datadog/New Relic/CloudWatch integration

### 17. **Missing Tests**
- ❌ Only activation demo test
- ❌ No unit tests, integration tests, e2e tests
- **Action**: Add Jest/Vitest test suite

### 18. **Code Compilation**
- ⚠️ Build output goes to `dist/` but needs verification
- ⚠️ `tsx` used in dev, but production uses `node dist/server.js`
- **Action**: Ensure build process works; test built output

---

## 📋 ACTION PLAN (Priority Order)

### Phase 1: Critical (Do First)
1. Create `.env.example` files for backend and frontend
2. Migrate database from SQLite to PostgreSQL
3. Fix server binding: `0.0.0.0` instead of `127.0.0.1`
4. Update CORS to use actual production domain
5. Create Docker files (Dockerfile, docker-compose.yml)

### Phase 2: Important (Do Before Launch)
6. Implement Redis-based rate limiting
7. Add centralized error handling
8. Set up structured logging
9. Fix security headers (remove unsafe-inline)
10. Uncomment and test scheduled ROI task
11. Update Prisma config to standard format

### Phase 3: Polish (Before Public)
12. Add API documentation (Swagger)
13. Create CI/CD pipeline (GitHub Actions)
14. Set up automated backups
15. Add comprehensive tests
16. Set up monitoring/alerting

---

## 🔧 Quick Reference: Required Environment Variables

### Backend
```env
# Server
NODE_ENV=production
PORT=4000
JWT_SECRET=<generate-strong-key>
JWT_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://user:password@host:5432/brivara

# Email
SMTP_HOST=smtp.provider.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-email@provider.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@brivara.com

# Business Logic
DEPOSIT_FEE_PERCENT=1.5

# Tatum API (if needed)
# TATUM_API_KEY=your-key
```

### Frontend
```env
NEXT_PUBLIC_API_BASE=https://api.yourdomain.com/api
NEXT_PUBLIC_TRON_ADDRESS=T...
NEXT_PUBLIC_BEP20_ADDRESS=0x...
```

---

## ✅ Verification Checklist

- [ ] Database migrated to PostgreSQL
- [ ] Docker images build successfully
- [ ] All environment variables documented
- [ ] CORS updated for production domain
- [ ] Server listens on 0.0.0.0
- [ ] Rate limiting uses Redis
- [ ] Error handling middleware implemented
- [ ] Security headers optimized
- [ ] Scheduled tasks running
- [ ] Logging system configured
- [ ] API documentation generated
- [ ] CI/CD pipeline set up
- [ ] Tests passing
- [ ] Monitoring configured
- [ ] Backups automated
