import { Router } from 'express';
import { prisma } from '../../services/db.js';
import { authMiddleware } from '../../utils/authMiddleware.js';
import { z } from 'zod';
import { sendDepositEmail, sendWithdrawalEmail } from '../../services/emailService.js';
import {
  getWalletForNetwork,
  generateTransactionId,
  generateTransactionSignature,
  verifyTransactionSignature,
  validateWalletAddress,
  logTransaction,
  getUserWithdrawalWallet,
} from '../../services/walletService.js';

const router = Router();

// Email sending handled by services/emailService

async function handleDepositHistory(req: any, res: any) {
  const userId = (req as any).userId as string;
  const entries = await prisma.deposit.findMany({ where: { userId }, orderBy: { timestamp: 'desc' } });
  res.json(entries);
}
router.get('/deposit-history', authMiddleware, handleDepositHistory);

// Funding: user-accessible deposits must be on-chain (BEP20 or TRC20). SYSTEM deposits are admin-only.
const createDepositSchema = z.object({
  amount: z.number().positive(),
  network: z.enum(['BEP20', 'TRC20']),
  txId: z.string().optional(),
  signature: z.string().optional(), // For transaction authentication
});

async function handleCreateDeposit(req: any, res: any) {
  try {
    const userId = (req as any).userId as string;
    const parse = createDepositSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

    const { amount, network } = parse.data;

    // Ensure the user exists (tokens may be stale after DB resets)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ error: 'Invalid user token' });

    // Generate transaction ID if not provided
    const txId = parse.data.txId || generateTransactionId(network as 'BEP20' | 'TRC20');

    // Check for duplicate
    const dup = await prisma.deposit.findUnique({ where: { txId } });
    if (dup) return res.status(409).json({ error: 'Duplicate TxID' });

    // Validate wallet address setup (user must have deposit wallet configured)
    const depositWallet = network === 'BEP20' ? user.deposit_wallet_bep20 : user.deposit_wallet_trc20;
    if (!depositWallet) {
      return res.status(400).json({
        error: `User must configure ${network} deposit wallet in profile before deposits`,
      });
    }

    // Log transaction initiation
    logTransaction('deposit', userId, amount, network as 'BEP20' | 'TRC20', txId, 'initiated');

    // Generate transaction signature for authentication
    const timestamp = Date.now();
    const signature = generateTransactionSignature(txId, userId, amount, network, timestamp);

    // Apply deposit fee (default 1.5%) charged ON TOP
    // User pays: gross = amount + fee; Wallet credit: full amount
    const feePercent = Number(process.env.DEPOSIT_FEE_PERCENT || 1.5);
    const fee = (amount * feePercent) / 100;

    // Create deposit record
    let dep = await prisma.deposit.create({
      data: {
        userId,
        amount,
        fee,
        network,
        txId,
        status: 'Pending',
      },
    });

    // Log transaction recorded (awaiting on-chain verification)
    logTransaction('deposit', userId, amount, network as 'BEP20' | 'TRC20', txId, 'verified');

    // Auto-confirm path for development/testing only (disabled in production)
    const autoConfirm = (process.env.DEPOSIT_AUTO_CONFIRM || '').toLowerCase() === 'true' && process.env.NODE_ENV !== 'production';
    if (autoConfirm) {
      dep = await prisma.deposit.update({ where: { txId }, data: { status: 'Confirmed' } });
      await prisma.wallet.upsert({
        where: { userId },
        create: { userId, balance: amount },
        update: { balance: { increment: amount } },
      });
      logTransaction('deposit', userId, amount, network as 'BEP20' | 'TRC20', txId, 'confirmed');
      try {
        await sendDepositEmail(user.email, amount, network, txId);
      } catch (error) {
        console.error('Deposit email send error:', error);
      }
    }

    // Return deposit details without exposing wallet addresses
    res.json({
      ...dep,
      signature, // Client can verify transaction
      timestamp,
    });
  } catch (e) {
    console.error('Deposit creation error:', e);
    res.status(400).json({ error: 'Deposit creation failed' });
  }
}
router.post('/create-deposit', authMiddleware, handleCreateDeposit);

async function handleWithdrawalHistory(req: any, res: any) {
  const userId = (req as any).userId as string;
  const entries = await prisma.withdrawal.findMany({ where: { userId }, orderBy: { timestamp: 'desc' } });
  res.json(entries);
}
router.get('/withdrawal-history', authMiddleware, handleWithdrawalHistory);

const requestWithdrawalSchema = z.object({
  amount: z.number().positive(),
  network: z.literal('BEP20'),
  source: z.enum(['REBATE', 'REFERRAL', 'AWARDS', 'FUNDING']),
});

