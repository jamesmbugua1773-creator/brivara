import { Router } from 'express';
import { prisma } from '../../services/db.js';
import { authMiddleware } from '../../utils/authMiddleware.js';
import { z } from 'zod';

const router = Router();

// Request funding (loan)
router.post('/request-funding', authMiddleware, async (req, res) => {
  try {
    const { amount } = z.object({
      amount: z.number().min(25).max(250), // Funding between $25 and $250
    }).parse(req.body);

    const userId = (req as any).userId as string;

    // Check if user already has active funding
    const existingFunding = await prisma.funding.findFirst({
      where: { userId, status: 'Active' }
    });

    if (existingFunding) {
      return res.status(400).json({ error: 'You already have active funding. Please repay before requesting new funding.' });
    }

    // Create funding record
    const funding = await prisma.funding.create({
      data: {
        userId,
        amount,
        requiredReturn: amount * 3, // 3x return requirement
        txId: `FUND-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }
    });

    // Add funding amount to user's wallet
    await prisma.wallet.upsert({
      where: { userId },
      update: { balance: { increment: amount } },
      create: { userId, balance: amount }
    });

    res.json({
      message: `Funding of $${amount} approved and added to your wallet.`,
      funding: {
        id: funding.id,
        amount: funding.amount,
        requiredReturn: funding.requiredReturn,
        fundedAt: funding.fundedAt
      }
    });

  } catch (error) {
    console.error('Funding request error:', error);
    res.status(500).json({ error: 'Failed to process funding request' });
  }
});

// Get user's funding history
router.get('/funding-history', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const fundings = await prisma.funding.findMany({
      where: { userId },
      orderBy: { fundedAt: 'desc' }
    });
    res.json(fundings);
  } catch (error) {
    console.error('Funding history error:', error);
    res.status(500).json({ error: 'Failed to load funding history' });
  }
});

// Get user's current funding status
router.get('/funding-status', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId as string;

    const activeFunding = await prisma.funding.findFirst({
      where: { userId, status: 'Active' }
    });

    if (!activeFunding) {
      return res.json({ hasFunding: false });
    }

    // Calculate total earnings from funded amount
    const totalEarned = await prisma.rOILedger.aggregate({
      where: {
        userId,
        timestamp: { gte: activeFunding.fundedAt }
      },
      _sum: { amount: true }
    });

    const earned = totalEarned._sum.amount || 0;

    // Update funding record with current earnings
    await prisma.funding.update({
      where: { id: activeFunding.id },
      data: { totalEarned: earned }
    });

    const canWithdraw = earned >= activeFunding.requiredReturn;

    res.json({
      hasFunding: true,
      funding: {
        id: activeFunding.id,
        amount: activeFunding.amount,
        totalEarned: earned,
        requiredReturn: activeFunding.requiredReturn,
        canWithdraw,
        progress: (earned / activeFunding.requiredReturn) * 100,
        fundedAt: activeFunding.fundedAt
      }
    });

  } catch (error) {
    console.error('Funding status error:', error);
    res.status(500).json({ error: 'Failed to load funding status' });
  }
});

export default router;