# Greedy Game Internal API Documentation

The **Greedy Game Internal API** allows the game backend to interact with the Adda platform's wallet system and user data. Every request must be signed using HMAC-SHA256 to prevent tampering and replay attacks.

---

## Base URL

```
/api/game
```

Mounted at the Adda backend server.

---

## Authentication (HMAC Request Signing)

All endpoints require a valid HMAC-SHA256 signature. This ensures:
- **Integrity**: Request body wasn't tampered with
- **Freshness**: Request isn't a replay (5-minute window)
- **Authenticity**: Request came from someone who knows the shared secret

### Required Headers

| Header | Type | Description |
|--------|------|-------------|
| `X-Timestamp` | `string` | Unix timestamp in seconds |
| `X-Nonce` | `string` | Random unique string (16+ chars recommended) |
| `X-Signature` | `string` | `v1=<hmac_hex>` |

### Canonical String Format

Six lines joined with `\n`, then HMAC-SHA256'd with the shared secret:

```
v1
POST
/api/game/internal/wallet/debit
1783507781
d82762b7d8030a704ca7a4c62ac66548
3df9e0911e6d6e5de...
```

| Line | Description |
|------|-------------|
| `v1` | Version (always `v1`) |
| `POST` | HTTP method (uppercase) |
| `/api/game/internal/wallet/debit` | Full path with query string |
| `1783507781` | Unix seconds |
| `d82762b7...` | Random nonce |
| `3df9e091...` | SHA-256 hex of raw body |

**Empty body hash (for GET requests):**
```
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

### Node.js Signing Example

```javascript
const crypto = require('crypto');

function signRequest(method, url, body, secret) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const bodyHash = crypto.createHash('sha256').update(body || '').digest('hex');
  const canonical = ['v1', method.toUpperCase(), url, ts, nonce, bodyHash].join('\n');
  const signature = crypto.createHmac('sha256', secret).update(canonical).digest('hex');

  return {
    'X-Timestamp': ts,
    'X-Nonce': nonce,
    'X-Signature': `v1=${signature}`,
    'Content-Type': 'application/json'
  };
}

// GET request
const getHeaders = signRequest('GET', '/api/game/internal/wallet/123/balance', '', SECRET);

// POST request
const body = JSON.stringify({ userId: '123', amount: 50 });
const postHeaders = signRequest('POST', '/api/game/internal/wallet/debit', body, SECRET);
```

### Error Responses

All signature failures return `403`:

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SIGNATURE_INVALID",
    "details": { "reason": "BAD_SIGNATURE" }
  }
}
```

| Reason | Meaning |
|--------|---------|
| `MISSING_HEADERS` | X-Timestamp, X-Nonce, or X-Signature missing |
| `BAD_VERSION` | Signature doesn't start with `v1=` |
| `STALE_TIMESTAMP` | Timestamp >5 minutes old or future |
| `BAD_SIGNATURE` | HMAC mismatch (tampered request) |
| `REPLAYED_NONCE` | Nonce already used |
| `INTERNAL_AUTH_DISABLED` | `INTERNAL_SERVICE_SECRET` not set |

---

## 1. Get Wallet Balance

Returns the user's current coin and diamond balance.

```
GET /api/game/internal/wallet/:userId/balance
```

**Headers:** Standard HMAC headers required.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `userId` | `string` | MongoDB ObjectId of the user |

**Response (200):**

