import { Router } from 'express';
import { prisma } from '../../services/db.js';
import { authMiddleware } from '../../utils/authMiddleware.js';

const router = Router();

router.get('/roi-history', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const entries = await prisma.rOILedger.findMany({ where: { userId }, orderBy: { timestamp: 'desc' } });
  res.json(entries);
});

// Alias for spec: GET /roi/history
router.get('/roi/history', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const entries = await prisma.rOILedger.findMany({ where: { userId }, orderBy: { timestamp: 'desc' } });
  res.json(entries);
});

router.get('/bonus-history', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const entries = await prisma.bonusLedger.findMany({ where: { userId }, orderBy: { timestamp: 'desc' } });
  res.json(entries);
});

// Direct bonuses only
router.get('/bonuses/direct', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const entries = await prisma.bonusLedger.findMany({ where: { userId, type: 'DIRECT' }, orderBy: { timestamp: 'desc' } });
  res.json(entries);
});

// Indirect bonuses only
router.get('/bonuses/indirect', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const entries = await prisma.bonusLedger.findMany({ where: { userId, type: 'INDIRECT' }, orderBy: { timestamp: 'desc' } });
  res.json(entries);
});

router.get('/points-ledger', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const entries = await prisma.pointsLedger.findMany({ where: { userId }, orderBy: { timestamp: 'desc' } });
  res.json(entries);
});

// Alias for spec: GET /points/ledger
router.get('/points/ledger', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const entries = await prisma.pointsLedger.findMany({ where: { userId }, orderBy: { timestamp: 'desc' } });
  res.json(entries);
});

router.get('/rebate-ledger', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const entries = await prisma.rebateLedger.findMany({ where: { userId }, orderBy: { timestamp: 'desc' } });
  res.json(entries);
});

// Spec aliases: history + summary
router.get('/rebates/history', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const entries = await prisma.rebateLedger.findMany({ where: { userId }, orderBy: { timestamp: 'desc' } });
  res.json(entries);
});
router.get('/rebates/summary', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const earnedAgg = await prisma.rebateLedger.aggregate({ _sum: { amount: true }, where: { userId } });
  const pointsAgg = await prisma.pointsLedger.aggregate({ _sum: { points: true }, where: { userId } });
  const usedAgg = await prisma.rebateLedger.aggregate({ _sum: { pointsUsed: true }, where: { userId } });
  const forfeitedAgg = await prisma.rebateLedger.aggregate({
    _sum: { pointsUsed: true },
    where: { userId, amount: 0 }
  });
  const rebateCount = await prisma.rebateLedger.count({ where: { userId } });
  const earned = Number(earnedAgg._sum.amount ?? 0);
  const totalPoints = Number(pointsAgg._sum.points ?? 0);
  const pointsUsed = Number(usedAgg._sum.pointsUsed ?? 0);
  const pointsForfeited = Number(forfeitedAgg._sum.pointsUsed ?? 0);
  // Business rule alignment: progress is based on available (unconsumed) points
  const availablePoints = Math.max(0, totalPoints - pointsUsed);
  const remainingPoints = availablePoints % 500; // points carried over toward next rebate from available points
  const untilNext = availablePoints > 0 ? (500 - remainingPoints) % 500 : 500;
  const POINT_USD = Number(process.env.POINT_USD_VALUE ?? '0.08'); // default $0.08 per point
  const USD_PER_500 = Number(process.env.REBATE_USD_PER_500 ?? '40'); // default $40 per 500 points
  const impliedAmount = totalPoints * POINT_USD;
  // Eligible payouts based on total points minus thresholds already consumed via pointsUsed
  const totalEligibleByPoints = Math.floor(totalPoints / 500);
  // Withdrawable is based on unconsumed full 500-point blocks remaining
  const unconsumedPoints = Math.max(0, totalPoints - pointsUsed);
  const eligiblePayouts = Math.floor(unconsumedPoints / 500);
  const eligibleAmount = eligiblePayouts * USD_PER_500;
  // Computed payouts purely by threshold (for display expectations): e.g., 900 pts -> 1 x $40 paid by rule, remainder shows as unpaid implied
  const computedPaidByThreshold = totalEligibleByPoints * USD_PER_500;
  const computedUnpaidByThreshold = remainingPoints * POINT_USD;
  res.json({
    totalRebatesEarned: earned,
    totalPoints,
    pointsUsed,
    pointsForfeited,
    remainingPoints,
    pointsUntilNextRebate: untilNext,
    rebateCount,
    impliedAmount,
    eligiblePayouts,
    eligibleAmount,
    computedPaidByThreshold,
    computedUnpaidByThreshold,
  });
});

// Cycle status for ROI page
router.get('/cycle/status', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const lastPackage = await prisma.packageActivation.findFirst({ where: { userId }, orderBy: { activatedAt: 'desc' } });
  if (!lastPackage) return res.json({ status: 'Inactive', percentage: 0 });
  const cap = Number(lastPackage.cycleCap ?? lastPackage.amount * 3);
  const roi = await prisma.rOILedger.aggregate({ _sum: { amount: true }, where: { userId, packageId: lastPackage.id } });
  const bonus = await prisma.bonusLedger.aggregate({ _sum: { amount: true }, where: { userId } });
  const rebate = await prisma.rebateLedger.aggregate({ _sum: { amount: true }, where: { userId } });
  const total = Number(roi._sum.amount ?? 0) + Number(bonus._sum.amount ?? 0) + Number(rebate._sum.amount ?? 0);
  const percentage = cap > 0 ? Math.min(100, (total / cap) * 100) : 0;
  res.json({ status: lastPackage.cycleStatus, percentage });
});

router.get('/awards-list', authMiddleware, async (_req, res) => {
  res.json([
    { awardName: 'Star', packageName: 'P3', packageAmount: 100 },
    { awardName: 'Achiever', packageName: 'P5', packageAmount: 500 },
    { awardName: 'Leader', packageName: 'P6', packageAmount: 1000 },
    { awardName: 'Emerald', packageName: 'P7', packageAmount: 2000 },
    { awardName: 'Diamond', packageName: 'P8', packageAmount: 3000 },
    { awardName: 'Director', packageName: 'P9', packageAmount: 5000 },
    { awardName: 'Ambassador', packageName: 'P9', packageAmount: 5000 },
    { awardName: 'Vice President', packageName: 'P9', packageAmount: 5000 },
  ]);
});

router.get('/awards-history', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const entries = await prisma.awardLedger.findMany({ where: { userId }, orderBy: { timestamp: 'desc' } });
  res.json(entries);
});

export default router;
