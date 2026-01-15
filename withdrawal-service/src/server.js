import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { validateSignature, initiateWithdrawal } from './bep20Handler.js'

const app = express()
const PORT = process.env.PORT || 5000

app.use(express.json())
app.use(cors())
app.use(morgan('combined'))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'withdrawal-service' })
})

// Withdrawal request endpoint
// Expected POST body:
// {
//   "event": "withdrawal.request",
//   "data": {
//     "userId": "user123",
//     "toAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
//     "amount": 0.1,
//     "network": "BEP20",
//     "source": "REBATE",
//     "txId": "wd_abc123xyz",
//     "requestedAt": 1704067200000
//   }
// }
// Expected header:
// X-Signature: hmac-sha256(body, secret)

app.post('/withdraw', async (req, res) => {
  try {
    const signature = req.headers['x-signature']
    const body = JSON.stringify(req.body)

    // Validate signature
    if (!validateSignature(body, signature)) {
      return res.status(401).json({ error: 'Invalid signature' })
    }

    const { event, data } = req.body

    if (event !== 'withdrawal.request') {
      return res.status(400).json({ error: 'Invalid event type' })
    }

    const { userId, toAddress, amount, network, txId } = data

    if (network !== 'BEP20') {
      return res.status(400).json({ error: 'Only BEP20 supported by this service' })
    }

    if (!toAddress || !amount || !txId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    console.log(`[API] Withdrawal request: ${amount} BNB to ${toAddress} (user: ${userId}, txId: ${txId})`)

    // Process withdrawal
    const result = await initiateWithdrawal(toAddress, amount, txId)

    // Return result with request ID
    res.json({
      requestId: txId,
      transactionId: result.txId,
      status: result.success ? 'processed' : 'failed',
      ...result,
    })
  } catch (err) {
    console.error('[API] Error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Withdrawal service running on port ${PORT}`)
  console.log(`📍 POST /withdraw to initiate BEP20 transfers`)
})
