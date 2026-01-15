# Security Implementation Guide

## 🔒 Security Measures Implemented

### 1. Database Security
✅ **Migrated to PostgreSQL** from SQLite for production-grade security
- Connection pooling with limits
- Prepared statements (Prisma ORM)
- SQL injection prevention
- Performance indexes for faster queries

### 2. Input Validation & Sanitization
✅ **XSS Protection**
- DOMPurify integration for HTML sanitization
- All user inputs are sanitized before processing
- Attack pattern detection (XSS, SQL injection attempts)

✅ **Input Validation**
- Email validation with regex
- Wallet address validation (BEP20/TRC20 formats)
- Transaction ID validation (64-66 hex characters)
- Automatic blocking of malicious patterns

### 3. Rate Limiting (DDoS Protection)
✅ **Multi-tier Rate Limiting**
- General endpoints: 300 requests/minute per IP
- Authentication endpoints: 10 requests/minute per IP (5-min block on violation)
- IP extraction from X-Forwarded-For headers (proxy/CDN support)

### 4. HTTP Security Headers
✅ **Comprehensive Helmet Configuration**
- Content Security Policy (CSP) - prevents XSS
- X-Frame-Options: DENY - prevents clickjacking
- X-Content-Type-Options: nosniff - prevents MIME sniffing
- X-XSS-Protection: enabled
- Strict-Transport-Security (HSTS) - forces HTTPS
- Referrer-Policy: strict-origin-when-cross-origin

### 5. Authentication Security
✅ **JWT Best Practices**
- Secure token generation with strong secrets
- 7-day expiration
- Bearer token authentication
- Password hashing with bcrypt (10 rounds)

### 6. CORS Protection
✅ **Strict CORS Policy**
- Whitelist specific origins in production
- Credentials disabled for public APIs
- Preflight request handling

### 7. Request Size Limiting
✅ **Payload Protection**
- JSON payload limit: 10KB
- URL-encoded data limit: 10KB
- Prevents memory exhaustion attacks

### 8. Attack Pattern Detection
✅ **Real-time Threat Detection**
- SQL injection patterns
- XSS attempt patterns
- Path traversal attempts
- Null byte injection
- Code evaluation attempts

### 9. Sensitive Data Protection
✅ **No-Cache Headers**
- Authentication endpoints: no caching
- Wallet endpoints: no caching
- Prevents credential leakage

### 10. Connection Security
✅ **Database Connection Safety**
- Singleton Prisma Client (prevents connection leaks)
- Graceful shutdown handlers
- Connection pool management

---

## 🚨 Security Configuration Checklist

### Pre-Production Deployment

#### 1. Database Setup
- [ ] Install PostgreSQL locally OR use managed service (Supabase/Heroku)
- [ ] Update DATABASE_URL in .env
- [ ] Run: `cd backend && npx prisma migrate dev --name init_postgresql`
- [ ] Run: `npx prisma generate`
- [ ] Verify connection: `npx prisma db push`

#### 2. Environment Variables
- [ ] Generate strong JWT_SECRET: `openssl rand -base64 32`
- [ ] Generate WITHDRAWAL_SIGNATURE_SECRET: `openssl rand -base64 32`
- [ ] Update all secrets in .env
- [ ] Never commit .env to git (add to .gitignore)

