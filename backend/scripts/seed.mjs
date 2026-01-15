import 'dotenv/config';
process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({});

async function run() {
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

  const { default: bcrypt } = await import('bcryptjs');
  const pass = await bcrypt.hash('password123', 10);

  const U1 = await prisma.user.create({ data: { email: 'u1@example.com', username: 'U1', passwordHash: pass, referralCode: 'u1code' } });
  const U2 = await prisma.user.create({ data: { email: 'u2@example.com', username: 'U2', passwordHash: pass, referralCode: 'u2code', sponsorId: U1.id } });
  const U3 = await prisma.user.create({ data: { email: 'u3@example.com', username: 'U3', passwordHash: pass, referralCode: 'u3code', sponsorId: U2.id } });
  const U4 = await prisma.user.create({ data: { email: 'u4@example.com', username: 'U4', passwordHash: pass, referralCode: 'u4code', sponsorId: U3.id, role: 'ADMIN' } });
  // Add downlines for U4 to test referral earnings
  const U5 = await prisma.user.create({ data: { email: 'u5@example.com', username: 'U5', passwordHash: pass, referralCode: 'u5code', sponsorId: U4.id } });
  const U6 = await prisma.user.create({ data: { email: 'u6@example.com', username: 'U6', passwordHash: pass, referralCode: 'u6code', sponsorId: U5.id } });

  await prisma.wallet.createMany({ data: [
    { userId: U1.id, balance: 0 },
    { userId: U2.id, balance: 0 },
    { userId: U3.id, balance: 0 },
    { userId: U4.id, balance: 200 },
    { userId: U5.id, balance: 0 },
    { userId: U6.id, balance: 0 },
  ]});

  // Seed a demo package activation for U1 to enable progress testing
  try {
    await prisma.packageActivation.create({
      data: {
        userId: U1.id,
        packageName: 'BASIC',
        amount: 1000,
        activatedAt: new Date(),
        cycleCap: 3000,
        cycleStatus: 'Active'
      }
    });
    // Also seed activations for U2 and U3 to validate downline logic paths
    await prisma.packageActivation.create({
      data: {
        userId: U2.id,
        packageName: 'BASIC',
        amount: 500,
        activatedAt: new Date(),
        cycleCap: 1500,
        cycleStatus: 'Active'
      }
    });
    await prisma.packageActivation.create({
      data: {
        userId: U3.id,
        packageName: 'BASIC',
        amount: 250,
        activatedAt: new Date(),
        cycleCap: 750,
        cycleStatus: 'Active'
      }
    });
  } catch (e) {
    console.warn('Skipping packageActivation seed (maybe model differs):', e?.message || e);
  }

  // Seed a couple of awards for U1 to visualize in UI
  try {
    await prisma.awardLedger.createMany({
      data: [
        {
          userId: U1.id,
          awardName: 'Starter Bonus',
          packageName: 'BASIC',
          packageAmount: 50,
          timestamp: new Date(),
          txId: `AWD-${Date.now()}-1`
        },
        {
          userId: U1.id,
          awardName: 'Referral Milestone',
          packageName: 'BASIC',
          packageAmount: 75,
          timestamp: new Date(Date.now() - 1000 * 60 * 60),
          txId: `AWD-${Date.now()}-2`
        }
      ]
    });
  } catch (e) {
    console.warn('Skipping awards seed:', e?.message || e);
  }

  // Seed demo data for U4 to ensure pages show content
  try {
    // Activate a P2-like package (amount: 50, cap: 150)
    await prisma.packageActivation.create({
      data: {
        userId: U4.id,
        packageName: 'P2',
        amount: 50,
        activatedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
        cycleCap: 150,
        cycleStatus: 'Active'
      }
    });
    // Seed a week of ROI entries
    const u4Pkg = await prisma.packageActivation.findFirst({ where: { userId: U4.id }, orderBy: { activatedAt: 'desc' } });
    const roiRows = [];
    for (let i = 6; i >= 0; i--) {
      const ts = new Date(Date.now() - i * 24 * 3600 * 1000);
      roiRows.push({ userId: U4.id, packageId: u4Pkg.id, amount: 0.75, timestamp: ts, txId: `ROI-${ts.getTime()}-${i}` });
    }
    await prisma.rOILedger.createMany({ data: roiRows });

    // One award entry
    await prisma.awardLedger.create({
      data: { userId: U4.id, awardName: 'Starter', packageName: 'P2', packageAmount: 50, timestamp: new Date(), txId: `AWD-${Date.now()}-U4` }
    });

    // Deposit and withdrawal history for U4
    await prisma.deposit.create({ data: { userId: U4.id, amount: 100, fee: 1.5, network: 'SYSTEM', txId: `DEP-${Date.now()}-U4`, status: 'Confirmed' } });
    await prisma.withdrawal.create({ data: { userId: U4.id, amount: 20, fee: 1, network: 'BEP20', txId: `WD-${Date.now()}-U4`, status: 'Completed' } });

    // Points and bonuses from U5 (direct) and U6 (indirect) to test referral analytics
    await prisma.pointsLedger.createMany({
      data: [
        { userId: U4.id, sourceUserId: U5.id, level: 1, points: 600, timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000), txId: `PTS-${Date.now()}-U5-1` },
        { userId: U4.id, sourceUserId: U6.id, level: 2, points: 300, timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000), txId: `PTS-${Date.now()}-U6-2` }
      ]
    });
    await prisma.bonusLedger.createMany({
      data: [
        { userId: U4.id, sourceUserId: U5.id, level: 1, type: 'DIRECT', amount: 15, timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000), txId: `BON-${Date.now()}-U5-1` },
        { userId: U4.id, sourceUserId: U6.id, level: 2, type: 'INDIRECT', amount: 7.5, timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000), txId: `BON-${Date.now()}-U6-2` }
      ]
    });
    // Rebates based on points used (simulate two redemptions)
    await prisma.rebateLedger.createMany({
      data: [
        { userId: U4.id, sourceUserId: U5.id, level: 1, pointsUsed: 500, amount: 10, timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000), txId: `REB-${Date.now()}-U5-1` },
        { userId: U4.id, sourceUserId: U6.id, level: 2, pointsUsed: 500, amount: 10, timestamp: new Date(), txId: `REB-${Date.now()}-U6-2` }
      ]
    });
    // Adjust wallet to reflect some earnings
    await prisma.wallet.update({ where: { userId: U4.id }, data: { balance: 250 } });
  } catch (e) {
    console.warn('Skipping U4 demo seed:', e?.message || e);
  }

  console.log('Seed complete:', { U1: U1.id, U2: U2.id, U3: U3.id, U4: U4.id, U5: U5.id, U6: U6.id });
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
