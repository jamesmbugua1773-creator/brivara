import { Router } from 'express';
import { prisma } from '../../services/db.js';
import { authMiddleware } from '../../utils/authMiddleware.js';
import { z } from 'zod';
import nodemailer from 'nodemailer';

const router = Router();

// Email transporter
const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    return nodemailer.createTransporter({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.ETHEREAL_USER || 'your-ethereal-user',
        pass: process.env.ETHEREAL_PASS || 'your-ethereal-pass',
      },
    });
  }
};

const sendDepositEmail = async (email: string, amount: number, network: string, txId: string) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Dev: Deposit confirmed for ${email}: $${amount} on ${network}, TxID: ${txId}`);
    return;
  }
  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@brivara.com',
    to: email,
    subject: 'Deposit Confirmed',
    html: `
      <p>Your deposit has been confirmed!</p>
      <p>Amount: $${amount.toFixed(2)}</p>
      <p>Network: ${network}</p>
      <p>Transaction ID: ${txId}</p>
      <p>Funds have been credited to your wallet.</p>
      <p>Best regards,<br>Brivara Team</p>
    `,
  };
  await transporter.sendMail(mailOptions);
};

const sendWithdrawalEmail = async (email: string, amount: number, network: string, txId: string) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Dev: Withdrawal completed for ${email}: $${amount} on ${network}, TxID: ${txId}`);
    return;
  }
  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@brivara.com',
    to: email,
    subject: 'Withdrawal Completed',
    html: `
      <p>Your withdrawal has been processed!</p>
      <p>Amount: $${amount.toFixed(2)}</p>
      <p>Network: ${network}</p>
      <p>Transaction ID: ${txId}</p>
      <p>Please check your wallet for the funds.</p>
      <p>Best regards,<br>Brivara Team</p>
    `,
  };
  await transporter.sendMail(mailOptions);
};

async function handleDepositHistory(req: any, res: any) {
  const userId = (req as any).userId as string;
  const entries = await prisma.deposit.findMany({ where: { userId }, orderBy: { timestamp: 'desc' } });
  res.json(entries);
}
router.get('/deposit-history', authMiddleware, handleDepositHistory);

// Funding: user-accessible deposits must be on-chain (BEP20 or TRC20). SYSTEM deposits are admin-only.
const createDepositSchema = z.object({ amount: z.number().positive(), network: z.enum(['BEP20','TRC20']), txId: z.string().optional() });
async function handleCreateDeposit(req: any, res: any) {
  const userId = (req as any).userId as string;
  const parse = createDepositSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { amount, network } = parse.data;
  const txId = parse.data.txId || `chain_${Math.random().toString(36).slice(2)}`;
  const dup = await prisma.deposit.findUnique({ where: { txId } });
  if (dup) return res.status(409).json({ error: 'Duplicate TxID' });
  // Ensure the user exists (tokens may be stale after DB resets)
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(401).json({ error: 'Invalid user token' });
  // Automatically apply deposit fee (default 1.5%) charged ON TOP
  // User pays: gross = amount + fee; Wallet credit: full amount
  const feePercent = Number(process.env.DEPOSIT_FEE_PERCENT || 1.5);
  const fee = (amount * feePercent) / 100;

    // Create deposit and confirm immediately (dev convenience)
  try {
      let dep = await prisma.deposit.create({ data: { userId, amount, fee, network, txId, status: 'Pending' } });
      // Immediately confirm and credit wallet with full amount (fee charged on top)
      dep = await prisma.deposit.update({ where: { txId }, data: { status: 'Confirmed' } });
      await prisma.wallet.upsert({
        where: { userId },
        create: { userId, balance: amount },
        update: { balance: { increment: amount } },
      });
      // Send confirmation email
      try {
        await sendDepositEmail(user.email, amount, network, txId);
      } catch (error) {
        console.error('Deposit email send error:', error);
      }
      res.json(dep);
  } catch (e) {
    return res.status(400).json({ error: 'Deposit creation failed' });
  }

}
router.post('/create-deposit', authMiddleware, handleCreateDeposit);

async function handleWithdrawalHistory(req: any, res: any) {
  const userId = (req as any).userId as string;
  const entries = await prisma.withdrawal.findMany({ where: { userId }, orderBy: { timestamp: 'desc' } });
  res.json(entries);
}
router.get('/withdrawal-history', authMiddleware, handleWithdrawalHistory);

