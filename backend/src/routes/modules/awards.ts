import { Router, type Request, type Response } from 'express';
import { prisma } from '../../services/db.js';
import { authMiddleware } from '../../utils/authMiddleware.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const schema = z.object({
  awardName: z.enum(['Star','Achiever','Leader','Emerald','Diamond','Director','Ambassador','Vice President','President','Royal']),
  packageName: z.enum(['P3','P5','P6','P7','P8','P9']),
  packageAmount: z.number().positive(),
});


// Issue an award (admin-only in real use; here user can self-issue for testing)
router.post('/issue', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.body.userId || (req as any).userId as string;
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { awardName, packageName, packageAmount } = parse.data;
  const txId = uuidv4();
  const entry = await prisma.awardLedger.create({ data: { userId, awardName, packageName, packageAmount, txId } });
  res.json(entry);
});

// Delete an award (admin only)
router.delete('/delete/:id', authMiddleware, async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    await prisma.awardLedger.delete({ where: { id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const list = await prisma.awardLedger.findMany({ where: { userId }, orderBy: { timestamp: 'desc' } });
  res.json(list);
});

// Awards progress: directs and team points
router.get('/progress', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;

  // Team points for the user
  const pointsAgg = await prisma.pointsLedger.aggregate({ where: { userId }, _sum: { points: true } });
  const teamPoints = Number(pointsAgg._sum.points || 0);

  // Direct referrals
  const directs = await prisma.user.findMany({ where: { sponsorId: userId }, select: { id: true } });
  const directIds = directs.map((d) => d.id);

  let directCount100 = 0;
  let directCount500 = 0;
  let directRanks = new Set<string>();

  if (directIds.length > 0) {
    const directPackages = await prisma.packageActivation.findMany({ where: { userId: { in: directIds } }, select: { userId: true, amount: true } });
    const maxByUser = new Map<string, number>();
    for (const p of directPackages) {
      const prev = maxByUser.get(p.userId) ?? 0;
      if (p.amount > prev) maxByUser.set(p.userId, p.amount);
    }
    for (const amt of maxByUser.values()) {
      if (amt >= 100) directCount100++;
      if (amt >= 500) directCount500++;
    }

    const directAwards = await prisma.awardLedger.findMany({ where: { userId: { in: directIds } }, select: { awardName: true } });
    for (const a of directAwards) directRanks.add(a.awardName);
  }

  // Achieved ranks for current user
  const myAwards = await prisma.awardLedger.findMany({ where: { userId }, select: { awardName: true } });
  const achieved = myAwards.map((a) => a.awardName);

  res.json({
    teamPoints,
    directCount100,
    directCount500,
    directHas: {
      Achiever: directRanks.has('Achiever'),
      Leader: directRanks.has('Leader'),
      Emerald: directRanks.has('Emerald'),
      Diamond: directRanks.has('Diamond'),
      Director: directRanks.has('Director'),
      Ambassador: directRanks.has('Ambassador'),
      'Vice President': directRanks.has('Ambassador'), // Vice President needs 1 direct Ambassador
      President: directRanks.has('Vice President'), // President needs 1 direct Vice President
    },
    achieved,
  });
});

export default router;