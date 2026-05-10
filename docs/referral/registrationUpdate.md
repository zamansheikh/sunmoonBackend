# Registration API Update (Referral Support)

This document outlines the updates made to the Registration API to support the new Referral & Affiliate system.

## 1. Updated Endpoint: Google Registration

**Endpoint:** `POST /api/auth/register-google`  
**Access:** Public

### Request Body (Updated)
The registration payload now accepts an optional `inviteCode`.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `email` | `string` | Yes | User's email from Google. |
| `name` | `string` | Yes | User's display name. |
| `uid` | `string` | Yes | Google UID. |
| `inviteCode` | `string` | No | The `userId` of the person who invited this user. |

**Example Request:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "uid": "google_uid_123",
  "inviteCode": "100052" 
}
```

---

## 2. API Response (Updated)

The response now includes a `message` field that provides feedback specifically about the referral attribution status.

### Success Response (Referral Linked)
If the user is created and the referral code is valid.

**Status:** `202 Accepted`
```json
{
  "statusCode": 202,
  "success": true,
  "access_token": "eyJhbG...",
  "result": [{ "id": "...", "name": "John Doe", ... }],
  "message": "User registered successfully"
}
```

### Success Response (Invalid Referral Code)
If the user is created but the referral code was invalid (e.g., wrong ID or self-referral). **The registration is NOT blocked.**

**Status:** `202 Accepted`
```json
{
  "statusCode": 202,
  "success": true,
  "access_token": "eyJhbG...",
  "result": [{ "id": "...", "name": "John Doe", ... }],
  "message": "Referrer not found with this code." 
}
```

---

## 3. Implementation Logic

1.  **Non-Blocking Registration**: The referral logic is wrapped in a try-catch block. If the referral attribution fails, the registration process continues normally, ensuring no loss of new users.
2.  **Self-Referral Protection**: The system automatically detects and ignores cases where a user tries to use their own referral code.
3.  **Automatic Reward**: Upon successful attribution, the referrer's `ReferralWallet` is immediately credited with the `inviteReward` defined in the Admin configuration.

---

## 4. Error Messages
The `message` field in the response may contain:
- `User registered successfully`: Attribution successful or no code provided.
- `Referrer not found with this code`: The `inviteCode` does not match any existing `userId`.
- `Referral attribution failed`: Internal logic error (logged on server).