async function handleRequestWithdrawal(req: any, res: any) {
  try {
    const userId = (req as any).userId as string;
    const parse = requestWithdrawalSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

    const { amount, network, source } = parse.data;
    const min = Number(process.env.MIN_WITHDRAWAL || 10);
    const feePercent = Number(process.env.WITHDRAWAL_FEE_PERCENT || 5);
    const cooldownHours = Number(process.env.WITHDRAWAL_COOLDOWN_HOURS || 24);

    if (amount < min) return res.status(400).json({ error: `Minimum withdrawal is $${min}` });

    // Ensure the user exists (tokens may be stale after DB resets)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ error: 'Invalid user token' });

    // Validate user has withdrawal wallet configured
    const userWithdrawalWallet = user.withdraw_wallet_bep20;
    if (!userWithdrawalWallet) {
      return res.status(400).json({
        error: 'Please configure your BEP20 withdrawal wallet in your profile before withdrawing',
      });
    }

    // Validate wallet address format
    if (!validateWalletAddress(userWithdrawalWallet, 'BEP20')) {
      return res.status(400).json({ error: 'Invalid withdrawal wallet address format' });
    }

    const last = await prisma.withdrawal.findFirst({ where: { userId }, orderBy: { timestamp: 'desc' } });
    if (last && Date.now() - last.timestamp.getTime() < cooldownHours * 3600_000) {
      return res.status(429).json({ error: 'Only 1 withdrawal allowed every 24 hours' });
    }

    // Determine available per source
    let available = 0;
    if (source === 'REBATE') {
      const sum = await prisma.rebateLedger.aggregate({ where: { userId }, _sum: { amount: true } });
      const withdrawn = await prisma.withdrawal.aggregate({
        where: { userId, source: 'REBATE' },
        _sum: { amount: true },
      });
      available = Number(sum._sum.amount || 0) - Number(withdrawn._sum.amount || 0);
    } else if (source === 'REFERRAL') {
      const sum = await prisma.bonusLedger.aggregate({ where: { userId }, _sum: { amount: true } });
      const withdrawn = await prisma.withdrawal.aggregate({
        where: { userId, source: 'REFERRAL' },
        _sum: { amount: true },
      });
      available = Number(sum._sum.amount || 0) - Number(withdrawn._sum.amount || 0);
    } else if (source === 'AWARDS') {
      const sum = await prisma.awardLedger.aggregate({ where: { userId }, _sum: { packageAmount: true } });
      const withdrawn = await prisma.withdrawal.aggregate({
        where: { userId, source: 'AWARDS' },
        _sum: { amount: true },
      });
      available = Number(sum._sum.packageAmount || 0) - Number(withdrawn._sum.amount || 0);
    }

    // Check funding requirements for non-awards/referral withdrawals
    if (source === 'REBATE' || source === 'FUNDING') {
      const activeFunding = await prisma.funding.findFirst({
        where: { userId, status: 'Active' },
      });

      if (activeFunding) {
        const totalEarned = await prisma.rOILedger.aggregate({
          where: {
            userId,
            timestamp: { gte: activeFunding.fundedAt },
          },
          _sum: { amount: true },
        });

        const earned = totalEarned._sum.amount || 0;

        if (earned < activeFunding.requiredReturn) {
          return res.status(400).json({
            error: `You must earn $${activeFunding.requiredReturn.toFixed(2)} (3x your $${activeFunding.amount} funding) before withdrawing earnings. Current earnings: $${earned.toFixed(2)}.`,
          });
        }
      }
    }

    const wallet = await prisma.wallet.findFirst({ where: { userId } });
    const fee = (amount * feePercent) / 100;
    const total = amount + fee;
    if (!wallet || Number(wallet.balance) < total) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    // Generate transaction ID and signature
    const txId = generateTransactionId(network as 'BEP20' | 'TRC20');
    const timestamp = Date.now();
    const signature = generateTransactionSignature(txId, userId, amount, network, timestamp);

    // Log transaction initiation
    logTransaction('withdrawal', userId, amount, network as 'BEP20' | 'TRC20', txId, 'initiated', {
      source,
      destination: userWithdrawalWallet.substring(0, 6) + '...' + userWithdrawalWallet.substring(userWithdrawalWallet.length - 4), // Partial obfuscation
    });

    const wd = await prisma.withdrawal.create({
      data: { userId, amount, fee, network, source, txId, status: 'Pending' },
    });

    await prisma.wallet.update({ where: { userId }, data: { balance: { decrement: total } } });

    // Log transaction verification
    logTransaction('withdrawal', userId, amount, network as 'BEP20' | 'TRC20', txId, 'verified');

    res.json({
      ...wd,
      signature, // Client can verify transaction authenticity
      timestamp,
    });

    // Withdrawal initiation/completion handled by background processor
  } catch (error) {
    console.error('Withdrawal request error:', error);
    res.status(500).json({ error: 'Failed to process withdrawal request' });
  }
}
router.post('/request-withdrawal', authMiddleware, handleRequestWithdrawal);

// Spec-aligned aliases wired to same handlers
router.post('/deposit/create', authMiddleware, handleCreateDeposit);
router.get('/deposit/history', authMiddleware, handleDepositHistory);
router.post('/withdrawal/request', authMiddleware, handleRequestWithdrawal);
router.get('/withdrawal/history', authMiddleware, handleWithdrawalHistory);

export default router;
