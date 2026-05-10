# Referral & Affiliate System Documentation

## Overview
The Adda Live Referral System is a multi-tier affiliate engine designed for high performance and automation. It allows users to invite friends, track their activities (recharges and gifts), and instantly withdraw earnings into their main coin wallet.

---

## 1. Core Logic
### Referral Attribution
*   **Registration**: When a new user signs up with an invite code, they are permanently linked to the referrer.
*   **Milestones**: 
    *   **Invite Reward**: Granted immediately upon successful registration.
    *   **Recharge Reward**: Granted when the referee's total recharge volume crosses a specific threshold (e.g., 200,000 coins).
*   **Revenue Sharing**: Referrers earn a percentage-based commission (e.g., 5%) from every gift sent by their invited friends.

### Performance & Caching
*   **Redis Caching**: Configuration and referee-to-referrer mappings are cached in Redis. This ensures that high-frequency events (like gift sending) do not cause database bottlenecks.
*   **Parallel Aggregation**: The dashboard API fetches all data (Stats, Wallet, Config, Friend list) in parallel using `Promise.all`.

---

## 2. API Reference (User)

### Get Dashboard
**Endpoint**: `GET /api/referral/dashboard`  
**Description**: Fetches all data required for the "Invite Friends" screen.

**Response Structure**:
```json
{
  "success": true,
  "result": {
    "rules": {
      "inviteReward": 1000000,
      "rechargeThreshold": 200000,
      "rechargeReward": 1000000,
      "giftCommissionPercentage": 5
    },
    "summary": {
      "inviteCode": "100245",
      "currentBalance": 5000,
      "totalEarned": 25000,
      "totalInvitations": 5
    },
    "referralList": [
      {
        "nickName": "John Doe",
        "id": 100567,
        "rechargedAmount": 50000,
        "totalSentGift": 100000,
        "commissionEarned": 5000
      }
    ]
  }
}
```

### Request Withdrawal (Full Sweep)
**Endpoint**: `POST /api/referral/withdraw`  
**Description**: Automatically transfers the **entire** referral balance to the user's main coin wallet.

**Logic**:
*   Sets referral wallet balance to `0`.
*   Adds the equivalent amount to the user's `UserStats` coins.
*   No admin approval required (Automated).
*   Wrapped in a **Mongoose Transaction** for atomicity.

---

## 3. API Reference (Admin)

### Manage Configuration
*   **POST** `/api/referral/config`: Create or update global rules.
*   **GET** `/api/referral/config`: View current rules.
*   **PUT** `/api/referral/config/:id`: Modify specific rules.

---

## 4. Technical Architecture

### Data Models
*   **Referral**: Links users and tracks `totalRechargedAmount`, `totalGiftValueSent`, and `totalCommissionEarned`.
*   **ReferralWallet**: Tracks `currentBalance` and `totalEarned`.
*   **ReferralWithdrawal**: Logs history of all internal transfers.
*   **ReferralConfig**: Stores global reward settings.

### Key Implementation Details
*   **Atomic Transactions**: The withdrawal logic uses `session.startTransaction()` to ensure that coins are never lost or double-counted.
*   **BFF Pattern**: The Dashboard API acts as a Backend-for-Frontend, reducing mobile network overhead by returning all data in one request.
*   **Short IDs**: Uses the platform's `userId` (Short ID) as the primary invite code for user convenience.
