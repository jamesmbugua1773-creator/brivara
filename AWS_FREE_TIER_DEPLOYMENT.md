# AWS Free Tier Deployment (RDS Postgres + EC2 Backend)

This repo already supports Docker Compose. For AWS Free Tier, the cleanest path is:

- **Database**: AWS RDS PostgreSQL (Free Tier)
- **Backend**: EC2 t3.micro/t2.micro running Docker (Free Tier)
- **Frontend**: Hostinger (static hosting) or another static host (keeps EC2 small)

> Note: ALB, NAT gateways, and some managed services can add cost. The steps below avoid them.

---

## 1) Create RDS PostgreSQL (Free Tier)

1. AWS Console → **RDS** → **Create database**
2. Engine: **PostgreSQL**
3. Template: **Free tier**
4. DB instance: **db.t3.micro** (or db.t2.micro depending on region)
5. Storage: keep within Free Tier limits
6. **Public access: No** (recommended)
7. VPC: default is OK for MVP
8. Create a **Security Group** for RDS:
   - Inbound: allow **PostgreSQL 5432** only from the EC2 security group (next step)
9. Create database and note:
   - Endpoint hostname
   - Port
   - DB name, username, password

**Connection string example (use TLS):**

`postgresql://USER:PASSWORD@YOUR-RDS-ENDPOINT:5432/DBNAME?sslmode=require`

---

## 2) Create EC2 instance (Free Tier)

1. AWS Console → **EC2** → **Launch instance**
2. AMI: Ubuntu LTS
3. Type: t3.micro/t2.micro
4. Storage: 20–30GB (watch Free Tier limits)
5. Security Group (EC2):
   - Inbound 22 (SSH): your IP only
   - Inbound 80/443: 0.0.0.0/0
   - (Optional) No need to expose 4001 publicly if Nginx is proxying
6. IAM role (optional but recommended): allow SSM if you prefer Session Manager

---

## 3) Install Docker on EC2

SSH into EC2 then:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

---

## 4) Deploy backend using AWS compose file

On EC2:

```bash
git clone <your-repo-url>
cd brivara-3
cp .env.aws.example .env.aws
nano .env.aws
```

Fill `DATABASE_URL` with your RDS string (use `sslmode=require`). Fill all secrets.

Run:

```bash
docker compose --env-file .env.aws -f docker-compose.aws.yml up -d --build
```

Check:

```bash
docker ps
curl -sS http://localhost:4001/api/health
```

---

## 5) TLS certificates

This repo includes `nginx.aws.conf` (backend-only) with TLS placeholders.

Recommended approach on a single EC2:
- Use **Certbot** to obtain Let’s Encrypt certs.
- Mount certs into `./ssl` (or adjust Nginx to read from `/etc/letsencrypt`).

Important:
- `nginx.aws.conf` keeps HTTP open so Certbot/ACME can bootstrap.
- After certificates are installed, you can add an HTTP → HTTPS redirect.

---

## 6) Frontend

With Hostinger:
- Build the frontend locally: `npm run build --prefix frontend`
- Export/deploy as your Hostinger-supported method (Hostinger often supports static hosting; if you use static export, ensure your app supports it).
- Set the frontend API base to your AWS backend API domain.

Recommended domain split:
- Frontend: `https://yourdomain.com` (Hostinger)
- Backend API: `https://api.yourdomain.com` (AWS/EC2)

Then configure:
- Frontend env: `NEXT_PUBLIC_API_BASE=https://api.yourdomain.com/api`
- Backend env: `CORS_ORIGINS=https://yourdomain.com`
- Backend env: `API_URL=https://api.yourdomain.com/api`

---

## 7) Security checklist before opening to users

- Set strong secrets in `.env.aws` (JWT, transaction auth, provider secret)
- Confirm RDS is not publicly accessible
- Ensure EC2 SG does not expose Postgres/Redis
- Enable automatic RDS backups
- Set up basic uptime monitoring on `/api/health`
- Keep withdrawals disabled until your provider integration is verified
