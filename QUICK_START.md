# 🚀 IMMEDIATE ACTIONS - Production Launch Roadmap

## ⏰ Timeline: 7-10 Days to Production

### DAY 1-2: Critical Fixes (Today & Tomorrow)

#### 1. Fix Server Binding ⚡ (15 mins)
**File**: [backend/src/server.ts](backend/src/server.ts)  
**Line**: 52  
**Change**:
```typescript
// FROM:
app.listen(port, '127.0.0.1', () => {

// TO:
app.listen(port, '0.0.0.0', () => {
```
**Why**: Makes server accessible from internet, not just localhost

#### 2. Update Database to PostgreSQL ⚡ (30 mins)
**File**: [backend/prisma/schema.prisma](backend/prisma/schema.prisma)  
**Line**: 6-8  
**Change**:
```prisma
datasource db {
  provider = "postgresql"  # Change from "sqlite"
  url      = env("DATABASE_URL")
}
```
**Why**: SQLite doesn't support concurrent connections or persistent data

#### 3. Generate Strong JWT Secret ⚡ (5 mins)
```bash
# Run this in terminal
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy output and update backend/.env
JWT_SECRET=<paste-the-output>
```

#### 4. Update CORS Origins ⚡ (10 mins)
**File**: [backend/src/server.ts](backend/src/server.ts)  
**Lines**: 29-33  
**Change**:
```typescript
const allowed = [
  'https://yourdomain.com',
  'https://www.yourdomain.com',
  // Remove localhost URLs
];
```
**Why**: Production must reject requests from non-approved domains

---

### DAY 2: Environment & Infrastructure Setup

#### 5. Set Up PostgreSQL ⚡ (Optional - skip if using cloud DB)
```bash
# Option A: Local PostgreSQL (development)
brew install postgresql  # Mac
psql -U postgres
CREATE DATABASE brivara_db;
CREATE USER brivara_user WITH PASSWORD 'strong_password';
ALTER DATABASE brivara_db OWNER TO brivara_user;

# Option B: Cloud PostgreSQL (recommended for production)
# Use: AWS RDS, DigitalOcean Managed DB, or ElephantSQL
# Copy connection string to backend/.env as DATABASE_URL
```

#### 6. Configure Email Service ⚡ (20 mins)
Choose one:

**Option A: Gmail** (Easiest for small projects)
```bash
# 1. Enable 2FA in Google Account
# 2. Generate app password: myaccount.google.com/app-passwords
# 3. Update backend/.env:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=<16-char-app-password>
EMAIL_FROM=your-email@gmail.com
```

**Option B: SendGrid** (Recommended for production)
```bash
# 1. Sign up at sendgrid.com
# 2. Create API key
# 3. Update backend/.env:
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
```

#### 7. Configure Frontend Environment ⚡ (10 mins)
**File**: [frontend/.env.local](frontend/.env.local)
```env
NEXT_PUBLIC_API_BASE=https://api.yourdomain.com/api
NEXT_PUBLIC_TRON_ADDRESS=<your-tron-wallet-address>
NEXT_PUBLIC_BEP20_ADDRESS=<your-bep20-wallet-address>
```

---

### DAY 3: Docker & Testing

#### 8. Test Docker Build Locally ⚡ (20 mins)
```bash
# Build images
docker-compose build

# Verify images created
docker images | grep brivara

# Test services start
docker-compose up -d

# Check health
curl http://localhost:4000/api/health
curl http://localhost:3000

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

#### 9. Run Database Migrations ⚡ (10 mins)
```bash
# Generate Prisma client
docker-compose exec backend npm run prisma:generate

# Run migrations
docker-compose exec backend npm run prisma:migrate

# Verify database
docker-compose exec postgres psql -U brivara_user -d brivara_db -c "\dt"
```

---

### DAY 4-5: Choose Hosting Platform

#### Option A: Docker Compose on VPS (DigitalOcean/Linode)
```bash
# 1. Create VPS (Ubuntu 22.04, 2GB RAM)
# 2. SSH into server
ssh root@your.server.ip

# 3. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 4. Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 5. Clone repo
git clone https://github.com/yourusername/brivara-3.git
cd brivara-3

# 6. Update .env files
nano backend/.env
nano frontend/.env

# 7. Build and start
docker-compose build
docker-compose up -d

# 8. Set up SSL
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --standalone -d yourdomain.com
# Copy certs to ./ssl/

# 9. Restart with Nginx
docker-compose restart

# 10. Set up auto-renewal
sudo certbot renew --dry-run
```

#### Option B: Vercel (Frontend) + VPS (Backend)
```bash
# Frontend
# 1. Push code to GitHub
# 2. Go to vercel.com → Import Project
# 3. Set environment variables
# 4. Deploy (auto-updates on push to main)

