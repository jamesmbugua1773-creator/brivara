# Withdrawal Service (BEP20/BSC)

Autonomous withdrawal service that processes user withdrawal requests from Brivara backend and sends BNB/BEP20 tokens directly to user wallets on Binance Smart Chain.

## Features

- ✅ HMAC-SHA256 signature validation
- ✅ Web3.js integration for BSC on-chain transfers
- ✅ Balance verification before sending
- ✅ Address format validation
- ✅ Tx confirmation polling (30s timeout)
- ✅ Comprehensive logging

## Setup

### 1. Install Dependencies

```bash
cd withdrawal-service
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

Edit `.env`:
```
WITHDRAW_WALLET_ADDRESS=0x797d559c41bca8655708da137be0553ebf954810
WITHDRAW_WALLET_PRIVATE_KEY=your_bsc_private_key_here
WITHDRAWAL_SIGNATURE_SECRET=dev-provider-secret-change-in-production
```

**Getting your BSC private key:**
- Export from Trust Wallet, MetaMask, or any BSC-compatible wallet
- Keep it **secret** and **never commit** to Git
- Ensure the wallet has BNB balance for transaction fees

### 3. Update Backend Configuration

In `backend/.env`:
```
WITHDRAWAL_PROVIDER_URL=http://localhost:5000/withdraw
WITHDRAWAL_PROVIDER_SECRET=dev-provider-secret-change-in-production
```

The secret must match `WITHDRAWAL_SIGNATURE_SECRET` in withdrawal service.

### 4. Start the Service

```bash
npm run dev
```

Server starts on `http://localhost:5000`

## API Endpoint

### POST /withdraw

Accepts signed withdrawal requests from backend.

**Request:**
```json
{
  "event": "withdrawal.request",
  "data": {
    "userId": "user123",
    "toAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "amount": 0.1,
    "network": "BEP20",
    "source": "REBATE",
    "txId": "wd_abc123xyz",
    "requestedAt": 1704067200000
  }
}
```

**Headers:**
```
X-Signature: <hmac-sha256(body, secret)>
Content-Type: application/json
```

**Response:**
```json
{
  "requestId": "wd_abc123xyz",
  "transactionId": "0x...",
  "status": "processed",
  "success": true,
  "amount": 0.1,
  "confirmed": true,
  "blockNumber": 12345678
}
```

## Workflow

1. User requests withdrawal on frontend
2. Backend creates Pending withdrawal, calls `/withdraw` endpoint with HMAC signature
3. Withdrawal service validates signature
4. Service checks balance and address format
5. Service signs tx with private key and sends to BSC blockchain
6. Service polls for confirmation (up to 30s)
7. Service returns tx hash and status
8. Backend processor marks withdrawal Completed and sends email to user

## Security

- Private key is **never exposed** to frontend or main backend
- All requests are **HMAC-signed** to prevent tampering
- Service runs on **separate isolated port** (default 5000)
- Address validation prevents sending to invalid wallets
- Balance check prevents overdrafts

## Development / Testing

### Test withdrawal manually

```bash
# 1. Start service
npm run dev

# 2. Test endpoint (without signature for dev):
curl -X POST http://localhost:5000/withdraw \
  -H "Content-Type: application/json" \
  -d '{
    "event": "withdrawal.request",
    "data": {
      "userId": "test",
      "toAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      "amount": 0.001,
      "network": "BEP20",
      "txId": "test_123"
    }
  }'
```

### Monitor logs

```bash
tail -f server.log
```

## Troubleshooting

**"Insufficient balance"**
- Fund the withdrawal wallet with BNB for gas fees and withdrawals

**"Invalid BSC address"**
- Ensure user provided valid BSC/Ethereum address (starts with 0x)

**"Transaction creation failed"**
- Check RPC endpoint (BSC_RPC_URL)
- Check network connection
- Verify private key is valid and has sufficient BNB

**Signature validation fails**
- Ensure `WITHDRAWAL_SIGNATURE_SECRET` matches backend `WITHDRAWAL_PROVIDER_SECRET`
- Check request body is sent as-is (no extra whitespace)

## Production Checklist

- [ ] Fund withdrawal wallet with sufficient BNB
- [ ] Set strong `WITHDRAWAL_SIGNATURE_SECRET`
- [ ] Use dedicated private key (never reuse)
- [ ] Run on HTTPS only
- [ ] Add rate limiting
- [ ] Monitor service health
- [ ] Set up alerts for failed withdrawals
- [ ] Regular key rotation policy
- [ ] Backup seed phrase securely

## Next Steps

