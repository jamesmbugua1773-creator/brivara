import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../utils/authMiddleware.js';
import { activatePackage } from '../../engines/activation.js';
import { prisma } from '../../services/db.js';
const PACKAGE_MAP: Record<string, number> = {
  P1: 25, P2: 50, P3: 100, P4: 250, P5: 500, P6: 1000, P7: 2000, P8: 3000, P9: 5000,
};

const router = Router();

const schema = z.object({ packageName: z.enum(['P1','P2','P3','P4','P5','P6','P7','P8','P9']) });
router.post('/activate', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  try {
    const pa = await activatePackage(userId, parse.data.packageName);
    res.json(pa);
  } catch (e: any) {
    const msg = e?.message || 'Activation failed';
    const status = msg.includes('Insufficient wallet balance') ? 400 : 500;
    res.status(status).json({ error: msg });
  }
});


// Public list of available packages and amounts
router.get('/list', (_req, res) => {
  res.json(Object.entries(PACKAGE_MAP).map(([code, amount]) => ({ code, amount })));
});

// Admin: delete a package activation
router.delete('/delete/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  try {
    await prisma.packageActivation.delete({ where: { id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Admin: create a package activation for a user
const adminSchema = z.object({ userId: z.string(), packageName: z.enum(['P1','P2','P3','P4','P5','P6','P7','P8','P9']) });
router.post('/admin-activate', authMiddleware, async (req, res) => {
  const parse = adminSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  try {
    const pa = await activatePackage(parse.data.userId, parse.data.packageName);
    res.json(pa);
  } catch (e: any) {
    const msg = e?.message || 'Activation failed';
    const status = msg.includes('Insufficient wallet balance') ? 400 : 500;
    res.status(status).json({ error: msg });
  }
});

export default router;
