import { prisma } from '../services/db';
import type { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const PACKAGE_MAP: Record<string, number> = {
  P1: 25, P2: 50, P3: 100, P4: 250, P5: 500, P6: 1000, P7: 2000, P8: 3000, P9: 5000,
};

export async function activatePackage(userId: string, packageName: keyof typeof PACKAGE_MAP) {
  const amount = PACKAGE_MAP[packageName];
  if (!amount) throw new Error('Invalid package');

  return await prisma.$transaction(async (tx) => {
    // Require sufficient wallet balance and deduct the package amount
    const wallet = await tx.wallet.findFirst({ where: { userId } });
    const balance = Number(wallet?.balance ?? 0);
    if (balance < amount) {
      throw new Error('Insufficient wallet balance');
    }
    await tx.wallet.update({ where: { userId }, data: { balance: { decrement: amount } } });

    // Create/Update package activation with cycle cap
    const cycleCap = amount * 3;
    const pa = await tx.packageActivation.create({
      data: { userId, packageName, amount, cycleCap, cycleStatus: 'Active' },
    });

    // Begin 24h ROI accrual later (scheduler handles payout), but bonuses & points now
    await distributeReferralBonuses(tx, userId, amount);
    await distributePointsAndRebates(tx, userId, amount);

    return pa;
  });
}

async function distributeReferralBonuses(tx: Prisma.TransactionClient, sourceUserId: string, amount: number) {
  // Traverse upline
  let current = await tx.user.findUnique({ where: { id: sourceUserId } });
  let level = 0;
  while (current && level < 10) {
    const sponsorId = current.sponsorId;
    if (!sponsorId) break;
    level++;
    const sponsor = await tx.user.findUnique({ where: { id: sponsorId } });
    if (!sponsor) break;

    // Indirect bonuses apply for Levels 1–10 (10% at L1, 1% for L2–L10)
    const indirect = level === 1 ? amount * 0.10 : amount * 0.01;
    if (indirect > 0) {
      const txId = uuidv4();
      await tx.bonusLedger.create({
        data: { userId: sponsor.id, sourceUserId, level, type: 'INDIRECT', amount: indirect, txId },
      });
      await incrementBalance(tx, sponsor.id, indirect);
      await checkAndStopCycle(tx, sponsor.id);
    }

    // Direct bonuses stack for Levels 2–6: 10% of the invested user capital
    if (level >= 2 && level <= 6) {
      const direct = amount * 0.10;
      const txId2 = uuidv4();
      await tx.bonusLedger.create({
        data: { userId: sponsor.id, sourceUserId, level, type: 'DIRECT', amount: direct, txId: txId2 },
      });
      await incrementBalance(tx, sponsor.id, direct);
      await checkAndStopCycle(tx, sponsor.id);
    }
    current = sponsor;
  }
}

async function distributePointsAndRebates(tx: Prisma.TransactionClient, sourceUserId: string, packageAmount: number) {
  // Half-compression points at every level; trigger rebates at each 500-point multiple
  let current = await tx.user.findUnique({ where: { id: sourceUserId } });
  let level = 0;
  let pointsRef = packageAmount; // 1 point = 1 USD, reference amount
  while (current && level < 10) {
    const sponsorId = current.sponsorId;
    if (!sponsorId) break;
    level++;
    const sponsor = await tx.user.findUnique({ where: { id: sponsorId } });
    if (!sponsor) break;

    const points = level === 1 ? pointsRef * 0.5 : pointsRef * 0.5 ** level;
    const txId = uuidv4();
    await tx.pointsLedger.create({
      data: { userId: sponsor.id, sourceUserId, level, points, txId },
    });

    // Evaluate rebates: for every 500 points award $40 and record 500 points used
    await triggerRebates(tx, sponsor.id);

    current = sponsor;
  }
}

async function triggerRebates(tx: Prisma.TransactionClient, userId: string) {
  // Compute total points minus used points (from rebates)
  const pointsAgg = await tx.pointsLedger.aggregate({ _sum: { points: true }, where: { userId } });
  const usedAgg = await tx.rebateLedger.aggregate({ _sum: { pointsUsed: true }, where: { userId } });
  const total = Number(pointsAgg._sum.points ?? 0);
  const used = Number(usedAgg._sum.pointsUsed ?? 0);
  let available = total - used;

  // Daily rebate capping: cannot earn rebate bonuses exceeding the package amount per day
  const lastPkg = await tx.packageActivation.findFirst({ where: { userId }, orderBy: { activatedAt: 'desc' } });
  const packageAmount = Number(lastPkg?.amount ?? 0);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const todayRebateAgg = await tx.rebateLedger.aggregate({
    _sum: { amount: true },
    where: { userId, timestamp: { gte: startOfDay, lte: endOfDay } },
  });
  let todayRebateTotal = Number(todayRebateAgg._sum.amount ?? 0);

  while (available >= 500) {
    const txId = uuidv4();
    // Respect daily cap: stop if issuing another $40 would exceed package amount for today
    if (packageAmount > 0 && todayRebateTotal + 40 > packageAmount) break;
    await tx.rebateLedger.create({
      data: { userId, sourceUserId: userId, level: 0, pointsUsed: 500, amount: 40, txId },
    });
    await incrementBalance(tx, userId, 40);
    await checkAndStopCycle(tx, userId);
    available -= 500;
    todayRebateTotal += 40;
  }
}

async function incrementBalance(tx: Prisma.TransactionClient, userId: string, amount: number) {
  await tx.wallet.upsert({
    where: { userId },
    create: { userId, balance: amount },
    update: { balance: { increment: amount } },
  });
}

async function checkAndStopCycle(tx: Prisma.TransactionClient, userId: string) {
  // Sum earnings that count towards 300%: ROI + Bonus + Rebates
  const roi = await tx.rOILedger.aggregate({ _sum: { amount: true }, where: { userId } });
  const bonus = await tx.bonusLedger.aggregate({ _sum: { amount: true }, where: { userId } });
  const rebate = await tx.rebateLedger.aggregate({ _sum: { amount: true }, where: { userId } });
  const total = Number(roi._sum.amount ?? 0) + Number(bonus._sum.amount ?? 0) + Number(rebate._sum.amount ?? 0);

  const lastPkg = await tx.packageActivation.findFirst({ where: { userId }, orderBy: { activatedAt: 'desc' } });
  if (!lastPkg) return;
  const cap = Number(lastPkg.cycleCap);
  if (total >= cap) {
    await tx.user.update({ where: { id: userId }, data: { status: 'Cycle Complete' } });
    await tx.packageActivation.updateMany({ where: { userId, cycleStatus: 'Active' }, data: { cycleStatus: 'Complete' } });
  }
}
