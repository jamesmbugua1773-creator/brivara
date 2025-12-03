import { Router } from 'express';
import { prisma } from '../../services/db.js';
import { authMiddleware } from '../../utils/authMiddleware.js';

const router = Router();

router.get('/300', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const pkg = await prisma.packageActivation.findFirst({ where: { userId }, orderBy: { activatedAt: 'desc' } });
  if (!pkg) {
    // Safe default response to avoid 404s on frontend pages
    return res.json({ packageAmount: 0, cap: 0, total: 0, percentage: 0, status: 'Inactive' });
  }
  const cap = Number(pkg.cycleCap ?? Number(pkg.amount) * 3);
  const roiAgg = await prisma.rOILedger.aggregate({ _sum: { amount: true }, where: { userId } });
  const bonusAgg = await prisma.bonusLedger.aggregate({ _sum: { amount: true }, where: { userId } });
  const rebateAgg = await prisma.rebateLedger.aggregate({ _sum: { amount: true }, where: { userId } });
  const total = Number(roiAgg._sum.amount ?? 0) + Number(bonusAgg._sum.amount ?? 0) + Number(rebateAgg._sum.amount ?? 0);
  const percentage = cap > 0 ? Math.min(100, (total / cap) * 100) : 0;
  res.json({
    packageAmount: Number(pkg.amount),
    cap,
    total,
    percentage,
    status: pkg.cycleStatus ?? 'Active',
  });
});

export default router;