import { sendDepositEmail } from '../services/emailService.js'
import { verifyDeposit } from '../services/blockchainVerificationService.js'
import { prisma } from '../services/db.js'
import type { Prisma } from '@prisma/client'

function getIntervalMs() {
  const v = process.env.DEPOSIT_VERIFICATION_INTERVAL_MS
  const parsed = v ? parseInt(v, 10) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30000
}

export function startDepositVerificationScheduler() {
  const enabled = (process.env.DEPOSIT_VERIFICATION_ENABLED || 'true').toLowerCase() === 'true'
  if (!enabled) return

  let isProcessing = false // Prevent concurrent execution

  const tick = async () => {
    if (isProcessing) {
      console.log('Deposit verification already in progress, skipping...')
      return
    }

    isProcessing = true
    try {
      // Fetch pending deposits to verify
      const pending = await prisma.deposit.findMany({
        where: { status: 'Pending' },
        take: 50,
        orderBy: { timestamp: 'asc' },
      })

      for (const d of pending) {
        try {
          const expectedToAddress = d.network === 'BEP20' ? (process.env.WALLET_BEP20_ADDRESS || '') : (process.env.WALLET_TRC20_ADDRESS || '')
          if (!expectedToAddress) {
            console.warn('Skipping verification; missing expected wallet for network', d.network)
            continue
          }

          const result = await verifyDeposit(d.txId, d.network as 'BEP20' | 'TRC20', expectedToAddress, d.amount)
          if (result.verified) {
            await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
              await tx.deposit.update({ where: { id: d.id }, data: { status: 'Confirmed' } })

              // Credit user's wallet balance (stored in Wallet model)
              await tx.wallet.upsert({
                where: { userId: d.userId },
                create: { userId: d.userId, balance: d.amount },
                update: { balance: { increment: d.amount } },
              })
            })

            // Send confirmation email
            const user = await prisma.user.findUnique({ where: { id: d.userId } })
            if (user) {
              try {
                await sendDepositEmail(user.email, d.amount, d.network, d.txId)
              } catch (e) {
                console.error('Deposit email send error:', e)
              }
            }
          }
        } catch (innerErr) {
          // Continue with next deposit; log and move on
          console.error('Verification error for deposit', d.id, innerErr)
        }
      }
    } catch (err) {
      console.error('Deposit verification tick error', err)
    } finally {
      isProcessing = false
      setTimeout(tick, getIntervalMs())
    }
  }

  // Start the loop
  setTimeout(tick, getIntervalMs())
}