const requestWithdrawalSchema = z.object({ amount: z.number().positive(), network: z.literal('BEP20'), source: z.enum(['REBATE','REFERRAL','AWARDS']) });
async function handleRequestWithdrawal(req: any, res: any) {
  const userId = (req as any).userId as string;
  const parse = requestWithdrawalSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { amount, network, source } = parse.data;
  const min = Number(process.env.MIN_WITHDRAWAL || 10);
  const feePercent = Number(process.env.WITHDRAWAL_FEE_PERCENT || 5);
  const cooldownHours = Number(process.env.WITHDRAWAL_COOLDOWN_HOURS || 24);

  if (amount < min) return res.status(400).json({ error: `Minimum withdrawal is ${min}` });

  // Ensure the user exists (tokens may be stale after DB resets)
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(401).json({ error: 'Invalid user token' });

  const last = await prisma.withdrawal.findFirst({ where: { userId }, orderBy: { timestamp: 'desc' } });
  if (last && Date.now() - last.timestamp.getTime() < cooldownHours * 3600_000) {
    return res.status(429).json({ error: 'Only 1 withdrawal allowed every 24 hours' });
  }

  // Determine available per source
  let available = 0;
  if (source === 'REBATE') {
    const sum = await prisma.rebateLedger.aggregate({ where: { userId }, _sum: { amount: true } });
    const withdrawn = await prisma.withdrawal.aggregate({ where: { userId, source: 'REBATE' }, _sum: { amount: true } });
    available = Number(sum._sum.amount || 0) - Number(withdrawn._sum.amount || 0);
  } else if (source === 'REFERRAL') {
    const sum = await prisma.bonusLedger.aggregate({ where: { userId }, _sum: { amount: true } });
    const withdrawn = await prisma.withdrawal.aggregate({ where: { userId, source: 'REFERRAL' }, _sum: { amount: true } });
    available = Number(sum._sum.amount || 0) - Number(withdrawn._sum.amount || 0);
  } else if (source === 'AWARDS') {
    // Using packageAmount as award earning proxy
    const sum = await prisma.awardLedger.aggregate({ where: { userId }, _sum: { packageAmount: true } });
    const withdrawn = await prisma.withdrawal.aggregate({ where: { userId, source: 'AWARDS' }, _sum: { amount: true } });
    available = Number(sum._sum.packageAmount || 0) - Number(withdrawn._sum.amount || 0);
  }

  if (available < amount) return res.status(400).json({ error: 'Insufficient source earnings' });

  const wallet = await prisma.wallet.findFirst({ where: { userId } });
  const fee = (amount * feePercent) / 100;
  const total = amount + fee;
  if (!wallet || Number(wallet.balance) < total) return res.status(400).json({ error: 'Insufficient wallet balance' });

  const txId = `wd_${Math.random().toString(36).slice(2)}`;
  const wd = await prisma.withdrawal.create({ data: { userId, amount, fee, network, source, txId, status: 'Pending' } });
  await prisma.wallet.update({ where: { userId }, data: { balance: { decrement: total } } });

  res.json(wd);

  // Simulate processing delay between 1–10 minutes, then mark completed
  const minMs = 60_000;
  const maxMs = 10 * 60_000;
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  setTimeout(async () => {
    try {
      const current = await prisma.withdrawal.findUnique({ where: { txId } });
      if (!current || current.status !== 'Pending') return;
      await prisma.withdrawal.update({ where: { txId }, data: { status: 'Completed' } });
      // Send completion email
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (user) {
        try {
          await sendWithdrawalEmail(user.email, amount, network, txId);
        } catch (error) {
          console.error('Withdrawal email send error:', error);
        }
      }
    } catch {}
  }, delay);
}
router.post('/request-withdrawal', authMiddleware, handleRequestWithdrawal);

// Spec-aligned aliases wired to same handlers
router.post('/deposit/create', authMiddleware, handleCreateDeposit);
router.get('/deposit/history', authMiddleware, handleDepositHistory);
router.post('/withdrawal/request', authMiddleware, handleRequestWithdrawal);
router.get('/withdrawal/history', authMiddleware, handleWithdrawalHistory);

export default router;
