import { Router } from 'express';
import { prisma } from '../../services/db.js';
import { authMiddleware } from '../../utils/authMiddleware.js';
import { adminMiddleware } from '../../utils/adminMiddleware.js';

const router = Router();

// Users CRUD
router.get('/users', authMiddleware, adminMiddleware, async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { created_at: 'desc' } });
  res.json(users);
});
router.get('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});
router.post('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.create({ data: req.body });
    res.json(user);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Create failed' });
  }
});
router.patch('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: req.body });
    res.json(user);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Update failed' });
  }
});
router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Delete failed' });
  }
});

// Wallet CRUD (by user)
router.get('/wallets/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  const w = await prisma.wallet.findUnique({ where: { userId: req.params.userId } });
  res.json(w);
});
router.post('/wallets', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const w = await prisma.wallet.create({ data: req.body });
    res.json(w);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});
router.patch('/wallets/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const w = await prisma.wallet.update({ where: { userId: req.params.userId }, data: req.body });
    res.json(w);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});
router.delete('/wallets/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await prisma.wallet.delete({ where: { userId: req.params.userId } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Points CRUD
router.post('/points', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const p = await prisma.pointsLedger.create({ data: req.body });
    res.json(p);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
router.delete('/points/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try { await prisma.pointsLedger.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

// Rebates CRUD
router.post('/rebates', authMiddleware, adminMiddleware, async (req, res) => {
  try { const r = await prisma.rebateLedger.create({ data: req.body }); res.json(r); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});
router.delete('/rebates/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try { await prisma.rebateLedger.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

// Withdrawals admin update/delete
router.get('/withdrawals', authMiddleware, adminMiddleware, async (_req, res) => {
  const items = await prisma.withdrawal.findMany({ orderBy: { timestamp: 'desc' } }); res.json(items);
});
router.patch('/withdrawals/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try { const w = await prisma.withdrawal.update({ where: { id: req.params.id }, data: req.body }); res.json(w); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});
router.delete('/withdrawals/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try { await prisma.withdrawal.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

// Deposits admin update/delete
router.get('/deposits', authMiddleware, adminMiddleware, async (_req, res) => {
  const items = await prisma.deposit.findMany({ orderBy: { timestamp: 'desc' } }); res.json(items);
});
router.patch('/deposits/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try { const d = await prisma.deposit.update({ where: { id: req.params.id }, data: req.body }); res.json(d); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});
router.delete('/deposits/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try { await prisma.deposit.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

// Support tickets: admin view and reply
router.get('/tickets', authMiddleware, adminMiddleware, async (_req, res) => {
  const tickets = await prisma.supportTicket.findMany({ orderBy: { createdAt: 'desc' }, include: { user: true } });
  res.json(tickets);
});
router.post('/tickets/:id/reply', authMiddleware, adminMiddleware, async (req, res) => {
  const { reply, status } = req.body as { reply?: string; status?: string };
  try {
    const t = await prisma.supportTicket.update({ where: { id: req.params.id }, data: { adminReply: reply ?? null, status: status ?? 'CLOSED' } });
    res.json(t);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// Points ledger for user
router.get('/points', authMiddleware, adminMiddleware, async (req, res) => {
  const { userId } = req.query as { userId: string };
  const points = await prisma.pointsLedger.findMany({ where: { userId }, orderBy: { timestamp: 'desc' } });
  res.json(points);
});
router.post('/points', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const point = await prisma.pointsLedger.create({ data: req.body });
    res.json(point);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});
router.delete('/points/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await prisma.pointsLedger.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Rebates ledger for user
router.get('/rebates', authMiddleware, adminMiddleware, async (req, res) => {
  const { userId } = req.query as { userId: string };
  const rebates = await prisma.rebateLedger.findMany({ where: { userId }, orderBy: { timestamp: 'desc' } });
  res.json(rebates);
});
router.post('/rebates', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const rebate = await prisma.rebateLedger.create({ data: req.body });
    res.json(rebate);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});
router.delete('/rebates/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await prisma.rebateLedger.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Packages for user
router.get('/packages', authMiddleware, adminMiddleware, async (req, res) => {
  const { userId } = req.query as { userId: string };
  const packages = await prisma.packageActivation.findMany({ where: { userId }, orderBy: { activatedAt: 'desc' } });
  res.json(packages);
});

// Awards for user
router.get('/awards', authMiddleware, adminMiddleware, async (req, res) => {
  const { userId } = req.query as { userId: string };
  const awards = await prisma.awardLedger.findMany({ where: { userId }, orderBy: { timestamp: 'desc' } });
  res.json(awards);
});

// Backwards-compatible alias used by frontend (admin user detail awards section)
router.get('/awards/history', authMiddleware, adminMiddleware, async (req, res) => {
  const { userId } = req.query as { userId?: string };
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  const awards = await prisma.awardLedger.findMany({ where: { userId }, orderBy: { timestamp: 'desc' } });
  res.json(awards);
});
router.post('/awards', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const award = await prisma.awardLedger.create({ data: req.body });
    res.json(award);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});
router.delete('/awards/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await prisma.awardLedger.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
