# Deployment Guide for Brivara Capital

This guide covers deploying Brivara to production using Docker and various hosting platforms.

## Prerequisites

- Docker and Docker Compose installed
- Production domain name
- SSL certificate (or use Let's Encrypt)
- Environment variables configured
- PostgreSQL database ready

---

## Option 1: Docker Compose (Recommended for VPS)

### Step 1: Prepare Environment

```bash
# Clone the repository
git clone <your-repo-url>
cd brivara-3

# Create .env file with production values
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit the files with production values
nano backend/.env
nano frontend/.env
```

### Step 2: Update CORS Origins

Edit `backend/src/server.ts` to include your production domain:

```typescript
const allowed = [
  'https://yourdomain.com',
  'https://www.yourdomain.com',
  'https://api.yourdomain.com',
];
```

### Step 3: Configure Nginx

Edit `nginx.conf` with your domain:

```nginx
server_name yourdomain.com www.yourdomain.com;
ssl_certificate /etc/nginx/ssl/fullchain.pem;
ssl_certificate_key /etc/nginx/ssl/privkey.pem;
```

### Step 4: Set Up SSL Certificate

Using Let's Encrypt:

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy to nginx folder
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ssl/
sudo chmod 644 ./ssl/*.pem
```

### Step 5: Build and Start

```bash
# Build Docker images
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f

# Run database migrations
docker-compose exec backend npm run prisma:migrate
```

### Step 6: Verify Deployment

```bash
# Check health endpoints
curl http://localhost:4000/api/health
curl http://localhost:3000

# Check logs
docker-compose logs backend
docker-compose logs frontend
```

---

## Option 2: Vercel (Recommended for Frontend)

### Frontend Deployment

1. Push code to GitHub

2. Connect to Vercel:
   - Go to https://vercel.com
   - Click "Import Project"
   - Select your GitHub repository

3. Configure environment variables:
   - `NEXT_PUBLIC_API_BASE`: Your production API URL
   - `NEXT_PUBLIC_TRON_ADDRESS`: Your TRON wallet
   - `NEXT_PUBLIC_BEP20_ADDRESS`: Your BEP20 wallet

4. Deploy by pushing to `main` branch

### Backend Deployment (Use Separate Platform)

Vercel is optimized for serverless, so backend is better on:
- AWS EC2
- DigitalOcean
- Render
- Railway

---

## Option 3: AWS ECS/ECR (Enterprise)

### Push to ECR

```bash
# Create ECR repositories
aws ecr create-repository --repository-name brivara-backend --region us-east-1
aws ecr create-repository --repository-name brivara-frontend --region us-east-1

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and push
docker build -t brivara-backend backend/
docker tag brivara-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/brivara-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/brivara-backend:latest
```

### Create ECS Tasks and Services

Follow AWS documentation for:
1. Create Task Definitions
2. Create ECS Cluster
3. Create Services
4. Configure RDS for PostgreSQL
5. Set up Load Balancer

---

## Option 4: DigitalOcean App Platform

### Deployment Steps

1. Push to GitHub
2. Go to DigitalOcean App Platform
3. Create new app → Connect GitHub repo
4. Configure:
   - Service: Docker (backend)
   - Service: Next.js (frontend)
5. Set environment variables
6. Configure domain
7. Deploy

---

## Option 5: Railway.app (Simple & Fast)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add services
railway add postgresql
railway add redis

# Deploy
railway up
```

---

## Production Checklist

### Before Going Live

- [ ] Database backed up
- [ ] All environment variables set
- [ ] CORS origins updated
- [ ] SSL certificate installed
- [ ] Rate limiting working
- [ ] Logging configured
- [ ] Monitoring set up
- [ ] Backups automated
- [ ] Email service tested
- [ ] Load testing completed

### After Deployment

- [ ] Health checks passing
- [ ] All endpoints accessible
- [ ] No console errors in frontend
- [ ] Emails being sent correctly
- [ ] Authentication working
- [ ] Deposits/withdrawals functional
- [ ] Admin panel accessible
- [ ] Database populated with data
- [ ] Cron jobs running (ROI scheduler)

---

## Monitoring & Maintenance

### Log Aggregation

Using ELK Stack or similar:

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Export logs
docker-compose logs backend > backend.log
```

### Database Backups

```bash
# Manual backup
docker-compose exec postgres pg_dump -U brivara_user brivara_db > backup.sql

# Restore
docker-compose exec -T postgres psql -U brivara_user brivara_db < backup.sql
```

If you are using Supabase (managed Postgres), back up directly via the connection string:

```bash
# Backup (uses DATABASE_URL)
pg_dump --no-owner --no-privileges "$DATABASE_URL" > backup.sql

# Restore (WARNING: overwrites data if you add --clean)
psql "$DATABASE_URL" -f backup.sql
```

### Automated Backups

Add to crontab:

```bash
0 2 * * * cd /path/to/brivara-3 && docker-compose exec -T postgres pg_dump -U brivara_user brivara_db | gzip > /backups/brivara_$(date +\%Y\%m\%d).sql.gz
```

### Updates & Patches

```bash
# Update dependencies
docker-compose down
git pull origin main
docker-compose build --no-cache
docker-compose up -d
docker-compose exec backend npm run prisma:migrate
```

---

## Troubleshooting

### Container Won't Start

```bash
docker-compose logs backend
docker-compose exec backend npm run build
```

### Database Connection Error

```bash
docker-compose exec postgres psql -U brivara_user -d brivara_db
```

### Port Already in Use

```bash
lsof -i :4000
kill -9 <PID>
```

### Slow Queries

```sql
-- Enable query logging in PostgreSQL
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();
```

---

## Security Best Practices

1. **Change all default passwords** in `.env`
2. **Use strong JWT_SECRET** (32+ characters)
3. **Enable HTTPS only** in production
4. **Restrict API endpoints** by IP if possible
5. **Use environment-specific secrets** (AWS Secrets Manager, etc.)
6. **Rotate secrets regularly**
7. **Monitor failed login attempts**
8. **Keep dependencies updated**

---

## Performance Optimization

### Frontend Optimization

- Enable compression in Nginx
- Use CDN for static assets
- Implement caching headers
- Optimize images

### Backend Optimization

- Enable database connection pooling
- Add Redis caching
- Optimize database indexes
- Monitor slow queries

### Infrastructure

- Use CDN for static content
- Load balancing for multiple instances
- Database replication for HA
- Implement auto-scaling

---

## Getting Help

- Check logs: `docker-compose logs <service>`
- Test connectivity: `docker-compose exec backend npm run test`
- Inspect container: `docker exec -it brivara-backend sh`
- Review documentation in README files

