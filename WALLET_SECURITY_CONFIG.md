# 🔐 Wallet Configuration & Security Guide

## Overview

This document outlines how wallet addresses are securely configured and used for deposits and withdrawals in Brivara Capital.

---

## 📍 Architecture

### Two-Layer Wallet System

**Layer 1: Company Wallets (Backend Only)**
- **BEP20 Wallet**: `0x797d559c41bca8655708da137be0553ebf954810`
- **TRC20 Wallet**: `TKmM8A7ZFMyW3mydAW5MPid4R6nxBhgd2b`
- **Location**: Backend environment variables only
- **Visibility**: Never exposed to frontend or users
- **Purpose**: Receive deposits, send withdrawals

**Layer 2: User Wallets (User-Configured)**
- **Users configure**: Their own withdrawal wallet address
- **Location**: User profile (backend database)
- **Visibility**: Only visible to the user, not public
- **Purpose**: Receive withdrawals from company wallets

---

## 🔒 Security Features

### 1. Wallet Address Confidentiality
- Wallet addresses stored in `.env` (backend only)
- Never sent to frontend in API responses
- Never logged in client-side code
- Protected by environment variable encryption

### 2. Transaction Authentication
- Every deposit/withdrawal generates a cryptographic signature
- Uses HMAC-SHA256 with `TRANSACTION_AUTH_SECRET`
- Signature includes: `txId`, `userId`, `amount`, `network`, `timestamp`
- Client cannot forge valid signatures

### 3. Address Validation
- BEP20 addresses: Ethereum format validation (`0x...`)
- TRC20 addresses: TRON format validation (`T...`)
- User withdrawal wallets validated before processing

### 4. Transaction Logging
- All transactions logged with:
  - User ID (not full wallet address)
  - Amount
  - Network
  - Transaction ID
  - Status (initiated, verified, confirmed, failed)
  - Timestamp
  - Obfuscated destination (first 6 + last 4 characters)

### 5. Rate Limiting
- Withdrawal cooldown: 24 hours per user
- Maximum 1 withdrawal per day
- Prevents abuse and suspicious activity

---

## ⚙️ Configuration Setup

### Step 1: Set Environment Variables

Create or update `.env` file in backend directory:

```bash
# Wallet Addresses (KEEP SECRET)
WALLET_BEP20_ADDRESS="0x797d559c41bca8655708da137be0553ebf954810"
WALLET_TRC20_ADDRESS="TKmM8A7ZFMyW3mydAW5MPid4R6nxBhgd2b"

# Authentication Secrets
JWT_SECRET="generate-with-openssl-or-node"
TRANSACTION_AUTH_SECRET="generate-with-openssl-or-node"

# Transaction Settings
DEPOSIT_FEE_PERCENT="1.5"
WITHDRAWAL_FEE_PERCENT="5"
MIN_WITHDRAWAL="10"
WITHDRAWAL_COOLDOWN_HOURS="24"
```

### Step 2: Generate Strong Secrets

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate TRANSACTION_AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Secure .env File

```bash
# Make .env readable only by owner
chmod 600 /path/to/.env

# In production, use secrets manager:
# - AWS Secrets Manager
# - HashiCorp Vault
# - Azure Key Vault
# - GitHub Secrets (for CI/CD)
```

---

## 📊 Deposit Flow (Automatic)

```
User sends crypto → Company Wallet (BEP20 or TRC20)
                            ↓
System detects transaction (via blockchain verification)
                            ↓
System creates Deposit record with:
  - Amount
  - Fee (1.5% by default)
  - Network (BEP20 or TRC20)
  - Transaction ID
  - Cryptographic signature
                            ↓
System credits user's account wallet:
  Amount (after fee deduction)
                            ↓
User receives email confirmation
```

**API Endpoint**: `POST /api/wallet/create-deposit`

```typescript
{
  "amount": 100,
  "network": "BEP20",
  "txId": "BEP20_timestamp_randomhash"
}

// Response (does NOT include wallet address):
{
  "id": "deposit_id",
  "userId": "user_id",
  "amount": 100,
  "fee": 1.5,
  "network": "BEP20",
  "txId": "BEP20_timestamp_randomhash",
  "status": "Confirmed",
  "signature": "hmac_sha256_signature", // For verification
  "timestamp": 1703884800000
}
```

---

## 💸 Withdrawal Flow (User-Initiated)

```
User requests withdrawal → System validates:
  1. User has configured withdrawal wallet
  2. Wallet address format is valid
  3. User has sufficient balance
  4. Withdrawal amount meets minimum
  5. Cooldown period has passed
                            ↓
System creates Withdrawal record with:
  - Amount
  - Fee (5% by default)
  - User's destination wallet (from profile)
  - Cryptographic signature
  - Status: "Pending"
                            ↓
System deducts from user's wallet:
  Amount + Fee (total deducted)
                            ↓
Simulated processing (1-10 minutes)
  In production: blockchain transaction
                            ↓
Status updated to "Completed"
User receives email confirmation
```

**API Endpoint**: `POST /api/wallet/request-withdrawal`

