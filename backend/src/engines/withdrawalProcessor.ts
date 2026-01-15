import { initiateWithdrawal } from '../services/withdrawalProviderService.js'
import { sendWithdrawalEmail } from '../services/emailService.js'
import { prisma } from '../services/db.js'
import type { Prisma } from '@prisma/client'

function getIntervalMs() {
  const v = process.env.WITHDRAWAL_PROCESS_INTERVAL_MS
  const parsed = v ? parseInt(v, 10) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30000
}

export function startWithdrawalProcessor() {
  const enabledRaw = process.env.WITHDRAWAL_PROCESS_ENABLED
  const enabled = enabledRaw
    ? enabledRaw.toLowerCase() === 'true'
    : (process.env.NODE_ENV || '').toLowerCase() !== 'production'
  if (!enabled) return

  // If the processor is enabled, ensure provider config exists to avoid processing/refund loops.
  if (!process.env.WITHDRAWAL_PROVIDER_URL || !process.env.WITHDRAWAL_PROVIDER_SECRET) {
    console.warn(
      '[WARN] WITHDRAWAL_PROCESS_ENABLED=true but provider is not configured; set WITHDRAWAL_PROVIDER_URL and WITHDRAWAL_PROVIDER_SECRET'
    )
    return
  }

  let isProcessing = false // Prevent concurrent execution

  const tick = async () => {
    if (isProcessing) {
      console.log('Withdrawal processing already in progress, skipping...')
      return
    }

    isProcessing = true
    try {
      // Pick up pending withdrawals to initiate
      const pending = await prisma.withdrawal.findMany({
        where: { status: 'Pending' },
        take: 25,
        orderBy: { timestamp: 'asc' },
      })

      for (const w of pending) {
        try {
          const user = await prisma.user.findUnique({ where: { id: w.userId } })
          if (!user) continue

          const toAddress = user.withdraw_wallet_bep20 || ''
          if (!toAddress) {
            // No destination wallet; fail and refund
            await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
              await tx.withdrawal.update({ where: { id: w.id }, data: { status: 'Failed' } })
              await tx.wallet.update({ where: { userId: w.userId }, data: { balance: { increment: w.amount + w.fee } } })
            })
            continue
          }

          // Call external provider to initiate withdrawal
          const result = await initiateWithdrawal({
            userId: w.userId,
            toAddress,
            amount: w.amount,
            network: 'BEP20',
            source: (w.source as any) || 'REBATE',
            txId: w.txId,
          })

          // Mark as Processing and store provider request id
          await prisma.withdrawal.update({
            where: { id: w.id },
            data: { status: 'Processing' },
          })
        } catch (err) {
          console.error('Withdrawal initiation error', w.id, err)
          // Fail and refund
          try {
            await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
              await tx.withdrawal.update({ where: { id: w.id }, data: { status: 'Failed' } })
              await tx.wallet.update({ where: { userId: w.userId }, data: { balance: { increment: w.amount + w.fee } } })
            })
          } catch (e) {
            console.error('Withdrawal refund error', w.id, e)
          }
        }
      }

      // Promote any Processing withdrawals to Completed if provider marks done
      const processing = await prisma.withdrawal.findMany({ where: { status: 'Processing' }, take: 50 })
      for (const w of processing) {
        try {
          // In a real integration, poll provider status by request/txId.
          // For now, consider them completed after a grace period.
          const ageMs = Date.now() - w.timestamp.getTime()
          const minMs = Number(process.env.WITHDRAWAL_MIN_COMPLETE_MS || 60_000)
          if (ageMs < minMs) continue

          await prisma.withdrawal.update({ where: { id: w.id }, data: { status: 'Completed' } })

          const user = await prisma.user.findUnique({ where: { id: w.userId } })
          if (user) {
            try {
              await sendWithdrawalEmail(user.email, w.amount, w.network, w.txId)
            } catch (e) {
              console.error('Withdrawal email send error:', e)
            }
          }
        } catch (err) {
          console.error('Withdrawal completion promotion error', w.id, err)
        }
      }
    } catch (err) {
      console.error('Withdrawal processor tick error', err)
    } finally {
      isProcessing = false
      setTimeout(tick, getIntervalMs())
    }
  }

  setTimeout(tick, getIntervalMs())
}
