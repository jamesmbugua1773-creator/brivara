import { Router } from 'express';
import { prisma } from '../../services/db.js';
import { authMiddleware } from '../../utils/authMiddleware.js';

const router = Router();

router.get('/summary', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const wallet = await prisma.wallet.findFirst({ where: { userId } });
  const lastPackage = await prisma.packageActivation.findFirst({ where: { userId }, orderBy: { activatedAt: 'desc' } });
  const roiTotal = await prisma.rOILedger.aggregate({ _sum: { amount: true }, where: { userId } });
  const bonusTotal = await prisma.bonusLedger.aggregate({ _sum: { amount: true }, where: { userId } });
  const rebateTotal = await prisma.rebateLedger.aggregate({ _sum: { amount: true }, where: { userId } });
  const pointsTotal = await prisma.pointsLedger.aggregate({ _sum: { points: true }, where: { userId } });
  const directPointsAgg = await prisma.pointsLedger.aggregate({ _sum: { points: true }, where: { userId, level: 1 } as any });
  const indirectPointsAgg = await prisma.pointsLedger.aggregate({ _sum: { points: true }, where: { userId, level: { gt: 1 } } });

  res.json({
    availableBalance: wallet?.balance ?? 0,
    totalEarnings: (roiTotal._sum.amount ?? 0) + (bonusTotal._sum.amount ?? 0) + (rebateTotal._sum.amount ?? 0),
    currentPackage: lastPackage ?? null,
    totalPoints: pointsTotal._sum.points ?? 0,
    directPoints: directPointsAgg._sum.points ?? 0,
    indirectPoints: indirectPointsAgg._sum.points ?? 0,
  });
});

// 300% progress endpoint
router.get('/300', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const lastPackage = await prisma.packageActivation.findFirst({ where: { userId }, orderBy: { activatedAt: 'desc' } });
  if (!lastPackage) {
    // Safe default response to avoid frontend 404s
    return res.json({ cap: 0, total: 0, percentage: 0, status: 'Inactive' });
  }
  const cap = Number(lastPackage.cycleCap ?? lastPackage.amount * 3);
  const roi = await prisma.rOILedger.aggregate({ _sum: { amount: true }, where: { userId, packageId: lastPackage.id } });
  const bonus = await prisma.bonusLedger.aggregate({ _sum: { amount: true }, where: { userId } });
  const rebate = await prisma.rebateLedger.aggregate({ _sum: { amount: true }, where: { userId } });
  const total = Number(roi._sum.amount ?? 0) + Number(bonus._sum.amount ?? 0) + Number(rebate._sum.amount ?? 0);
  const percentage = cap > 0 ? Math.min(100, (total / cap) * 100) : 0;
  res.json({ cap, total, percentage, status: lastPackage.cycleStatus });
});

export default router;
