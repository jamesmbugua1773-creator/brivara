import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../services/db.js';
import { createToken } from '../../utils/jwt.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

const router = Router();

// Create email transporter
const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    // Use production SMTP settings
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // For dev, use Ethereal or console log
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.ETHEREAL_USER || 'your-ethereal-user',
        pass: process.env.ETHEREAL_PASS || 'your-ethereal-pass',
      },
    });
  }
};

const sendResetEmail = async (email: string, resetUrl: string) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Dev: Password reset for ${email}: ${resetUrl}`);
    return;
  }
  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@brivara.com',
    to: email,
    subject: 'Password Reset Request',
    html: `
      <p>You requested a password reset for your Brivara account.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link will expire in 15 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  };
  await transporter.sendMail(mailOptions);
};

const sendWelcomeEmail = async (email: string, username: string) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Dev: Welcome email for ${email} (${username})`);
    return;
  }
  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@brivara.com',
    to: email,
    subject: 'Welcome to Brivara!',
    html: `
      <p>Welcome ${username}!</p>
      <p>Your Brivara account has been successfully created.</p>
      <p>You can now log in and start investing.</p>
      <p>Best regards,<br>Brivara Team</p>
    `,
  };
  await transporter.sendMail(mailOptions);
};

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

  const passwordHash = await bcrypt.hash(password, 10);

  const sponsor = await prisma.user.findUnique({ where: { referralCode: sponsorCode } });
  if (!sponsor) return res.status(400).json({ error: 'Invalid referral code' });
  const sponsorId: string = sponsor.id;

  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      referralCode: cryptoRandom(),
      country,
      sponsorId,
    },
  });
  const token = createToken(user.id);
  // Send welcome email
  try {
    await sendWelcomeEmail(email, username);
  } catch (error) {
    console.error('Welcome email send error:', error);
    // Don't fail registration
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
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const token = jwt.sign({ sub: user.id, typ: 'password_reset' }, secret, { expiresIn: '15m' });
  const frontendBase = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
  const resetUrl = `${frontendBase}/reset-password/${token}`;
  try {
    await sendResetEmail(email, resetUrl);
    res.json({ success: true });
  } catch (error) {
    console.error('Email send error:', error);
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
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const payload = jwt.verify(token, secret) as any;
    if (payload?.typ !== 'password_reset') return res.status(400).json({ error: 'Invalid token type' });
    const userId = payload.sub as string;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash, lastLogin: new Date() } });
    return res.json({ success: true });
  } catch (e: any) {
    const msg = e?.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(400).json({ error: msg });
  }
});
