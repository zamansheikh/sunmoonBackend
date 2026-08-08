# Level Reward System API Documentation

The **Level Reward System** allows admins to define coin rewards for each user level. When a user reaches a level, they can claim the reward — coins are added to their balance. Each reward can only be claimed once per user.

---

## Table of Contents

- [Authentication & Request Format](#authentication--request-format)
- [Admin Endpoints](#admin-endpoints)
- [User Endpoints](#user-endpoints)
- [1. Create Reward Config](#1-create-reward-config)
- [2. List All Reward Configs](#2-list-all-reward-configs)
- [3. Get Reward Config by ID](#3-get-reward-config-by-id)
- [4. Update Reward Config](#4-update-reward-config)
- [5. Delete Reward Config](#5-delete-reward-config)
- [6. Claim Reward](#6-claim-reward)
- [Error Responses](#error-responses)
- [Data Model Reference](#data-model-reference)
- [File Structure Reference](#file-structure-reference)

---

## Authentication & Request Format

- **Admin Base URL**: `/api/admin/level-rewards`
- **User Base URL**: `/api/level-rewards`
- **Headers**:
  ```http
  Authorization: Bearer <your_jwt_token_here>
  Content-Type: application/json
  ```
- **Access Control**:
  - **Admin/SubAdmin** role required for all admin endpoints
  - **Any authenticated user** for claim endpoint

---

## Admin Endpoints

| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/admin/level-rewards` | Admin/SubAdmin | Create a reward config |
| `GET` | `/api/admin/level-rewards` | Admin/SubAdmin | List all reward configs |
| `GET` | `/api/admin/level-rewards/:id` | Admin/SubAdmin | Get a single config by ID |
| `PUT` | `/api/admin/level-rewards/:id` | Admin/SubAdmin | Update a reward config |
| `DELETE` | `/api/admin/level-rewards/:id` | Admin/SubAdmin | Delete a reward config |

## User Endpoints

| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/level-rewards/:level/claim` | Any authenticated | Claim reward for a specific level |

---

## 1. Create Reward Config

Creates a new reward config for a level. The `level` must be unique — only one reward per level is allowed.

- **Path**: `POST /api/admin/level-rewards`
- **Content-Type**: `application/json`

### Request Body

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `level` | `number` | Yes | The level required to claim this reward (must be unique) |
| `coinReward` | `number` | Yes | Number of coins awarded on claim (min: 0) |

### Example Request

```json
{
  "level": 1,
  "coinReward": 5000
}
```

### Response (201 Created)

```json
{
  "success": true,
  "result": {
    "_id": "665a1b2c3d4e5f6a7b8c9d0e",
    "level": 1,
    "coinReward": 5000,
    "createdAt": "2026-08-08T10:00:00.000Z",
    "updatedAt": "2026-08-08T10:00:00.000Z"
  },
  "message": "Level reward config created successfully"
}
```

### Error Responses

**400 Bad Request — Missing required fields**
```json
{
  "success": false,
  "message": "level and coinReward are required"
}
```

**409 Conflict — Duplicate level**
```json
{
  "success": false,
  "message": "Reward config for level 1 already exists"
}
```

---

## 2. List All Reward Configs

Returns all reward configs sorted by `level` in ascending order.

- **Path**: `GET /api/admin/level-rewards`

### Response (200 OK)

```json
{
  "success": true,
  "result": [
    {
      "_id": "665a1b2c3d4e5f6a7b8c9d0e",
      "level": 1,
      "coinReward": 5000,
      "createdAt": "2026-08-08T10:00:00.000Z",
      "updatedAt": "2026-08-08T10:00:00.000Z"
    },
    {
      "_id": "665a1b2c3d4e5f6a7b8c9d0f",
      "level": 2,
      "coinReward": 200000,
      "createdAt": "2026-08-08T10:00:00.000Z",
      "updatedAt": "2026-08-08T10:00:00.000Z"
    },
    {
      "_id": "665a1b2c3d4e5f6a7b8c9d10",
      "level": 3,
      "coinReward": 500000,
      "createdAt": "2026-08-08T10:00:00.000Z",
      "updatedAt": "2026-08-08T10:00:00.000Z"
    }
  ],
  "message": "Level reward configs retrieved successfully"
}
```

---

## 3. Get Reward Config by ID

- **Path**: `GET /api/admin/level-rewards/:id`

### Response (200 OK)

```json
{
  "success": true,
  "result": {
    "_id": "665a1b2c3d4e5f6a7b8c9d0e",
    "level": 1,
    "coinReward": 5000,
    "createdAt": "2026-08-08T10:00:00.000Z",
    "updatedAt": "2026-08-08T10:00:00.000Z"
  },
  "message": "Level reward config retrieved successfully"
}
```

### Error Responses

**404 Not Found**
```json
{
  "success": false,
  "message": "Level reward config not found"
}
```

---

## 4. Update Reward Config

Updates a reward config. Both `level` and `coinReward` are optional — only provided fields are updated.

- **Path**: `PUT /api/admin/level-rewards/:id`
- **Content-Type**: `application/json`

### Request Body

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `level` | `number` | No | Updated level (must remain unique) |
| `coinReward` | `number` | No | Updated coin reward amount |

At least one field must be provided.

### Example Request

```json
{
  "coinReward": 10000
}
```

### Response (200 OK)

```json
{
  "success": true,
  "result": {
    "_id": "665a1b2c3d4e5f6a7b8c9d0e",
    "level": 1,
    "coinReward": 10000,
    "createdAt": "2026-08-08T10:00:00.000Z",
    "updatedAt": "2026-08-08T11:00:00.000Z"
  },
  "message": "Level reward config updated successfully"
}
```

### Error Responses

**400 Bad Request — No fields provided**
```json
{
  "success": false,
  "message": "At least one field (level, coinReward) is required"
}
```

**404 Not Found**
```json
{
  "success": false,
  "message": "Level reward config not found"
}
```

**409 Conflict — New level already taken by another config**
```json
{
  "success": false,
  "message": "Reward config for level 2 already exists"
}
```

---

## 5. Delete Reward Config

Deletes a reward config. Does not affect existing claims.

- **Path**: `DELETE /api/admin/level-rewards/:id`

### Response (200 OK)

```json
{
  "success": true,
  "result": {
    "_id": "665a1b2c3d4e5f6a7b8c9d0e",
    "level": 1,
    "coinReward": 5000,
    "createdAt": "2026-08-08T10:00:00.000Z",
    "updatedAt": "2026-08-08T10:00:00.000Z"
  },
  "message": "Level reward config deleted successfully"
}
```

### Error Responses

**404 Not Found**
```json
{
  "success": false,
  "message": "Level reward config not found"
}
```

---

## 6. Claim Reward

Claims the coin reward for a specific level. The user must have reached the required level and must not have already claimed it.

- **Path**: `POST /api/level-rewards/:level/claim`
- **Content-Type**: `application/json`

### Request Body

No body required — the `level` is taken from the URL parameter.

### Response (200 OK)

```json
{
  "success": true,
  "result": {
    "message": "Reward claimed successfully",
    "balance": 205000
  },
  "message": "Reward claimed successfully"
}
```

The `balance` field shows the user's updated coin balance after the reward is credited.

### Error Responses

**400 Bad Request — User hasn't reached the level**
```json
{
  "success": false,
  "message": "You have not reached this level"
}
```

**404 Not Found — No reward config for this level**
```json
{
  "success": false,
  "message": "No reward config found for level 99"
}
```

**404 Not Found — User not found**
```json
{
  "success": false,
  "message": "User not found"
}
```

**409 Conflict — Already claimed**
```json
{
  "success": false,
  "message": "Already claimed"
}
```

---

## Error Responses

| Status | Message | Cause |
| :--- | :--- | :--- |
| `400` | `level and coinReward are required` | Missing fields in create |
| `400` | `At least one field (level, coinReward) is required` | Empty update body |
| `400` | `You have not reached this level` | User level too low for claim |
| `404` | `Level reward config not found` | Invalid config ID |
| `404` | `No reward config found for level X` | No config exists for claimed level |
| `404` | `User not found` | Invalid user ID |
| `409` | `Reward config for level X already exists` | Duplicate level on create/update |
| `409` | `Already claimed` | User already claimed this level's reward |

---

## Data Model Reference

### MongoDB Collection: `level_reward_configs`

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | `ObjectId` | MongoDB unique identifier |
| `level` | `number` | Level required to claim (unique index) |
| `coinReward` | `number` | Coins awarded on claim |
| `createdAt` | `Date` | Timestamp from Mongoose `timestamps: true` |
| `updatedAt` | `Date` | Timestamp from Mongoose `timestamps: true` |

### MongoDB Collection: `level_reward_claims`

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | `ObjectId` | MongoDB unique identifier |
| `userId` | `ObjectId` (ref: `users`) | User who claimed the reward |
| `level` | `number` | Level that was claimed |
| `claimedAt` | `Date` | When the claim was made |
| `createdAt` | `Date` | Timestamp from Mongoose `timestamps: true` |
| `updatedAt` | `Date` | Timestamp from Mongoose `timestamps: true` |

**Compound unique index**: `{ userId: 1, level: 1 }` — prevents double-claiming at the database level.

---

## File Structure Reference

```
src/
├── models/levelReward/
│   ├── level_reward_config_model.ts    # Config schema (level, coinReward)
│   └── level_reward_claim_model.ts     # Claim schema (userId, level, claimedAt)
├── repository/levelReward/
│   ├── level_reward_config_repository.ts  # Config CRUD + findByLevel()
│   └── level_reward_claim_repository.ts   # Claim queries (findByUserAndLevel)
├── services/levelReward/
│   └── level_reward_service.ts            # Business logic + claim flow
├── controllers/levelReward/
│   └── level_reward_controller.ts         # Request handlers
├── router/
│   ├── level_reward_config_routes.ts      # Admin CRUD routes
│   └── level_reward_routes.ts             # User claim route
└── server.ts
```

### Modified Files

| File | Change |
| :--- | :--- |
| `src/core/Utils/enums.ts` | Added `LevelRewardConfigs` and `LevelRewardClaims` to `DatabaseNames` |
| `src/server.ts` | Imported and mounted `LevelRewardConfigRouter` at `/api/admin/level-rewards` and `LevelRewardRouter` at `/api/level-rewards` |
