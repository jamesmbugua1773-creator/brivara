import crypto from 'crypto'
import axios from 'axios'

type Network = 'BEP20'

export interface InitiateWithdrawalInput {
  userId: string
  toAddress: string
  amount: number
  network: Network
  source: 'REBATE' | 'REFERRAL' | 'AWARDS' | 'FUNDING'
  txId: string
}

export interface InitiateWithdrawalResult {
  providerRequestId: string
  status: 'queued' | 'processing' | 'submitted'
}

function signPayload(payload: unknown, secret: string) {
  const body = JSON.stringify(payload)
  const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex')
  return { body, signature: hmac }
}

/**
 * Generic provider integration via HTTP webhook/API
 * Reads WITHDRAWAL_PROVIDER_URL and WITHDRAWAL_PROVIDER_SECRET from env.
 * The external platform should create the on-chain transfer and report status via its own mechanisms.
 */
export async function initiateWithdrawal(input: InitiateWithdrawalInput): Promise<InitiateWithdrawalResult> {
  const url = process.env.WITHDRAWAL_PROVIDER_URL
  const secret = process.env.WITHDRAWAL_PROVIDER_SECRET
  if (!url || !secret) {
    throw new Error('Withdrawal provider not configured (WITHDRAWAL_PROVIDER_URL/SECRET)')
  }

  const payload = {
    event: 'withdrawal.request',
    data: {
      userId: input.userId,
      toAddress: input.toAddress,
      amount: input.amount,
      network: input.network,
      source: input.source,
      txId: input.txId,
      requestedAt: Date.now(),
    },
  }

  const { body, signature } = signPayload(payload, secret)
  const resp = await axios.post(url, body, {
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': signature,
    },
    timeout: 15000,
  })

  const providerRequestId = resp.data?.requestId || resp.data?.id || input.txId
  return { providerRequestId, status: 'queued' }
}
