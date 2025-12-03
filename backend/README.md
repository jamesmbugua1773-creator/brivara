# Brivara Backend (Express + Prisma + PostgreSQL)

Implements ROI, referral bonuses, points (half-compression), rebates, awards, and 300% cycle per spec.

## Prerequisites
- PostgreSQL running and `DATABASE_URL` set
- Node.js 18+

## Setup
```zsh
cd /Users/macbookpro/Desktop/projects/brivara-3/backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

API served at `http://localhost:4000/api`.

## Notes
- Daily ROI via `node-cron` job (to be implemented with engines)
- All earnings logged in ledger tables; dashboard aggregates from ledgers
- JWT auth, rate limiting, and basic validations included