- Add webhook callback to notify backend of failed withdrawals
- Add transaction fee estimation
- Implement automatic retry with backoff
- Add database logging for audit trail
- Support BEP20 token withdrawals (USDT, BUSD, etc.)

## Features

- ✅ HMAC-SHA256 signature validation
- ✅ TronWeb integration for on-chain transfers
- ✅ Balance verification before sending
- ✅ Address format validation
- ✅ Tx confirmation polling (30s timeout)
- ✅ Comprehensive logging

## Setup

### 1. Install Dependencies

```bash
cd withdrawal-service
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

Edit `.env`:
```
WITHDRAW_WALLET_ADDRESS=TKmM8A7ZFMyW3mydAW5MPid4R6nxBhgd2b
WITHDRAW_WALLET_PRIVATE_KEY=your_tron_private_key_here
WITHDRAWAL_SIGNATURE_SECRET=dev-provider-secret-change-in-production
```

**Getting your TRON private key:**
- Export from Trust Wallet, MetaMask, or any TRON-compatible wallet
- Keep it **secret** and **never commit** to Git
- Ensure the wallet has TRX balance for transaction fees

### 3. Update Backend Configuration

In `backend/.env`:
```
WITHDRAWAL_PROVIDER_URL=http://localhost:5000/withdraw
WITHDRAWAL_PROVIDER_SECRET=dev-provider-secret-change-in-production
```

The secret must match `WITHDRAWAL_SIGNATURE_SECRET` in withdrawal service.

### 4. Start the Service

```bash
npm run dev
```

Server starts on `http://localhost:5000`

## API Endpoint

### POST /withdraw

Accepts signed withdrawal requests from backend.

**Request:**
```json
{
  "event": "withdrawal.request",
  "data": {
    "userId": "user123",
    "toAddress": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    "amount": 10.5,
    "network": "TRC20",
    "source": "REBATE",
    "txId": "wd_abc123xyz",
    "requestedAt": 1704067200000
  }
}
```

**Headers:**
```
X-Signature: <hmac-sha256(body, secret)>
Content-Type: application/json
```

**Response:**
```json
{
  "requestId": "wd_abc123xyz",
  "transactionId": "0x...",
  "status": "processed",
  "success": true,
  "amount": 10.5,
  "confirmed": true,
  "blockNumber": 56789
}
```

## Workflow

1. User requests withdrawal on frontend
2. Backend creates Pending withdrawal, calls `/withdraw` endpoint with HMAC signature
3. Withdrawal service validates signature
4. Service checks balance and address format
5. Service signs tx with private key and sends to TRON blockchain
6. Service polls for confirmation (up to 30s)
7. Service returns tx hash and status
8. Backend processor marks withdrawal Completed and sends email to user

## Security

- Private key is **never exposed** to frontend or main backend
- All requests are **HMAC-signed** to prevent tampering
- Service runs on **separate isolated port** (default 5000)
- Address validation prevents sending to invalid wallets
- Balance check prevents overdrafts

## Development / Testing

### Test withdrawal manually

```bash
# 1. Start service
npm run dev

# 2. Test endpoint (without signature for dev):
curl -X POST http://localhost:5000/withdraw \
  -H "Content-Type: application/json" \
  -d '{
    "event": "withdrawal.request",
    "data": {
      "userId": "test",
      "toAddress": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      "amount": 0.1,
      "network": "TRC20",
      "txId": "test_123"
    }
  }'
```

### Monitor logs

```bash
tail -f server.log
```

## Troubleshooting

**"Insufficient balance"**
- Fund the withdrawal wallet with TRX for gas fees

**"Invalid TRON address"**
- Ensure user provided valid TRON address (starts with T)

**"Transaction creation failed"**
- Check RPC endpoint (TRON_RPC_URL)
- Check network connection
- Verify private key is valid

**Signature validation fails**
- Ensure `WITHDRAWAL_SIGNATURE_SECRET` matches backend `WITHDRAWAL_PROVIDER_SECRET`
- Check request body is sent as-is (no extra whitespace)

## Production Checklist

- [ ] Fund withdrawal wallet with sufficient TRX
- [ ] Set strong `WITHDRAWAL_SIGNATURE_SECRET`
- [ ] Use dedicated private key (never reuse)
- [ ] Run on HTTPS only
- [ ] Add rate limiting
- [ ] Monitor service health
- [ ] Set up alerts for failed withdrawals
- [ ] Regular key rotation policy
- [ ] Backup seed phrase securely

## Next Steps

- Add webhook callback to notify backend of failed withdrawals
- Support BEP20/BSC transfers (use different RPC + private key)
- Add transaction fee estimation
- Implement automatic retry with backoff
- Add database logging for audit trail
