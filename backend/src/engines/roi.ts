import cron from 'node-cron';
import { prisma } from '../services/db.js';
import { v4 as uuidv4 } from 'uuid';
import type { Prisma } from '@prisma/client';

let isProcessing = false; // Prevent concurrent execution

export function scheduleDailyROI() {
  // Run every day at 00:15
  cron.schedule('15 0 * * *', async () => {
    if (isProcessing) {
      console.log('ROI processing already in progress, skipping...');
      return;
    }

    isProcessing = true;
    try {
      const users = await prisma.user.findMany({ where: { status: 'Active' } });
      for (const user of users) {
      const pkg = await prisma.packageActivation.findFirst({ where: { userId: user.id, cycleStatus: 'Active' }, orderBy: { activatedAt: 'desc' } });
      if (!pkg) continue;
      const since = Date.now() - new Date(pkg.activatedAt).getTime();
      if (since < 24 * 3600_000) continue; // start after 24h

      const roiAmount = Number(pkg.amount) * 0.015; // 1.5%
      const txId = uuidv4();

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Stop if cycle complete
        const roiAgg = await tx.rOILedger.aggregate({ _sum: { amount: true }, where: { userId: user.id } });
        const bonusAgg = await tx.bonusLedger.aggregate({ _sum: { amount: true }, where: { userId: user.id } });
        const rebateAgg = await tx.rebateLedger.aggregate({ _sum: { amount: true }, where: { userId: user.id } });
        const total = Number(roiAgg._sum.amount ?? 0) + Number(bonusAgg._sum.amount ?? 0) + Number(rebateAgg._sum.amount ?? 0);
        const cap = Number(pkg.cycleCap);
        if (total >= cap) return;

        await tx.rOILedger.create({ data: { userId: user.id, packageId: pkg.id, amount: roiAmount, txId } });
        await tx.wallet.upsert({
          where: { userId: user.id },
          create: { userId: user.id, balance: roiAmount },
          update: { balance: { increment: roiAmount } },
        });
      });
    }
    } catch (error) {
      console.error('ROI scheduler error:', error);
    } finally {
      isProcessing = false;
    }
  });
}
