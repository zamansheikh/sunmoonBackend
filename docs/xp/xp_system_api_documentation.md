# XP System API Documentation

The **XP System** manages user experience points and level progression. It consists of:

1. **Admin XP Configuration API** — Manage XP thresholds, gift-to-XP conversion rates, and SVIP multipliers (DB-backed, cached in-memory).
2. **Admin User XP Update API** — Admin can increase any user's XP, which automatically recalculates the user's level.
3. **Client-side XP System** — How users earn XP, how levels are calculated, and the real-time WebSocket events emitted.

---

## Global Authentication & Request Format

- **Admin Base URL**: `/api/admin`
- **Headers**:
  ```http
  Authorization: Bearer <your_jwt_token_here>
  Content-Type: application/json
  ```
- **Access Control**: All admin XP endpoints require the `Admin` role.

---

## Part 1: Admin XP Configuration API

Manages the global XP configuration stored in the database and cached in-memory. This configuration determines:
- `xpLevels` — The XP thresholds for each level
- `giftSendXp` — How many coins equal 1 XP (coin → XP conversion divisor)
- `svipMultipliers` — SVIP tier multipliers that boost XP earned from coins

### Endpoints

| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/xp-config` | Admin | Retrieve the current XP configuration |
| `POST` | `/api/admin/xp-config` | Admin | Update the XP configuration (partial update supported) |

---

### 1.1 Get XP Configuration

Fetches the current XP configuration from the in-memory cache (near-zero read time, zero DB hits after first load).

- **Path**: `GET /api/admin/xp-config`

#### Response (200 OK)

```json
{
  "status": "success",
  "data": {
    "_id": "665a1b2c3d4e5f6a7b8c9d0e",
    "xpLevels": [160, 325, 460, 625, 805, 995, 1175, 1382, 1618, 1937, 2332, 2892, 3602, 4442, 5427, 6630, 8010, 9517, 11215, 13022, 15009, 17269, 19567, 22254, 25207, 28410, 31810, 35427, 39228, 43278, 47614, 52126, 56982, 62180, 67928, 73928, 80356, 87202, 97002, 107203, 123767, 145890, 174319, 210897, 254555, 304540, 363509, 431094, 500617, 580602, 670860, 772069],
    "giftSendXp": 600,
    "svipMultipliers": [
      { "minLevel": 0, "multiplier": 1.0 },
      { "minLevel": 2, "multiplier": 1.2 },
      { "minLevel": 7, "multiplier": 1.3 },
      { "minLevel": 9, "multiplier": 1.4 }
    ],
    "createdAt": "2026-05-26T10:00:00.000Z",
    "updatedAt": "2026-05-26T10:00:00.000Z"
  }
}
```

---

### 1.2 Update XP Configuration

Updates the XP configuration in the database and immediately refreshes the in-memory cache. Supports partial updates — only send the fields you want to change.

- **Path**: `POST /api/admin/xp-config`

#### Request Body (partial update — all fields optional)

```json
{
  "xpLevels": [180, 350, 500, ...],
  "giftSendXp": 500,
  "svipMultipliers": [
    { "minLevel": 0, "multiplier": 1.0 },
    { "minLevel": 3, "multiplier": 1.5 }
  ]
}
```

#### Validation Rules

| Field | Type | Required | Validation |
| :--- | :--- | :--- | :--- |
| `xpLevels` | `number[]` | At least one field required | Non-empty array of positive numbers; must be **strictly ascending** (each value > previous) |
| `giftSendXp` | `number` | At least one field required | Positive number |
| `svipMultipliers` | `object[]` | At least one field required | Non-empty array. Each object must have `minLevel` (non-negative number) and `multiplier` (positive number) |

#### Response (200 OK)

```json
{
  "status": "success",
  "message": "XP Configuration updated and cache synchronized successfully",
  "data": {
    "_id": "665a1b2c3d4e5f6a7b8c9d0e",
    "xpLevels": [180, 350, 500, ...],
    "giftSendXp": 500,
    "svipMultipliers": [
      { "minLevel": 0, "multiplier": 1.0 },
      { "minLevel": 3, "multiplier": 1.5 }
    ],
    "createdAt": "2026-05-26T10:00:00.000Z",
    "updatedAt": "2026-05-26T10:05:00.000Z"
  }
}
```

#### Error Responses

**400 Bad Request — At least one field required**
```json
{
  "status": "error",
  "message": "At least one field is required: xpLevels, giftSendXp, or svipMultipliers"
}
```

**400 Bad Request — xpLevels not strictly ascending**
```json
{
  "status": "error",
  "message": "xpLevels must be strictly ascending. Level 2 (450) is not greater than level 1 (460)"
}
```

**400 Bad Request — Invalid svipMultipliers**
```json
{
  "status": "error",
  "message": "Each svipMultiplier must have a positive multiplier"
}
```

---

## Part 2: Admin User XP Update API

Increases a user's `totalEarnedXp` by the specified amount. The user's `level` is recalculated from the new total using the configured `xpLevels` thresholds. If the user crosses a level threshold, a `LevelUp` WebSocket event is emitted to the user in real time.

| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `PUT` | `/api/admin/users/xp/:userId` | Admin | Increase a user's XP and recalculate their level |

### Path Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `userId` | `string` | MongoDB ObjectId of the target user |

### Request Body

```json
{
  "xpAmount": 5000
}
```

| Field | Type | Required | Validation |
| :--- | :--- | :--- | :--- |
| `xpAmount` | `number` | Yes | Must be a valid number greater than 0 |

### Response (200 OK)

```json
{
  "success": true,
  "result": {
    "totalEarnedXp": 25500,
    "level": 3
  },
  "message": "User XP updated successfully"
}
```

### Error Responses

**400 Bad Request**
```json
{ "message": "xpAmount must be greater than 0" }
```
```json
{ "message": "xpAmount must be a valid number" }
```

**404 Not Found**
```json
{ "message": "User not found" }
```

---

## Part 3: Client-Side XP System

### 3.1 How Users Earn XP

Users earn XP through two paths:

#### Path A: Direct XP from Admin (`updateUserXp`)
- Called by the admin XP update API above.
- XP is added directly: `totalEarnedXp += xpAmount`.

#### Path B: XP from Gift Coins (`updateUserXpFromCoin`)
- Called automatically when a user sends a gift (spending coins).
- XP earned = `(coins / giftSendXp) × SVIP_multiplier`.
- Example: user spends 3000 coins, `giftSendXp = 600`, no SVIP → `3000 / 600 × 1.0 = 5 XP`.
- **`giftSendXp`** is the divisor — a lower value means more XP per coin spent.

### 3.2 SVIP Multipliers

SVIP packages boost XP earnings. The multiplier is determined by the user's highest owned SVIP tier.

| SVIP Tier (minLevel) | Multiplier |
| :--- | :--- |
| 0 (no SVIP) | 1.0× (base) |
| 2 | 1.2× |
| 7 | 1.3× |
| 9 | 1.4× |

The system checks SVIP tiers in descending order of `minLevel` and applies the first match.

### 3.3 Level Calculation

Levels are **not** incremental. The level is always recalculated from the total XP against the `xpLevels` threshold array:

```
For level N: xpLevels[N-1] ≤ totalEarnedXp < xpLevels[N]
```

| XP Range | Level |
| :--- | :--- |
| 0 – 159 | Level 0 |
| 160 – 324 | Level 1 |
| 325 – 459 | Level 2 |
| ... | ... |
| ≥ 772,069 (last threshold) | Level 52 (max) |

### 3.4 User Document Fields

The user document (`users` collection) contains these XP-related fields:

| Field | Type | Description |
| :--- | :--- | :--- |
| `totalEarnedXp` | `number` | Cumulative XP earned (default: 0) |
| `level` | `number` | Current calculated level (default: 0) |
| `currentLevelBackground` | `string` | URL to level background image (managed externally by level tag/bg assignment system) |
| `currentLevelTag` | `string` | URL to level tag image (managed externally by level tag/bg assignment system) |

### 3.5 WebSocket Events

#### `LevelUp` (AudioRoomChannels.LevelUp)

Emitted **directly to the user** when their level increases after an XP update.

```typescript
// Event name: "level-up"
{
  level: 5
}
```

**Important:** The `LevelUp` event is emitted **only when the level actually increases**, not on every XP update. If the user's XP goes from 200 (level 1) to 250 (still level 1), no event is emitted.

### 3.6 Implementation Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        XP System Architecture                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐     ┌──────────────┐     ┌─────────────────────┐  │
│  │ Admin XP     │     │ Admin XP     │     │ Gift System         │  │
│  │ Config API   │     │ Update API   │     │ (Coin Spend)        │  │
│  │ (GET/POST)   │     │ (PUT)        │     │                     │  │
│  └──────┬───────┘     └──────┬───────┘     └─────────┬───────────┘  │
│         │                    │                       │              │
│         ▼                    ▼                       ▼              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                      XpConfigService                        │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │    │
│  │  │  DB Config   │  │  ConfigCache │  │  Bootstrap/Seed  │  │    │
│  │  │  (MongoDB)   │  │  (In-Memory) │  │  on Startup      │  │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                             │                                       │
│                             ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                      XpHelper (Singleton)                    │    │
│  │                                                              │    │
│  │  ┌──────────────────────┐  ┌──────────────────────────────┐ │    │
│  │  │ updateUserXp()       │  │ updateUserXpFromCoin()       │ │    │
│  │  │ • Direct XP addition │  │ • Coin → XP conversion      │ │    │
│  │  │ • Level calculation  │  │ • SVIP multiplier applied   │ │    │
│  │  │ • Socket emit on ▲   │  │ • Level calculation         │ │    │
│  │  └──────────────────────┘  │ • Socket emit on ▲          │ │    │
│  │                            └──────────────────────────────┘ │    │
│  │  ┌──────────────────────────────────────────────────────┐   │    │
│  │  │   determineUserLevelFromXp(xpCount, xpLevels)→level  │   │    │
│  │  │   calculateSvipMultiplier(userId, svipMultipliers)   │   │    │
│  │  └──────────────────────────────────────────────────────┘   │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                             │                                       │
│              ┌──────────────┴──────────────┐                       │
│              ▼                              ▼                       │
│  ┌───────────────────┐        ┌──────────────────────────┐         │
│  │   User Document   │        │  SingletonSocketServer   │         │
│  │  (MongoDB Update) │        │  (LevelUp Socket Emit)   │         │
│  └───────────────────┘        └──────────────────────────┘         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.7 Server Startup Behavior

On server startup, `XpConfigService.bootstrap()` is called which:

1. Checks if an XP configuration document exists in the database.
2. If not found, seeds the database with default values (52 levels, `giftSendXp: 600`, 4 SVIP tiers).
3. Warms the in-memory cache so subsequent reads are instant (zero DB I/O).

---

## Part 4: Data Model Reference

### MongoDB Collection: `xp_configs`

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | `ObjectId` | MongoDB unique identifier |
| `xpLevels` | `number[]` | Strictly ascending XP thresholds for each level (52 levels by default) |
| `giftSendXp` | `number` | Coin → XP conversion divisor (lower = more XP per coin) |
| `svipMultipliers` | `object[]` | Array of `{ minLevel, multiplier }` objects for SVIP XP boost |
| `createdAt` | `Date` | Timestamp from Mongoose `timestamps: true` |
| `updatedAt` | `Date` | Timestamp from Mongoose `timestamps: true` |

### User Document Fields (referenced)

| Field | Type | Description |
| :--- | :--- | :--- |
| `totalEarnedXp` | `number` | Cumulative XP earned by the user |
| `level` | `number` | User's current level (0-based, recalculated from XP) |

---

## Part 5: Endpoints Summary

| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/xp-config` | Admin | Get XP configuration (thresholds, conversion rate, SVIP multipliers) |
| `POST` | `/api/admin/xp-config` | Admin | Update XP configuration (partial update, cache refreshed immediately) |
| `PUT` | `/api/admin/users/xp/:userId` | Admin | Increase a user's XP and recalculate level |

---

## Part 6: Key Implementation Notes

- **Caching strategy**: `XpConfigService` caches the config in a static in-memory variable. First access lazy-loads from DB with a shared promise (deduplicates concurrent requests). Admin updates immediately refresh the cache.
- **Level recalculation**: Levels are **always recalculated from zero** against the full `xpLevels` threshold array. A large XP grant can advance the user multiple levels at once.
- **Level-up socket event**: Emitted **only when the level actually increases**. The event is directed to the specific user via their socket ID.
- **Level tags/bg**: `currentLevelBackground` and `currentLevelTag` on the user document are set by a separate admin-managed level tagging system (`/api/admin/level-tags`), not by `XpHelper`.
- **Thread safety**: `XpHelper` is a singleton. `XpConfigService` uses a shared promise and `configLoaded` guard to prevent race conditions between concurrent reads and admin updates.
- **Default values** (seeded on first deploy):
  - 52 XP levels (1–52)
  - `giftSendXp: 600` (600 coins = 1 XP at base rate)
  - 4 SVIP tiers: level 0 (1.0×), level 2 (1.2×), level 7 (1.3×), level 9 (1.4×)