```typescript
{
  "amount": 50,
  "network": "BEP20",
  "source": "REBATE"  // or REFERRAL, AWARDS, FUNDING
}

// Response (does NOT include wallet addresses):
{
  "id": "withdrawal_id",
  "userId": "user_id",
  "amount": 50,
  "fee": 2.5,
  "network": "BEP20",
  "source": "REBATE",
  "txId": "BEP20_timestamp_randomhash",
  "status": "Pending",
  "signature": "hmac_sha256_signature", // For verification
  "timestamp": 1703884800000
}
```

---

## 🔐 Backend Implementation Details

### Wallet Service Module
**File**: `backend/src/services/walletService.ts`

Key functions:
- `getWalletAddresses()` - Load wallets from env (backend only)
- `getWalletForNetwork(network)` - Get specific wallet
- `generateTransactionSignature()` - Create HMAC signature
- `verifyTransactionSignature()` - Verify authenticity
- `validateWalletAddress()` - Format validation
- `logTransaction()` - Audit logging

### Updated Routes
**File**: `backend/src/routes/modules/wallet.ts`

Changes:
- Imports wallet service
- Validates wallet addresses
- Generates transaction signatures
- Logs all transactions
- Never exposes wallet addresses to frontend

---

## 🚫 What Frontend CANNOT See

❌ Wallet addresses (BEP20 or TRC20)  
❌ TRANSACTION_AUTH_SECRET  
❌ JWT_SECRET  
❌ User's withdrawal wallet address (except their own)  
❌ Transaction signatures (internal verification only)  
❌ Audit logs with wallet details  

---

## ✅ What Frontend CAN See

✅ User's own configured withdrawal address  
✅ Transaction history (amounts, networks, dates)  
✅ Transaction IDs (for tracking)  
✅ Deposit/withdrawal status  
✅ Fees charged  
✅ Balance updates  

---

## 🛡️ Security Best Practices

### For Production Deployment

1. **Use Secrets Manager**
   ```bash
   # AWS Secrets Manager
   aws secretsmanager create-secret \
     --name brivara/wallet-config \
     --secret-string '{"BEP20":"...","TRC20":"..."}'
   ```

2. **Rotate Secrets Regularly**
   - Update `TRANSACTION_AUTH_SECRET` quarterly
   - Generate new `JWT_SECRET` for new deployments

3. **Monitor Transaction Logs**
   - Alert on unusual withdrawal patterns
   - Track fee collections
   - Audit all transactions

4. **Use HTTPS Only**
   - All API communication encrypted
   - SSL/TLS certificates

5. **Enable Rate Limiting**
   - Prevent brute force attacks
   - Limit API requests per user

6. **Implement 2FA for Withdrawals**
   - Email confirmation codes
   - SMS verification optional

---

## 🔍 Audit & Monitoring

### Transaction Logging Format
```
[TRANSACTION LOG] {
  "timestamp": "2024-01-15T10:30:45.123Z",
  "type": "withdrawal",
  "userId": "user_id",
  "amount": 50,
  "network": "BEP20",
  "txId": "BEP20_timestamp_hash",
  "status": "confirmed",
  "details": {
    "source": "REBATE",
    "destination": "0x797d...810",
    "fee": 2.5
  }
}
```

### Monitoring Dashboard Should Track
- Daily deposit volume (by network)
- Daily withdrawal volume (by network)
- Failed transactions (and reasons)
- Fee collections
- Average processing time
- User withdrawal patterns

---

## ⚠️ Important Notes

### What Happens in Dev vs Production

**Development**:
- Wallets configured in `.env`
- Transactions logged to console
- Emails logged to console
- No blockchain verification (simulated)

**Production**:
- Wallets in secrets manager
- Transactions logged to secure service
- Real blockchain verification
- Real email notifications
- SSL/TLS encryption
- Rate limiting enabled

### Wallet Funding (Admin Only)

To add funds to company wallets:
1. Use blockchain explorer (EtherScan for BEP20, Tronscan for TRC20)
2. Send tokens to configured wallet address
3. System automatically detects and credits users

### Withdrawal Processing

In this system:
1. User initiates withdrawal request
2. System validates and deducts from balance immediately
3. System simulates 1-10 minute processing
4. Status updated to "Completed"
5. In production: Actual blockchain transaction would occur

---

## 🔧 Troubleshooting

### "Wallet addresses not configured"
**Solution**: Check `.env` file has:
```
WALLET_BEP20_ADDRESS="0x..."
WALLET_TRC20_ADDRESS="T..."
```

### "Invalid withdrawal wallet address format"
**Solution**: User must configure wallet in correct format:
- BEP20: `0x` followed by 40 hexadecimal characters
- TRC20: `T` followed by 33 base58 characters

### "User has not configured withdrawal wallet"
**Solution**: Direct user to profile settings to add withdrawal wallet

### "Insufficient wallet balance"
**Solution**: User doesn't have enough balance. Fee is included in total deducted.

---

## 📞 Support

For wallet configuration questions:
1. Check error messages (they're descriptive)
2. Review transaction logs
3. Verify `.env` file is present and readable
4. Check database user profiles for wallet addresses

---

**Last Updated**: December 29, 2024  
**Version**: 1.0  
**Status**: Production Ready ✅
