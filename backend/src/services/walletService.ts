/**
 * Secure Wallet Service
 * Manages wallet addresses and transaction authentication
 * Wallets are kept secret from frontend - only used in backend
 */

import crypto from 'crypto';

interface WalletConfig {
  BEP20: string;
  TRC20: string;
}

interface TransactionAuth {
  txId: string;
  timestamp: number;
  signature: string;
  userId: string;
  amount: number;
  network: 'BEP20' | 'TRC20';
  type: 'deposit' | 'withdrawal';
}

/**
 * Load wallet addresses from secure environment variables
 * These should NEVER be exposed to the frontend
 */
export function getWalletAddresses(): WalletConfig {
  const bep20 = process.env.WALLET_BEP20_ADDRESS;
  const trc20 = process.env.WALLET_TRC20_ADDRESS;

  if (!bep20 || !trc20) {
    throw new Error(
      'Missing required wallet addresses. Please set WALLET_BEP20_ADDRESS and WALLET_TRC20_ADDRESS environment variables.'
    );
  }

  return { BEP20: bep20, TRC20: trc20 };
}

/**
 * Get the wallet address for a specific network
 */
export function getWalletForNetwork(network: 'BEP20' | 'TRC20'): string {
  const wallets = getWalletAddresses();
  return wallets[network];
}

/**
 * Generate cryptographic signature for transaction authentication
 * Uses HMAC-SHA256 with secret key
 */
export function generateTransactionSignature(
  txId: string,
  userId: string,
  amount: number,
  network: string,
  timestamp: number
): string {
  const secret = process.env.TRANSACTION_AUTH_SECRET;
  if (!secret) {
    throw new Error('TRANSACTION_AUTH_SECRET environment variable not set');
  }

  const payload = `${txId}:${userId}:${amount}:${network}:${timestamp}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify transaction signature
 * Validates that a transaction hasn't been tampered with
 */
export function verifyTransactionSignature(auth: TransactionAuth): boolean {
  try {
    const expectedSignature = generateTransactionSignature(
      auth.txId,
      auth.userId,
      auth.amount,
      auth.network,
      auth.timestamp
    );

    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(auth.signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Generate a transaction ID with network and timestamp
 * Format: NETWORK_TIMESTAMP_RANDOM
 */
export function generateTransactionId(network: 'BEP20' | 'TRC20'): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `${network.toUpperCase()}_${timestamp}_${random}`;
}

/**
 * Verify deposit came from correct wallet
 * In production, this would verify against blockchain
 */
export function verifyDepositWallet(
  network: 'BEP20' | 'TRC20',
  senderAddress?: string
): boolean {
  try {
    const walletAddress = getWalletForNetwork(network);

    // If sender address is provided, verify it matches our wallet
    if (senderAddress && senderAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      console.warn(`Invalid sender address for ${network}: ${senderAddress}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Wallet verification error:', error);
    return false;
  }
}

/**
 * Get withdrawal destination (user's wallet)
 * This should be called to get the user's destination address
 */
export function getUserWithdrawalWallet(
  userWallet: string | null | undefined,
  network: 'BEP20' | 'TRC20'
): string {
  if (!userWallet) {
    throw new Error(`User has not configured ${network} withdrawal wallet`);
  }
  return userWallet;
}

/**
 * Validate wallet address format for network
 */
export function validateWalletAddress(address: string, network: 'BEP20' | 'TRC20'): boolean {
  // BEP20 (Binance Smart Chain) and TRC20 (TRON) use different formats
  if (network === 'BEP20') {
    // BEP20 uses Ethereum-style addresses (0x...)
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  } else if (network === 'TRC20') {
    // TRC20 addresses start with 'T' and are base58
    return /^T[a-zA-Z0-9]{33}$/.test(address);
  }
  return false;
}

/**
 * Log transaction for audit purposes
 * All transactions should be logged for security and compliance
 */
export function logTransaction(
  transactionType: 'deposit' | 'withdrawal',
  userId: string,
  amount: number,
  network: 'BEP20' | 'TRC20',
  txId: string,
  status: 'initiated' | 'verified' | 'confirmed' | 'failed',
  details?: Record<string, any>
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: transactionType,
    userId,
    amount,
    network,
    txId,
    status,
    details,
  };

  // In production, this should be sent to a secure logging service
  console.log('[TRANSACTION LOG]', JSON.stringify(logEntry));
}
