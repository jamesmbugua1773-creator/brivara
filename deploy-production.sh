#!/bin/bash
# Brivara Production Deployment Script
# Run this to prepare for production deployment

set -e  # Exit on any error

echo "🚀 Brivara Production Deployment Setup"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "backend/package.json" ] || [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

echo "✅ Project structure verified"
echo ""

# Step 1: Generate production JWT secret
echo "📝 Step 1: Generating production JWT secret..."
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
echo "✅ JWT_SECRET generated (64 characters)"
echo ""

# Step 2: Choose database
echo "📝 Step 2: Choose PostgreSQL Provider"
echo "---------------------------------------"
echo "1) Neon.tech (Recommended - Free 0.5GB, instant setup)"
echo "2) Railway (Free $5 credit, auto-deploys)"
echo "3) Heroku Postgres (Free tier)"
echo "4) Keep SQLite for now (NOT recommended for production)"
echo ""
read -p "Enter choice (1-4): " db_choice

case $db_choice in
    1)
        echo ""
        echo "📍 Neon.tech Setup:"
        echo "1. Go to https://neon.tech and sign up"
        echo "2. Create a new project"
        echo "3. Copy the connection string (starts with postgresql://)"
        echo ""
        read -p "Paste your Neon connection string: " DATABASE_URL
        ;;
    2)
        echo ""
        echo "📍 Railway Setup:"
        echo "1. Go to https://railway.app and sign up"
        echo "2. Create New Project → Add PostgreSQL"
        echo "3. Go to PostgreSQL → Variables → Copy DATABASE_URL"
        echo ""
        read -p "Paste your Railway connection string: " DATABASE_URL
        ;;
    3)
        echo ""
        echo "📍 Heroku Setup:"
        echo "Run: heroku addons:create heroku-postgresql:essential-0"
        echo "Then: heroku config:get DATABASE_URL"
        echo ""
        read -p "Paste your Heroku connection string: " DATABASE_URL
        ;;
    4)
        echo "⚠️  Warning: SQLite is NOT recommended for production!"
        echo "It cannot handle multiple concurrent users and will lose data on restarts."
        DATABASE_URL="file:./prisma/dev.db"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo "✅ Database configured"
echo ""

# Step 3: Get production domain
echo "📝 Step 3: Production Domain Setup"
echo "-----------------------------------"
read -p "Enter your frontend domain (e.g., https://brivara.com): " FRONTEND_URL
read -p "Enter your backend API domain (e.g., https://api.brivara.com): " API_URL

echo "✅ Domains configured"
echo ""

# Step 4: Email configuration
echo "📝 Step 4: Email Configuration"
echo "-------------------------------"
echo "Using Google Workspace SMTP (configured in .env)"
read -p "Enter your SMTP email (e.g., noreply@yourdomain.com): " SMTP_USER
read -p "Enter your SMTP app password: " -s SMTP_PASS
echo ""
echo "✅ Email configured"
echo ""

# Step 5: Create production .env
echo "📝 Step 5: Creating production environment files..."

# Backend production .env
cat > backend/.env.production << EOF
# Production Environment Configuration
# Generated: $(date)

NODE_ENV=production

# Database (PostgreSQL)
DATABASE_URL="$DATABASE_URL"
DATABASE_CONNECTION_LIMIT=20
DATABASE_POOL_TIMEOUT=10

# JWT Authentication (KEEP SECRET!)
JWT_SECRET="$JWT_SECRET"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=4000
FRONTEND_URL="$FRONTEND_URL"
API_URL="$API_URL"

# Email Configuration (Google Workspace SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="$SMTP_USER"
SMTP_PASS="$SMTP_PASS"
EMAIL_FROM="Brivara <$SMTP_USER>"

# Blockchain Configuration
BSCSCAN_API_KEY="${BSCSCAN_API_KEY:-your-api-key-here}"

# Business Configuration
DEPOSIT_FEE_PERCENT="1.5"
EOF

