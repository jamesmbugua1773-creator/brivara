/**
 * Blockchain Deposit Verification Service
 * Handles detection and verification of deposits on blockchain
 */

import axios from 'axios';

interface BlockchainTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  blockNumber: number;
  timestamp: number;
  status: 'success' | 'failed' | 'pending';
  gasUsed?: string;
}

interface DepositVerificationResult {
  verified: boolean;
  transactionHash: string;
  amount: number;
  network: 'BEP20' | 'TRC20';
  timestamp: number;
  blockNumber: number;
  error?: string;
}

/**
 * BEP20 (Binance Smart Chain) Verification
 * Uses Etherscan API for BSC (bscscan.com)
 */
export async function verifyBEP20Deposit(
  transactionHash: string,
  expectedToAddress: string,
  expectedAmount: number
): Promise<DepositVerificationResult> {
  try {
    const apiKey = process.env.BSCSCAN_API_KEY;
    if (!apiKey) {
      throw new Error('BSCSCAN_API_KEY not configured');
    }

    const url = `https://api.bscscan.com/api?module=proxy&action=eth_getTransactionByHash&txhash=${transactionHash}&apikey=${apiKey}`;

    const response = await axios.get(url, { timeout: 10000 });

    if (!response.data.result) {
      return {
        verified: false,
        transactionHash,
        amount: 0,
        network: 'BEP20',
        timestamp: Date.now(),
        blockNumber: 0,
        error: 'Transaction not found on blockchain',
      };
    }

    const tx = response.data.result;

    // Verify it's sent to our wallet
    if (tx.to.toLowerCase() !== expectedToAddress.toLowerCase()) {
      return {
        verified: false,
        transactionHash,
        amount: 0,
        network: 'BEP20',
        timestamp: Date.now(),
        blockNumber: 0,
        error: 'Transaction not sent to expected wallet',
      };
    }

    // Convert value from wei to normal units (1 BNB = 10^18 wei)
    const valueInWei = BigInt(tx.value);
    const valueInTokens = Number(valueInWei) / 1e18;

    // Verify amount (with small tolerance for rounding)
    if (valueInTokens < expectedAmount * 0.99) {
      return {
        verified: false,
        transactionHash,
        amount: valueInTokens,
        network: 'BEP20',
        timestamp: Date.now(),
        blockNumber: parseInt(tx.blockNumber),
        error: `Insufficient amount. Expected ${expectedAmount}, got ${valueInTokens}`,
      };
    }

    // Check transaction status (wait for confirmation)
    // A transaction needs at least 12 confirmations to be considered final
    const blockUrl = `https://api.bscscan.com/api?module=proxy&action=eth_blockNumber&apikey=${apiKey}`;
    const blockResponse = await axios.get(blockUrl, { timeout: 10000 });
    const currentBlock = parseInt(blockResponse.data.result);
    const confirmations = currentBlock - parseInt(tx.blockNumber);

    if (confirmations < 12) {
      return {
        verified: false,
        transactionHash,
        amount: valueInTokens,
        network: 'BEP20',
        timestamp: Date.now() / 1000,
        blockNumber: parseInt(tx.blockNumber),
        error: `Transaction not yet finalized. Confirmations: ${confirmations}/12`,
      };
    }

    return {
      verified: true,
      transactionHash,
      amount: valueInTokens,
      network: 'BEP20',
      timestamp: Date.now() / 1000,
      blockNumber: parseInt(tx.blockNumber),
    };
  } catch (error) {
    console.error('BEP20 verification error:', error);
    return {
      verified: false,
      transactionHash,
      amount: 0,
      network: 'BEP20',
      timestamp: Date.now(),
      blockNumber: 0,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * TRC20 (TRON) Verification
 * Uses Tronscan API
 */
export async function verifyTRC20Deposit(
  transactionHash: string,
  expectedToAddress: string,
  expectedAmount: number
): Promise<DepositVerificationResult> {
  try {
    // TRON uses a different format for addresses and transactions
    const url = `https://api.trongrid.io/v1/transactions/${transactionHash}`;

    const response = await axios.get(url, { timeout: 10000 });

    if (!response.data || !response.data.transaction) {
      return {
        verified: false,
        transactionHash,
        amount: 0,
        network: 'TRC20',
        timestamp: Date.now(),
        blockNumber: 0,
        error: 'Transaction not found on TRON blockchain',
      };
    }

    const tx = response.data.transaction;

    // For TRON, extract amount from the contract call (more complex)
    // This assumes transfer() function with amount parameter
    if (!tx.raw_data || !tx.raw_data.contract) {
      return {
        verified: false,
        transactionHash,
        amount: 0,
        network: 'TRC20',
        timestamp: Date.now(),
        blockNumber: 0,
        error: 'Invalid transaction format',
      };
    }

    const contract = tx.raw_data.contract[0];

    // Verify recipient (TRC20 addresses are base58 encoded)
    if (contract.parameter.value.to !== expectedToAddress) {
      return {
        verified: false,
        transactionHash,
        amount: 0,
        network: 'TRC20',
        timestamp: Date.now(),
        blockNumber: 0,
        error: 'Transaction not sent to expected wallet',
      };
    }

    // Get amount (convert from sun: 1 TRX = 1,000,000 sun)
    const amountInSun = contract.parameter.value.amount || 0;
    const amountInTRX = amountInSun / 1_000_000;

    // Verify amount
    if (amountInTRX < expectedAmount * 0.99) {
      return {
        verified: false,
        transactionHash,
        amount: amountInTRX,
        network: 'TRC20',
        timestamp: Date.now(),
        blockNumber: 0,
        error: `Insufficient amount. Expected ${expectedAmount}, got ${amountInTRX}`,
      };
    }

    // Check if transaction is finalized (at least 30 blocks for TRON)
    const txBlockNum = tx.blockNumber || 0;
    const blockUrl = 'https://api.trongrid.io/v1/now';
    const blockResponse = await axios.get(blockUrl, { timeout: 10000 });
    const currentBlockNum = blockResponse.data.block_header.raw_data.number;
    const confirmations = currentBlockNum - txBlockNum;

    if (confirmations < 30) {
      return {
        verified: false,
        transactionHash,
        amount: amountInTRX,
        network: 'TRC20',
        timestamp: tx.block_timestamp || Date.now(),
        blockNumber: txBlockNum,
        error: `Transaction not yet finalized. Confirmations: ${confirmations}/30`,
      };
    }

    return {
      verified: true,
      transactionHash,
      amount: amountInTRX,
      network: 'TRC20',
      timestamp: tx.block_timestamp || Date.now(),
      blockNumber: txBlockNum,
    };
  } catch (error) {
    console.error('TRC20 verification error:', error);
    return {
      verified: false,
      transactionHash,
      amount: 0,
      network: 'TRC20',
      timestamp: Date.now(),
      blockNumber: 0,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Verify any deposit by network
 */
export async function verifyDeposit(
  transactionHash: string,
  network: 'BEP20' | 'TRC20',
  expectedToAddress: string,
  expectedAmount: number
): Promise<DepositVerificationResult> {
  if (network === 'BEP20') {
    return verifyBEP20Deposit(transactionHash, expectedToAddress, expectedAmount);
  } else {
    return verifyTRC20Deposit(transactionHash, expectedToAddress, expectedAmount);
  }
}

/**
 * Polling: Periodically check blockchain for incoming transactions
 * Useful for passive monitoring of deposits
 */
export async function pollBlockchainForDeposits(
  walletAddress: string,
  network: 'BEP20' | 'TRC20',
  startBlock?: number
): Promise<BlockchainTransaction[]> {
  try {
    if (network === 'BEP20') {
      const apiKey = process.env.BSCSCAN_API_KEY;
      if (!apiKey) throw new Error('BSCSCAN_API_KEY not configured');

      const url = `https://api.bscscan.com/api?module=account&action=txlist&address=${walletAddress}&startblock=${startBlock || 0}&endblock=99999999&sort=desc&apikey=${apiKey}`;

      const response = await axios.get(url, { timeout: 15000 });

      if (response.data.result && Array.isArray(response.data.result)) {
        return response.data.result.map((tx: any) => ({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          blockNumber: parseInt(tx.blockNumber),
          timestamp: parseInt(tx.timeStamp),
          status: tx.isError === '0' ? 'success' : 'failed',
          gasUsed: tx.gasUsed,
        }));
      }
    } else if (network === 'TRC20') {
      // TRON API is different
      const url = `https://api.trongrid.io/v1/accounts/${walletAddress}/transactions`;
      const response = await axios.get(url, { timeout: 15000 });

      if (response.data.data && Array.isArray(response.data.data)) {
        return response.data.data.map((tx: any) => ({
          hash: tx.txID,
          from: tx.raw_data.contract[0]?.parameter.value.owner_address || '',
          to: tx.raw_data.contract[0]?.parameter.value.to || '',
          value: (tx.raw_data.contract[0]?.parameter.value.amount || 0).toString(),
          blockNumber: tx.blockNumber || 0,
          timestamp: tx.block_timestamp || 0,
          status: 'success',
        }));
      }
    }

    return [];
  } catch (error) {
    console.error(`Error polling blockchain (${network}):`, error);
    return [];
  }
}

/**
 * Get transaction details from blockchain
 */
export async function getBlockchainTransaction(
  transactionHash: string,
  network: 'BEP20' | 'TRC20'
): Promise<BlockchainTransaction | null> {
  try {
    if (network === 'BEP20') {
      const apiKey = process.env.BSCSCAN_API_KEY;
      if (!apiKey) throw new Error('BSCSCAN_API_KEY not configured');

      const url = `https://api.bscscan.com/api?module=proxy&action=eth_getTransactionByHash&txhash=${transactionHash}&apikey=${apiKey}`;
      const response = await axios.get(url, { timeout: 10000 });

      if (response.data.result) {
        const tx = response.data.result;
        return {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: (BigInt(tx.value) / BigInt(1e18)).toString(),
          blockNumber: parseInt(tx.blockNumber),
          timestamp: 0, // Would need separate call to get timestamp
          status: 'success',
        };
      }
    } else if (network === 'TRC20') {
      const url = `https://api.trongrid.io/v1/transactions/${transactionHash}`;
      const response = await axios.get(url, { timeout: 10000 });

      if (response.data.transaction) {
        const tx = response.data.transaction;
        return {
          hash: tx.txID,
          from: tx.raw_data.contract[0]?.parameter.value.owner_address || '',
          to: tx.raw_data.contract[0]?.parameter.value.to || '',
          value: ((tx.raw_data.contract[0]?.parameter.value.amount || 0) / 1_000_000).toString(),
          blockNumber: tx.blockNumber || 0,
          timestamp: tx.block_timestamp || 0,
          status: 'success',
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting blockchain transaction:', error);
    return null;
  }
}
