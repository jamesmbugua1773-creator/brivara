import { Router } from 'express';
import { prisma } from '../../services/db.js';
import { authMiddleware } from '../../utils/authMiddleware.js';

const router = Router();

router.get('/tree', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  // Build level-wise tree up to 10 levels
  const levels: Array<{ level: number; users: Array<{ id: string; username: string }> }> = [];
  let currentLevel: string[] = [userId];
  for (let lvl = 1; lvl <= 10; lvl++) {
    const next: string[] = [];
    const levelUsers: Array<{ id: string; username: string }> = [];
    for (const uid of currentLevel) {
      const refs = await prisma.user.findMany({ where: { sponsorId: uid }, select: { id: true, username: true } });
      levelUsers.push(...refs);
      next.push(...refs.map(r => r.id));
    }
    levels.push({ level: lvl, users: levelUsers });
    currentLevel = next;
    if (currentLevel.length === 0) break;
  }

  // Enrich with latest package info per user in the tree
  const allIds = levels.flatMap(l => l.users.map(u => u.id));
  let packageByUser = new Map<string, { packageName: string; amount: number }>();
  if (allIds.length) {
    const activations = await prisma.packageActivation.findMany({
      where: { userId: { in: allIds } },
      orderBy: { activatedAt: 'desc' },
      select: { userId: true, packageName: true, amount: true, activatedAt: true }
    });
    for (const act of activations) {
      if (!packageByUser.has(act.userId)) {
        packageByUser.set(act.userId, { packageName: act.packageName, amount: Number(act.amount) });
      }
    }
  }
  const enriched = levels.map(l => ({
    level: l.level,
    users: l.users.map(u => ({ id: u.id, username: u.username, package: packageByUser.get(u.id) || null }))
  }));

  res.json({ levels: enriched });
});

router.get('/levels', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const levels: any[] = [];
  let currentSponsor = await prisma.user.findUnique({ where: { id: userId } });
  for (let lvl = 1; lvl <= 10; lvl++) {
    if (!currentSponsor?.sponsorId) break;
    const sponsor = await prisma.user.findUnique({ where: { id: currentSponsor.sponsorId } });
    if (!sponsor) break;
    levels.push({ level: lvl, user: { id: sponsor.id, username: sponsor.username } });
    currentSponsor = sponsor;
  }
  res.json({ levels });
});

// Analytics: points and bonuses per referral and totals
router.get('/analytics', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const [points, bonuses] = await Promise.all([
      prisma.pointsLedger.findMany({ where: { userId } }),
      prisma.bonusLedger.findMany({ where: { userId } }),
    ]);

    const perReferral: Record<string, { sourceUserId: string; directPoints: number; indirectPoints: number; directBonus: number; indirectBonus: number }> = {};

    for (const p of points) {
      const key = p.sourceUserId;
      if (!perReferral[key]) perReferral[key] = { sourceUserId: key, directPoints: 0, indirectPoints: 0, directBonus: 0, indirectBonus: 0 };
      if (p.level === 1) perReferral[key].directPoints += Number(p.points || 0);
      else perReferral[key].indirectPoints += Number(p.points || 0);
    }

    let totalDirectBonus = 0;
    let totalIndirectBonus = 0;
    for (const b of bonuses) {
      const key = b.sourceUserId;
      if (!perReferral[key]) perReferral[key] = { sourceUserId: key, directPoints: 0, indirectPoints: 0, directBonus: 0, indirectBonus: 0 };
      if ((b.type || '').toUpperCase() === 'DIRECT') {
        perReferral[key].directBonus += Number(b.amount || 0);
        totalDirectBonus += Number(b.amount || 0);
      } else {
        perReferral[key].indirectBonus += Number(b.amount || 0);
        totalIndirectBonus += Number(b.amount || 0);
      }
    }

    // Map sourceUserId to username for display
    const sourceIds = Object.keys(perReferral);
    const users = sourceIds.length
      ? await prisma.user.findMany({ where: { id: { in: sourceIds } }, select: { id: true, username: true } })
      : [];
    // Attach latest package per referral
    let pkgByUser = new Map<string, { packageName: string; amount: number }>();
    if (sourceIds.length) {
      const acts = await prisma.packageActivation.findMany({ where: { userId: { in: sourceIds } }, orderBy: { activatedAt: 'desc' }, select: { userId: true, packageName: true, amount: true } });
      for (const a of acts) {
        if (!pkgByUser.has(a.userId)) pkgByUser.set(a.userId, { packageName: a.packageName, amount: Number(a.amount) });
      }
    }
    const usernameById = new Map(users.map(u => [u.id, u.username]));

    const rows = sourceIds.map(id => ({
      sourceUserId: id,
      username: usernameById.get(id) || '—',
      package: pkgByUser.get(id) || null,
      directPoints: perReferral[id].directPoints,
      indirectPoints: perReferral[id].indirectPoints,
      directBonus: perReferral[id].directBonus,
      indirectBonus: perReferral[id].indirectBonus,
    }));

    const totalPointsDirect = rows.reduce((a, r) => a + r.directPoints, 0);
    const totalPointsIndirect = rows.reduce((a, r) => a + r.indirectPoints, 0);

    res.json({
      totals: {
        totalDirectPoints: totalPointsDirect,
        totalIndirectPoints: totalPointsIndirect,
        totalDirectBonus,
        totalIndirectBonus,
        totalReferralBonus: totalDirectBonus + totalIndirectBonus,
      },
      perReferral: rows,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to load analytics' });
  }
});

// Shareable referral link for the logged-in user
router.get('/link', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const base = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
  const url = `${base}/register?ref=${encodeURIComponent(user.referralCode)}`;
  res.json({ code: user.referralCode, url });
});

export default router;
