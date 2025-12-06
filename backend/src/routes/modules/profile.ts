import { Router } from 'express';
import { prisma } from '../../services/db.js';
import { authMiddleware } from '../../utils/authMiddleware.js';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const router = Router();

// Function to get or create unique deposit address for user
async function getOrCreateDepositAddress(userId: string, network: 'TRC20' | 'BEP20'): Promise<string> {
  let addr = await prisma.userDepositAddress.findUnique({ where: { userId_network: { userId, network } } });
  if (!addr) {
    // Generate a unique address
    const address = generateUniqueAddress(network);
    addr = await prisma.userDepositAddress.create({ data: { userId, network, address } });
  }
  return addr.address;
}

// Simple address generator (for demo; in production use Tatum or similar)
function generateUniqueAddress(network: 'TRC20' | 'BEP20'): string {
  const random = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  if (network === 'TRC20') {
    return 'T' + random.substring(0, 33); // Tron addresses are 34 chars starting with T
  } else {
    return '0x' + random.substring(0, 40); // BSC addresses are 42 chars starting with 0x
  }
}

// Validation helpers
const nameSchema = z.string().regex(/^[A-Za-z ]+$/).min(2).max(100);
const emailSchema = z.string().email();
const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/); // E.164
const countrySchema = z.string().min(2).max(56);
const bep20AddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

// Editable fields
const updateSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  country: countrySchema.optional(),
  withdraw_wallet_bep20: bep20AddressSchema.optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'No fields provided' });

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/),
  confirmPassword: z.string().min(8),
}).refine((d) => d.newPassword === d.confirmPassword, { message: 'Passwords do not match' });

const uploadPhotoSchema = z.object({
  imageUrl: z.string().url(),
});

router.get('/', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  // DEBUG: Log userId and query result
  let user = null;
  try {
    user = await prisma.user.findUnique({ where: { id: userId }, select: {
      id: true,
      role: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      country: true,
      created_at: true,
      lastLogin: true,
      status: true,
      currentPackage: true,
      activationDate: true,
      withdraw_wallet_bep20: true,
      deposit_wallet_trc20: true,
      deposit_wallet_bep20: true,
      profileImageUrl: true,
    }});
    // eslint-disable-next-line no-console
    console.log('PROFILE DEBUG:', { userId, user });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('PROFILE ERROR:', e);
  }
  // Patch: If user exists but all fields except id are null, fetch role from DB
  // if (user && user.id && (!user.role || Object.values(user).filter((v, k) => k !== 'id' && k !== 'role').every((v: any) => v == null))) {
  //   const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  //   user.role = dbUser?.role || 'USER';
  // }
    // Always return role, even if user is missing or fields are null
    if (!user) {
      const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      return res.json({
        id: userId,
        role: dbUser?.role || 'USER',
        name: null,
        username: null,
        email: null,
        phone: null,
        country: null,
        created_at: null,
        lastLogin: null,
        status: 'Inactive',
        currentPackage: null,
        activationDate: null,
        withdraw_wallet_bep20: null,
        deposit_wallet_trc20: null,
        deposit_wallet_bep20: null,
        profileImageUrl: null,
      });
    }

    // Get or create unique deposit addresses
    const trc20Addr = await getOrCreateDepositAddress(userId, 'TRC20');
    const bep20Addr = await getOrCreateDepositAddress(userId, 'BEP20');

    // Explicitly construct response to guarantee role is present
    return res.json({
      id: user.id,
      role: user.role || 'USER',
      name: user.name ?? null,
      username: user.username ?? null,
      email: user.email ?? null,
      phone: user.phone ?? null,
      country: user.country ?? null,
      created_at: user.created_at ?? null,
      lastLogin: user.lastLogin ?? null,
      status: user.status ?? 'Inactive',
      currentPackage: user.currentPackage ?? null,
      activationDate: user.activationDate ?? null,
      withdraw_wallet_bep20: user.withdraw_wallet_bep20 ?? null,
      deposit_wallet_trc20: trc20Addr,
      deposit_wallet_bep20: bep20Addr,
      profileImageUrl: user.profileImageUrl ?? null,
    });
});

// POST /profile/update
router.post('/update', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data as any;
  // Prevent username update
  delete data.username; delete data.id;

  // Ensure user exists before attempting update
  const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!userExists) return res.status(404).json({ error: 'User not found' });

  // Email uniqueness check if changing email
  if (data.email) {
    const exists = await prisma.user.findFirst({ where: { email: data.email, NOT: { id: userId } }, select: { id: true } });
    if (exists) return res.status(409).json({ error: 'Email already in use' });
  }

  const updated = await prisma.user.update({ where: { id: userId }, data, select: {
    id: true, email: true, username: true, name: true, phone: true, country: true,
    withdraw_wallet_bep20: true, deposit_wallet_trc20: true, deposit_wallet_bep20: true, profileImageUrl: true,
  }});
  res.json(updated);
});

// POST /profile/change-password
router.post('/change-password', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { currentPassword, newPassword } = parsed.data;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user || !user.passwordHash) return res.status(400).json({ error: 'Invalid user state' });
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
  res.json({ success: true });
});

// POST /profile/upload-photo (optional)
router.post('/upload-photo', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const parsed = uploadPhotoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { imageUrl } = parsed.data;
  const updated = await prisma.user.update({ where: { id: userId }, data: { profileImageUrl: imageUrl }, select: { profileImageUrl: true } });
  res.json(updated);
});

export default router;
