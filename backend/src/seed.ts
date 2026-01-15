import { prisma } from './services/db.js';
import bcrypt from 'bcryptjs';

async function run() {
  // Clear existing (dev only)
  await prisma.withdrawal.deleteMany({});
  await prisma.deposit.deleteMany({});
  await prisma.awardLedger.deleteMany({});
  await prisma.rebateLedger.deleteMany({});
  await prisma.pointsLedger.deleteMany({});
  await prisma.bonusLedger.deleteMany({});
  await prisma.rOILedger.deleteMany({});
  await prisma.packageActivation.deleteMany({});
  await prisma.wallet.deleteMany({});
  await prisma.user.deleteMany({});

  // Create sponsor chain: U1 -> U2 -> U3 -> U4
  const pass = await bcrypt.hash('password123', 10);
  const U1 = await prisma.user.create({ data: { email: 'u1@example.com', username: 'U1', passwordHash: pass, referralCode: 'u1code' } });
  const U2 = await prisma.user.create({ data: { email: 'u2@example.com', username: 'U2', passwordHash: pass, referralCode: 'u2code', sponsorId: U1.id } });
  const U3 = await prisma.user.create({ data: { email: 'u3@example.com', username: 'U3', passwordHash: pass, referralCode: 'u3code', sponsorId: U2.id } });
  const U4 = await prisma.user.create({ data: { email: 'u4@example.com', username: 'U4', passwordHash: pass, referralCode: 'u4code', sponsorId: U3.id, role: 'ADMIN' } });

  // Give each a wallet row for convenience
  await prisma.wallet.createMany({ data: [
    { userId: U1.id, balance: 0 },
    { userId: U2.id, balance: 0 },
    { userId: U3.id, balance: 0 },
    { userId: U4.id, balance: 0 },
  ]});

  console.log('Seed complete:', { U1: U1.id, U2: U2.id, U3: U3.id, U4: U4.id });
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