#### 3. SSL/HTTPS Setup (Production)
- [ ] Obtain SSL certificate (Let's Encrypt recommended)
- [ ] Configure reverse proxy (Nginx/Caddy)
- [ ] Redirect HTTP to HTTPS
- [ ] Update FRONTEND_URL and API_URL to use https://

#### 4. CORS Configuration
- [ ] Update allowed origins in server.ts
- [ ] Remove wildcard (*) from production
- [ ] Add only production domains

#### 5. Email Security
- [ ] Use app-specific passwords (not main password)
- [ ] Enable 2FA on email account
- [ ] Consider dedicated SMTP service (SendGrid, Mailgun)

#### 6. Wallet Security
- [ ] Store private keys in environment variables ONLY
- [ ] Never commit private keys to git
- [ ] Use hardware wallet for large amounts
- [ ] Keep BEP20 master wallet in cold storage
- [ ] Only fund withdrawal wallet with necessary amounts

---

## 🛡️ Additional Security Recommendations

### 1. API Key Rotation
Rotate sensitive keys every 90 days:
```bash
# Generate new JWT secret
openssl rand -base64 32

# Generate new withdrawal signature secret
openssl rand -base64 32
```

### 2. Monitoring & Alerts
Set up monitoring for:
- Failed login attempts (>5 in 5 minutes)
- Multiple deposits from same IP
- Large withdrawal requests
- Unusual transaction patterns
- Error rate spikes
- Database connection exhaustion

**Recommended Services:**
- Sentry (error tracking)
- Datadog (infrastructure monitoring)
- CloudWatch (if using AWS)
- Uptime Robot (uptime monitoring)

### 3. Backup Strategy
- **Database Backups**: Daily automated backups
- **Retention**: Keep backups for 30 days
- **Test Restores**: Monthly restore tests
- **Offsite Storage**: S3, Google Cloud Storage, or Backblaze

### 4. Incident Response Plan
1. **Detection**: Monitor alerts and logs
2. **Containment**: Disable affected endpoints
3. **Investigation**: Review logs and database
4. **Recovery**: Restore from backup if needed
5. **Post-mortem**: Document and improve

### 5. Regular Security Audits
- **Weekly**: Review failed auth attempts
- **Monthly**: Check for dependency vulnerabilities (`npm audit`)
- **Quarterly**: Full security assessment
- **Annually**: Third-party security audit

---

## 🔐 Password Policy

### User Passwords
Current validation in place:
- Minimum 8 characters
- At least one uppercase letter
- At least one number
- At least one special character

### Admin Passwords
For admin accounts (when implemented):
- Minimum 12 characters
- Mix of upper, lower, numbers, special chars
- 2FA required
- Rotate every 60 days

---

## 🚫 Common Attack Vectors Mitigated

### 1. SQL Injection ✅ PROTECTED
- Using Prisma ORM (prepared statements)
- Input sanitization
- Pattern detection

### 2. XSS (Cross-Site Scripting) ✅ PROTECTED
- DOMPurify sanitization
- CSP headers
- HTML tag stripping

### 3. CSRF (Cross-Site Request Forgery) ✅ PROTECTED
- JWT-based authentication (stateless)
- No cookies used
- CORS restrictions

### 4. DDoS (Distributed Denial of Service) ✅ PROTECTED
- Rate limiting (300 req/min general)
- Payload size limits (10KB)
- Connection pool limits

### 5. Brute Force Attacks ✅ PROTECTED
- Auth rate limit (10 req/min)
- 5-minute IP blocking
- Account lockout (can be added)

### 6. Clickjacking ✅ PROTECTED
- X-Frame-Options: DENY
- CSP frame-ancestors 'none'

### 7. MIME Sniffing ✅ PROTECTED
- X-Content-Type-Options: nosniff

### 8. Man-in-the-Middle (MitM) ✅ PROTECTED (when HTTPS enabled)
- HSTS header
- Secure cookie flags
- TLS 1.2+ only

### 9. Path Traversal ✅ PROTECTED
- Pattern detection
- Input validation

### 10. Code Injection ✅ PROTECTED
- No eval() usage
- Input sanitization
- Pattern detection

---

## 📊 Security Testing

### Manual Testing
Test these attack vectors:

#### 1. SQL Injection Test
```bash
# Try SQL injection in login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com'\'' OR '\''1'\''='\''1","password":"anything"}'
```
**Expected**: 400 Bad Request (blocked by pattern detection)

#### 2. XSS Test
```bash
# Try XSS in registration
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"<script>alert(1)</script>","password":"Test123!@#","country":"US","sponsorCode":"ABC123"}'
```
**Expected**: Script tags stripped/sanitized

#### 3. Rate Limit Test
```bash
# Try 15 login attempts rapidly
for i in {1..15}; do
  curl -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' &
done
```
**Expected**: 429 Too Many Requests after 10 attempts

#### 4. Payload Size Test
```bash
# Try sending large payload
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "$(python3 -c 'import json; print(json.dumps({"data": "A" * 20000}))')"
```
**Expected**: 413 Payload Too Large

### Automated Security Scanning

#### OWASP ZAP (Free)
```bash
# Install ZAP
brew install --cask owasp-zap  # macOS
# or download from https://www.zaproxy.org

# Run automated scan
zap-cli quick-scan --self-contained --start-options '-config api.disablekey=true' http://localhost:4000
```

#### npm audit (Dependency Vulnerabilities)
```bash
cd backend
npm audit
npm audit fix  # Fix automatically

cd ../frontend
npm audit
npm audit fix
```

#### Snyk (Advanced - Free tier)
```bash
npm install -g snyk
snyk auth
snyk test
```

---

## 🌐 Production Deployment Security

### 1. Environment Setup
```bash
# .env.production (NEVER commit)
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@db.server.com:5432/brivara?sslmode=require
JWT_SECRET=$(openssl rand -base64 32)
WITHDRAWAL_SIGNATURE_SECRET=$(openssl rand -base64 32)
FRONTEND_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com
```

### 2. Nginx Reverse Proxy (Recommended)
```nginx
# /etc/nginx/sites-available/brivara
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### 3. Firewall Configuration
```bash
# Ubuntu/Debian with UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable

# Only allow database access from backend server
sudo ufw allow from YOUR_BACKEND_IP to any port 5432
```

### 4. System Hardening
```bash
# Disable root SSH login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Disable password authentication (use SSH keys)
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# Restart SSH
sudo systemctl restart sshd

# Keep system updated
sudo apt update && sudo apt upgrade -y

# Install fail2ban (prevents brute force)
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 📝 Security Logging

All security events are logged:
- Failed authentication attempts
- Rate limit violations
- Attack pattern detections
- Database connection issues
- Unusual withdrawal requests

**Log Location**: Console output (configure log aggregation for production)

**Recommended Log Services**:
- Papertrail
- Loggly
- AWS CloudWatch Logs
- Datadog Logs

---

## 🔄 Security Update Process

### Monthly
1. Run `npm audit` and fix vulnerabilities
2. Update dependencies: `npm update`
3. Review security logs
4. Check for failed login patterns

### Quarterly
1. Rotate JWT secrets
2. Update Node.js to latest LTS
3. Update all dependencies to latest stable
4. Review and update CORS whitelist
5. Test disaster recovery procedure

### Annually
1. Full security audit (consider hiring professionals)
2. Penetration testing
3. Update SSL certificates
4. Review and update all passwords
5. Test all monitoring and alerting

---

## 🆘 Emergency Procedures

### If Hacked
1. **Immediately**: Take system offline
2. **Change**: All passwords and secrets
3. **Review**: All logs for entry point
4. **Restore**: From last known good backup
5. **Notify**: Affected users
6. **Report**: To authorities if necessary
7. **Document**: Everything for post-mortem

### Suspicious Activity
1. Check logs for IP addresses
2. Block suspicious IPs in firewall
3. Monitor for similar patterns
4. Consider enabling additional rate limiting

### Database Compromise
1. Immediately disconnect database
2. Change all database credentials
3. Restore from backup
4. Review all database logs
5. Check for unauthorized queries
6. Re-encrypt sensitive data

---

## ✅ Security Compliance

### GDPR Compliance (if serving EU users)
- [ ] User data export capability
- [ ] User data deletion capability
- [ ] Cookie consent banner
- [ ] Privacy policy
- [ ] Data processing agreement
- [ ] Right to be forgotten implementation

### PCI DSS (if handling credit cards)
Not currently applicable (using cryptocurrency only)

### SOC 2 (for enterprise customers)
Consider if scaling to enterprise level

---

## 📞 Security Contacts

### Report Security Vulnerability
Email: security@brivaracapital.com (set this up)

### Bug Bounty Program
Consider setting up on:
- HackerOne
- Bugcrowd
- Synack

---

*Last Updated: December 29, 2025*
*Review Security Measures: Monthly*
