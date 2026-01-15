import crypto from 'crypto'
import { Web3 } from 'web3'

const BSC_RPC_URL = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/'
const WITHDRAW_WALLET_ADDRESS = process.env.WITHDRAW_WALLET_ADDRESS
const WITHDRAW_WALLET_PRIVATE_KEY = process.env.WITHDRAW_WALLET_PRIVATE_KEY
const WITHDRAWAL_SIGNATURE_SECRET = process.env.WITHDRAWAL_SIGNATURE_SECRET

if (!WITHDRAW_WALLET_ADDRESS || !WITHDRAW_WALLET_PRIVATE_KEY) {
  throw new Error('Missing WITHDRAW_WALLET_ADDRESS or WITHDRAW_WALLET_PRIVATE_KEY')
}

const web3 = new Web3(BSC_RPC_URL)
const account = web3.eth.accounts.privateKeyToAccount(WITHDRAW_WALLET_PRIVATE_KEY)
web3.eth.accounts.wallet.add(account)

export function validateSignature(payload, signature) {
  if (!WITHDRAWAL_SIGNATURE_SECRET) {
    console.warn('WITHDRAWAL_SIGNATURE_SECRET not set; skipping signature validation')
    return true
  }
  const expectedSig = crypto.createHmac('sha256', WITHDRAWAL_SIGNATURE_SECRET).update(payload).digest('hex')
  return signature === expectedSig
}

export async function initiateWithdrawal(toAddress, amount, txId) {
  console.log(`[Withdrawal] Processing ${amount} BNB to ${toAddress} (txId: ${txId})`)

  try {
    // Validate BSC address format
    const isValidAddress = web3.utils.isAddress(toAddress)
    if (!isValidAddress) {
      throw new Error(`Invalid BSC address: ${toAddress}`)
    }

    // Check wallet balance
    const balanceWei = await web3.eth.getBalance(WITHDRAW_WALLET_ADDRESS)
    const balanceInBNB = Number(web3.utils.fromWei(balanceWei, 'ether'))
    
    if (balanceInBNB < amount) {
      throw new Error(`Insufficient balance: ${balanceInBNB} BNB < ${amount} BNB required`)
    }

    // Get current gas price
    const gasPrice = await web3.eth.getGasPrice()
    
    // Estimate gas
    const gasEstimate = await web3.eth.estimateGas({
      from: WITHDRAW_WALLET_ADDRESS,
      to: toAddress,
      value: web3.utils.toWei(amount.toString(), 'ether')
    })

    // Create and send transaction
    const tx = {
      from: WITHDRAW_WALLET_ADDRESS,
      to: toAddress,
      value: web3.utils.toWei(amount.toString(), 'ether'),
      gas: gasEstimate,
      gasPrice: gasPrice
    }

    const signedTx = await web3.eth.accounts.signTransaction(tx, WITHDRAW_WALLET_PRIVATE_KEY)
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
    
    const txHash = receipt.transactionHash

    console.log(`[Withdrawal] ✅ Transaction sent: ${txHash}`)

    // Wait for confirmation
    let confirmed = false
    let attempts = 0
    let blockNumber = null

    while (!confirmed && attempts < 15) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      try {
        const txReceipt = await web3.eth.getTransactionReceipt(txHash)
        if (txReceipt && txReceipt.status) {
          confirmed = true
          blockNumber = txReceipt.blockNumber
        }
      } catch (e) {
        // Still pending
      }
      attempts++
    }

    return {
      success: true,
      txId: txHash,
      toAddress,
      amount,
      confirmed,
      blockNumber,
      message: confirmed ? 'Withdrawal confirmed on-chain' : 'Withdrawal pending confirmation',
    }
  } catch (err) {
    console.error(`[Withdrawal] ❌ Error:`, err.message)
    return {
      success: false,
      error: err.message,
      txId,
      toAddress,
      amount,
    }
  }
}
