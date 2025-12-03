import { Router } from 'express';
import { prisma } from '../../services/db.js';
import { authMiddleware } from '../../utils/authMiddleware.js';

const router = Router();

// User submits a ticket
router.post('/tickets', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const { category, subject, message } = req.body as { category: string; subject: string; message: string };
  if (!category || !subject || !message) return res.status(400).json({ error: 'category, subject and message are required' });
  if (!['DEPOSIT','GENERAL'].includes(category)) return res.status(400).json({ error: 'Invalid category' });
  const t = await prisma.supportTicket.create({ data: { userId, category, subject, message } });
  res.json(t);
});

// User lists own tickets
router.get('/tickets', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const tickets = await prisma.supportTicket.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  res.json(tickets);
});

export default router;