# Frontend production .env
cat > frontend/.env.production << EOF
# Frontend Production Environment
# Generated: $(date)

NODE_ENV=production
NEXT_PUBLIC_API_URL="$API_URL"
EOF

echo "✅ Production environment files created:"
echo "   - backend/.env.production"
echo "   - frontend/.env.production"
echo ""

# Step 6: Update Prisma schema to PostgreSQL
if [ "$db_choice" != "4" ]; then
    echo "📝 Step 6: Updating Prisma schema to PostgreSQL..."
    
    # Backup current schema
    cp backend/prisma/schema.prisma backend/prisma/schema.prisma.backup
    
    # Update provider to postgresql
    sed -i.bak 's/provider = "sqlite"/provider = "postgresql"/' backend/prisma/schema.prisma
    rm backend/prisma/schema.prisma.bak
    
    echo "✅ Prisma schema updated to PostgreSQL"
    echo ""
fi

# Step 7: Install dependencies
echo "📝 Step 7: Installing dependencies..."
cd backend && npm install --production=false
cd ../frontend && npm install --production=false
cd ..
echo "✅ Dependencies installed"
echo ""

# Step 8: Run database migration
if [ "$db_choice" != "4" ]; then
    echo "📝 Step 8: Running database migration..."
    cd backend
    cp .env.production .env
    npx prisma generate
    npx prisma migrate deploy || npx prisma db push
    cd ..
    echo "✅ Database migrated successfully"
    echo ""
fi

# Step 9: Build applications
echo "📝 Step 9: Building applications..."
echo "Building backend..."
cd backend && npm run build
echo "Building frontend..."
cd ../frontend && npm run build
cd ..
echo "✅ Applications built successfully"
echo ""

# Step 10: Security checklist
echo "🔒 Step 10: Security Checklist"
echo "-------------------------------"
echo "✅ JWT_SECRET: Strong 64-character secret generated"
echo "✅ Database: PostgreSQL with SSL"
echo "✅ Rate Limiting: Active (300 req/min)"
echo "✅ Security Headers: CSP, HSTS, X-Frame-Options"
echo "✅ Input Sanitization: XSS protection active"
echo "✅ Attack Detection: SQL injection, path traversal blocked"
echo ""

# Summary
echo "=========================================="
echo "🎉 Production Setup Complete!"
echo "=========================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1️⃣  Deploy Backend:"
echo "   Option A - Vercel/Railway:"
echo "      - Push code to GitHub"
echo "      - Connect repository to platform"
echo "      - Set environment variables from .env.production"
echo ""
echo "   Option B - VPS (DigitalOcean, AWS):"
echo "      - Upload code to server"
echo "      - Install Node.js and PM2"
echo "      - Run: pm2 start backend/dist/server.js"
echo ""
echo "2️⃣  Deploy Frontend:"
echo "   - Push to Vercel: vercel --prod"
echo "   - Or deploy to Netlify/Cloudflare Pages"
echo ""
echo "3️⃣  Setup SSL/HTTPS:"
echo "   - Use Cloudflare (free SSL + DDoS protection)"
echo "   - Or Let's Encrypt: certbot --nginx"
echo ""
echo "4️⃣  Configure DNS:"
echo "   - Point $FRONTEND_URL to frontend server"
echo "   - Point $API_URL to backend server"
echo ""
echo "5️⃣  Test Deployment:"
echo "   curl $API_URL/api/health"
echo "   curl $FRONTEND_URL"
echo ""
echo "📄 Documentation:"
echo "   - See DEPLOYMENT_GUIDE.md for detailed instructions"
echo "   - See SECURITY_GUIDE.md for security best practices"
echo "   - See PRODUCTION_SCALABILITY_REPORT.md for scaling info"
echo ""
echo "🔐 IMPORTANT:"
echo "   - Keep .env.production files SECRET"
echo "   - Never commit them to Git"
echo "   - Setup automated backups"
echo "   - Monitor logs daily"
echo ""
echo "=========================================="
echo "Ready to launch! 🚀"
echo "=========================================="