# Backend
# Follow Option A above
```

---

### DAY 6: Domain & SSL Setup

#### 10. Configure Domain Name ⚡ (15 mins)
```bash
# Point your domain to server IP in DNS:
yourdomain.com      A   your.server.ip
www.yourdomain.com  A   your.server.ip
api.yourdomain.com  A   your.server.ip
```

#### 11. Install SSL Certificate ⚡ (10 mins)
```bash
# On your server:
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy to Docker volume:
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /path/to/brivara-3/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /path/to/brivara-3/ssl/

# Update nginx.conf with your domain
nano nginx.conf  # Uncomment and update lines 95-96

# Restart containers
docker-compose restart
```

#### 12. Enable Auto-renewal ⚡ (5 mins)
```bash
# Add to crontab
sudo crontab -e

# Add this line:
0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /path/to/brivara-3/ssl/ && cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /path/to/brivara-3/ssl/
```

---

### DAY 7: Testing & Monitoring

#### 13. Test Production Environment ⚡
```bash
# Test HTTPS
curl https://yourdomain.com
curl https://yourdomain.com/api/health

# Test API
curl -X POST https://yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","username":"testuser","country":"US","sponsorCode":"admin"}'

# Test frontend loads
open https://yourdomain.com
```

#### 14. Set Up Monitoring ⚡
```bash
# Option A: Basic (built-in)
docker-compose logs -f backend
docker-compose logs -f frontend

# Option B: Better (Datadog, New Relic, or Sentry)
# Sign up and add monitoring to your app
```

#### 15. Automate Backups ⚡
```bash
# Add to crontab
0 2 * * * docker-compose exec -T postgres pg_dump -U brivara_user brivara_db | gzip > /backups/brivara_$(date +\%Y\%m\%d).sql.gz
```

---

### DAY 8: Soft Launch

#### 16. Announce Beta ⚡
- [ ] Email early users about launch
- [ ] Monitor error logs closely
- [ ] Be ready to quickly fix issues
- [ ] Collect user feedback

---

### DAY 9-10: Public Launch

#### 17. Final Checks
- [ ] All health checks passing
- [ ] User registration working
- [ ] Email notifications sending
- [ ] Deposits/withdrawals functional
- [ ] Admin panel accessible
- [ ] No console errors in browser
- [ ] Page load times acceptable

#### 18. Promote
- [ ] Social media announcements
- [ ] Email campaigns
- [ ] Website updates
- [ ] SEO configuration

---

## 📋 Pre-Launch Checklist

### Code
- [ ] Server binding fixed (0.0.0.0)
- [ ] Database set to PostgreSQL
- [ ] CORS updated with production domain
- [ ] ROI scheduler enabled
- [ ] No console errors
- [ ] All endpoints tested

### Configuration
- [ ] JWT_SECRET generated and set
- [ ] DATABASE_URL configured
- [ ] SMTP credentials set and tested
- [ ] API_BASE_URL set in frontend
- [ ] Wallet addresses configured
- [ ] All .env files updated

### Infrastructure
- [ ] PostgreSQL database created and tested
- [ ] Docker images build successfully
- [ ] Docker containers start properly
- [ ] Health checks passing
- [ ] Nginx reverse proxy working
- [ ] SSL certificate installed
- [ ] Domain DNS pointing to server

### Monitoring
- [ ] Logging configured
- [ ] Error tracking enabled
- [ ] Database backups automated
- [ ] SSL auto-renewal configured
- [ ] Health check endpoints working
- [ ] Alert system configured

### Testing
- [ ] User registration works
- [ ] Login/authentication works
- [ ] API endpoints respond correctly
- [ ] Frontend loads without errors
- [ ] Email notifications send
- [ ] Mobile responsive design works
- [ ] Payment processing works (if applicable)

---

## 🆘 Troubleshooting Quick Links

| Issue | Solution |
|-------|----------|
| `Connection refused` | Check server binding is `0.0.0.0` |
| `Database error` | Verify DATABASE_URL in .env |
| `CORS error` | Update allowed origins in server.ts |
| `Port already in use` | Kill process: `lsof -i :4000 \| kill -9 PID` |
| `Docker build fails` | Check Dockerfile syntax and build logs |
| `Email not sending` | Verify SMTP credentials in .env |
| `Frontend won't load` | Check NEXT_PUBLIC_API_BASE environment variable |

---

## 📞 Support Resources

- **Docker Docs**: https://docs.docker.com
- **PostgreSQL Docs**: https://www.postgresql.org/docs
- **Express.js**: https://expressjs.com
- **Next.js**: https://nextjs.org/docs
- **Stack Overflow**: Tag your questions with `[brivara]` or framework name

---

## ✅ Success Criteria

Your launch is successful when:

1. ✅ Users can register and log in
2. ✅ Dashboard displays correct data
3. ✅ Users can make deposits/withdrawals
4. ✅ Email notifications send on time
5. ✅ Admin panel works
6. ✅ No errors in logs
7. ✅ Response time < 2 seconds
8. ✅ 99%+ uptime

---

**Start Date**: December 29, 2025
**Target Launch**: January 7, 2025
**Estimated Hours**: 20-30 active hours (spread over 7 days)

Good luck! You've got this! 🎉