```json
{
  "coins": 12450,
  "diamonds": 3,
  "frozen": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| `coins` | `number` | User's coin balance |
| `diamonds` | `number` | User's diamond balance |
| `frozen` | `boolean` | Whether the wallet is frozen (always `false`) |

**Error Responses:**

| Status | Body |
|--------|------|
| 403 | Signature verification failed |
| 404 | `{ "success": false, "message": "User stats not found" }` |

---

## 2. Debit Wallet

Deducts coins from a user's wallet. Uses idempotency to prevent duplicate transactions.

```
POST /api/game/internal/wallet/debit
```

**Headers:** Standard HMAC headers required.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | `string` | Yes | MongoDB ObjectId of the user |
| `currency` | `string` | Yes | Currency type (e.g., `"coins"`) |
| `amount` | `number` | Yes | Amount to deduct (positive integer) |
| `type` | `string` | Yes | Transaction type (see allowed values) |
| `idempotencyKey` | `string` | Yes | Unique key to prevent duplicate transactions |
| `description` | `string` | Yes | Human-readable description |
| `refType` | `string` | Yes | Reference type (e.g., `"game_bet"`) |
| `refId` | `string` | Yes | Reference ID (e.g., round ID) |

**Allowed `type` values:**
- `game_bet`
- `game_payout`
- `refund`

**Example Request:**

```json
{
  "userId": "6a4e2b1710656f690e3de4ca",
  "currency": "coins",
  "amount": 50,
  "type": "game_bet",
  "idempotencyKey": "game-bet:6a410b454d95a8de140207eb",
  "description": "Bet on B7 — spin_wheel round 5",
  "refType": "game_bet",
  "refId": "round_123"
}
```

**Success Response (200):**

```json
{
  "txn": {
    "id": "6a410b45440bca0cf39b57ac"
  }
}
```

**Idempotent Response (200):**

If the `idempotencyKey` already exists, returns the existing transaction ID:

```json
{
  "txn": {
    "id": "6a410b45440bca0cf39b57ac"
  }
}
```

**Error Responses:**

| Status | Body |
|--------|------|
| 400 | `{ "success": false, "error": { "code": "INSUFFICIENT_BALANCE", "message": "Not enough coins" } }` |
| 400 | `{ "success": false, "message": "All fields are required" }` |
| 400 | `{ "success": false, "message": "Invalid type. Allowed values: game_bet, game_payout, refund" }` |
| 403 | Signature verification failed |

**Transaction Flow:**
1. Check `idempotencyKey` → if exists, return existing txn ID
2. Start transaction
3. Deduct coins from userstats (atomic check + deduct)
4. Create wallet transaction document
5. Commit transaction

---

## 3. Credit Wallet

Adds coins to a user's wallet. Uses idempotency to prevent duplicate transactions.

```
POST /api/game/internal/wallet/credit
```

**Headers:** Standard HMAC headers required.

**Request Body:**

Same as Debit Wallet (see [2. Debit Wallet](#2-debit-wallet)).

**Example Request:**

```json
{
  "userId": "6a4e2b1710656f690e3de4ca",
  "currency": "coins",
  "amount": 100,
  "type": "game_payout",
  "idempotencyKey": "game-payout:6a410b454d95a8de140207eb",
  "description": "Won round 5 — spin_wheel",
  "refType": "game_payout",
  "refId": "round_123"
}
```

**Success Response (200):**

```json
{
  "txn": {
    "id": "6a410b47440bca0cf39b57f1"
  }
}
```

**Idempotent Response (200):**

If the `idempotencyKey` already exists, returns the existing transaction ID.

**Error Responses:**

| Status | Body |
|--------|------|
| 400 | `{ "success": false, "message": "All fields are required" }` |
| 400 | `{ "success": false, "message": "Invalid type. Allowed values: game_bet, game_payout, refund" }` |
| 403 | Signature verification failed |

**Transaction Flow:**
1. Check `idempotencyKey` → if exists, return existing txn ID
2. Start transaction
3. Add coins to userstats
4. Create wallet transaction document
5. Commit transaction

---

## 4. Get Transaction

Looks up a transaction by its idempotency key.

```
GET /api/game/internal/wallet/transaction/:idempotencyKey
```

**Headers:** Standard HMAC headers required.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `idempotencyKey` | `string` | The idempotency key to look up |

**Found Response (200):**

```json
{
  "applied": true,
  "txn": {
    "id": "6a410b45440bca0cf39b57ac",
    "userId": "6a4e2b1710656f690e3de4ca",
    "amount": 50,
    "currency": "coins",
    "type": "game_bet",
    "createdAt": "2026-07-08T12:30:00.000Z"
  }
}
```

**Not Found Response (200):**

```json
{
  "applied": false,
  "txn": null
}
```

| Field | Type | Description |
|-------|------|-------------|
| `applied` | `boolean` | Whether the transaction was found |
| `txn` | `object \| null` | Transaction details or null |

---

## 5. Get User Names

Returns user details for an array of user IDs.

```
POST /api/game/internal/users/names
```

**Headers:** Standard HMAC headers required.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userIds` | `string[]` | Yes | Array of MongoDB ObjectIds |

**Example Request:**

```json
{
  "userIds": [
    "6a4e2b1710656f690e3de4ca",
    "69f3578abcdef1234567890"
  ]
}
```

**Response (200):**

```json
{
  "users": [
    {
      "userId": "6a4e2b1710656f690e3de4ca",
      "displayName": "Zaman",
      "username": "zaman",
      "avatarUrl": "https://example.com/avatar.png",
      "numericId": 100238
    },
    {
      "userId": "69f3578abcdef1234567890",
      "displayName": "Ali",
      "username": "ali",
      "avatarUrl": "https://example.com/avatar2.png",
      "numericId": 100456
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `userId` | `string` | MongoDB ObjectId |
| `displayName` | `string` | User's display name |
| `username` | `string` | User's username |
| `avatarUrl` | `string` | Profile image URL |
| `numericId` | `number` | Numeric user ID |

**Error Responses:**

| Status | Body |
|--------|------|
| 400 | `{ "success": false, "message": "userIds must be a non-empty array" }` |
| 403 | Signature verification failed |

---

## Error Summary

| Status | Meaning |
|--------|---------|
| 400 | Bad request — missing fields, invalid type, insufficient balance |
| 403 | Signature verification failed |
| 404 | User not found |
| 500 | Internal server error |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `INTERNAL_SERVICE_SECRET` | Yes | Shared secret for HMAC signature verification |

---

## Database Collections

| Collection | Description |
|------------|-------------|
| `greedy_game_wallet_transactions` | Stores all debit/credit transactions |
| `userstats` | User coin/diamond balances |
| `users` | User profile data |
