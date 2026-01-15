import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../services/db.js';
import { createToken } from '../../utils/jwt.js';
import { sendRegistrationEmail, sendPasswordResetEmail, sendPasswordResetConfirmEmail } from '../../services/emailService.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { requireJwtSecret } from '../../config/env.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3),
  country: z.string().min(2),
  sponsorCode: z.string().min(3, 'Referral code is required'),
});

router.post('/register', async (req, res) => {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { email, password, username, country, sponsorCode } = parse.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const existingUsername = await prisma.user.findFirst({ where: { username } });
  if (existingUsername) return res.status(409).json({ error: 'Username already taken' });

  const passwordHash = await bcrypt.hash(password, 10);

  const sponsor = await prisma.user.findUnique({ where: { referralCode: sponsorCode } });
  if (!sponsor) return res.status(400).json({ error: 'Invalid referral code' });
  const sponsorId: string = sponsor.id;

  let user;
  try {
    user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        referralCode: cryptoRandom(),
        country,
        sponsorId,
      },
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'Username already taken' });
    }
    throw error;
  }
  const token = createToken(user.id);
  // Send registration email
  try {
    await sendRegistrationEmail(email, username);
  } catch (error) {
    console.error('Registration email send error:', error);
    // Don't fail registration if email fails
  }
  res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
});

const loginSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).optional(),
  password: z.string().min(8)
}).refine((data) => data.email || data.username, { message: 'Email or username required' });

router.post('/login', async (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { email, username, password } = parse.data;
  // Find user by email or username
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        ...(email ? [{ email }] : []),
        ...(username ? [{ username }] : []),
      ]
    }
  });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = createToken(user.id);
  res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
});

router.post('/refresh', async (req, res) => {
  // In a real system, validate refresh token. Here issue a new token.
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const token = createToken(user.id);
  res.json({ token });
});

function cryptoRandom() {
  return Math.random().toString(36).slice(2, 10);
}

export default router;

// Forgot password: Issue a short-lived reset token and send email
const forgotSchema = z.object({ email: z.string().email() });
router.post('/forgot', async (req, res) => {
  const parse = forgotSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { email } = parse.data;
  const user = await prisma.user.findUnique({ where: { email } });
  // Always return success to avoid email enumeration
  if (!user) return res.json({ success: true });
  const token = jwt.sign({ sub: user.id, typ: 'password_reset' }, requireJwtSecret(), { expiresIn: '15m' });
  try {
    await sendPasswordResetEmail(email, token);
    res.json({ success: true });
  } catch (error) {
    console.error('Password reset email send error:', error);
    // Still return success to avoid enumeration
    res.json({ success: true });
  }
});

// Reset password using token
const resetSchema = z.object({ token: z.string().min(10), newPassword: z.string().min(8), confirmPassword: z.string().min(8) })
  .refine((d) => d.newPassword === d.confirmPassword, { message: 'Passwords do not match' });
router.post('/reset', async (req, res) => {
  const parse = resetSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { token, newPassword } = parse.data;
  try {
    const payload = jwt.verify(token, requireJwtSecret()) as any;
    if (payload?.typ !== 'password_reset') return res.status(400).json({ error: 'Invalid token type' });
    const userId = payload.sub as string;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const hash = await bcrypt.hash(newPassword, 10);
    const updatedUser = await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash, lastLogin: new Date() } });
    // Send password reset confirmation email
    try {
      await sendPasswordResetConfirmEmail(user.email, user.username);
    } catch (error) {
      console.error('Password reset confirmation email error:', error);
      // Don't fail the reset if email fails
    }
    return res.json({ success: true });
  } catch (e: any) {
    const msg = e?.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(400).json({ error: msg });
  }
});
