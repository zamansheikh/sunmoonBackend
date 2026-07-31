# Premium Tier System (VIP + SVIP) API Documentation

The **Premium Tier System** provides a unified VIP→SVIP progression where users earn tiers **automatically** by recharging coins within a calendar month. Users climb VIP tiers first, then SVIP tiers. Store items are matched dynamically by category + tier number — no config-stored item IDs.

This system consists of:

1. **Premium Config (Admin)** — Manage VIP/SVIP tier milestones, retention thresholds, and category names
2. **Premium Status (User)** — View personal dashboard with level, progress, and current item
3. **Premium Status (Admin)** — View any user's dashboard
4. **Premium Users (Admin)** — List users by level with pagination
5. **Auto-Grant System** — Internal logic that grants store items on level upgrades (dynamic store search)
6. **Purchase Block** — VIP/SVIP items cannot be bought directly from the store

---

## Global Authentication & Request Format

- **Base URL**: `/api/svip`
- **Headers**:
  ```http
  Authorization: Bearer <your_jwt_token_here>
  Content-Type: application/json
  ```
- **Access Control**:
  - **Admin / SubAdmin** — Config management and viewing any user's status
  - **Any authenticated user** — View own premium dashboard

---

## Part 1: Premium Configuration Management (Admin)

### 1.1 Get Premium Configuration

Fetches the current VIP/SVIP tier configuration including milestone thresholds, retention requirements, and category names.

- **Path**: `GET /api/svip/config`
- **Access Control**: `Admin` or `SubAdmin`

#### Response (200 OK)

```json
{
  "status": "success",
  "data": {
    "vipTiers": [
      { "tier": 1, "milestoneCoins": 500000 },
      { "tier": 2, "milestoneCoins": 1200000 },
      { "tier": 3, "milestoneCoins": 2500000 }
    ],
    "svipTiers": [
      { "tier": 1, "milestoneCoins": 5000000 },
      { "tier": 2, "milestoneCoins": 12000000 },
      { "tier": 3, "milestoneCoins": 25000000 }
    ],
    "retentionThreshold": 0.5,
    "vipCategoryName": "VIP",
    "svipCategoryName": "SVIP"
  }
}
```

| Field | Type | Description |
| :--- | :--- | :--- |
| `vipTiers` | `object[]` | Ordered VIP tier definitions. User climbs these first. |
| `vipTiers[].tier` | `number` | VIP tier number (1-based) |
| `vipTiers[].milestoneCoins` | `number` | Coins recharged in a calendar month to reach this tier |
| `svipTiers` | `object[]` | Ordered SVIP tier definitions. User climbs these after maxing VIP. |
| `svipTiers[].tier` | `number` | SVIP tier number (1-based, independent of VIP) |
| `svipTiers[].milestoneCoins` | `number` | Coins recharged in a calendar month to reach this tier |
| `retentionThreshold` | `number` | Fraction of milestone required to retain tier (0.5 = 50%) |
| `vipCategoryName` | `string` | Store category title for VIP items (default: "VIP") |
| `svipCategoryName` | `string` | Store category title for SVIP items (default: "SVIP") |

> **Note**: Config is NOT auto-seeded. If no config exists, milestones won't be checked until an admin creates one.

---

### 1.2 Update Premium Configuration

Updates the VIP/SVIP tier configuration. All fields are optional — only send what you want to change. Partial updates are safe and won't wipe other fields.

- **Path**: `PUT /api/svip/config`
- **Access Control**: `Admin` or `SubAdmin`

#### Request Body (all fields optional)

```json
{
  "vipTiers": [
    { "tier": 1, "milestoneCoins": 500000 },
    { "tier": 2, "milestoneCoins": 1200000 },
    { "tier": 3, "milestoneCoins": 2500000 }
  ],
  "svipTiers": [
    { "tier": 1, "milestoneCoins": 5000000 },
    { "tier": 2, "milestoneCoins": 12000000 },
    { "tier": 3, "milestoneCoins": 25000000 }
  ],
  "retentionThreshold": 0.5,
  "vipCategoryName": "VIP",
  "svipCategoryName": "SVIP"
}
```

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `vipTiers` | `object[]` | No | VIP tier array. Each tier must have `tier` (positive int) and `milestoneCoins` (positive number). Milestones must be strictly ascending. |
| `svipTiers` | `object[]` | No | SVIP tier array. Same validation as VIP tiers. |
| `retentionThreshold` | `number` | No | Fraction (0–1) of milestone required to retain tier |
| `vipCategoryName` | `string` | No | Store category title for VIP items |
| `svipCategoryName` | `string` | No | Store category title for SVIP items |

#### Validation Rules

- `vipTiers` milestones must be strictly ascending: `tier1.milestoneCoins < tier2.milestoneCoins < ...`
- `svipTiers` milestones must be strictly ascending
- Cross-validation: last VIP tier milestone must be **less than** first SVIP tier milestone
- `retentionThreshold` must be between 0 (exclusive) and 1 (inclusive)

#### Response (200 OK)

```json
{
  "status": "success",
  "data": {
    "vipTiers": [ "..." ],
    "svipTiers": [ "..." ],
    "retentionThreshold": 0.5,
    "vipCategoryName": "VIP",
    "svipCategoryName": "SVIP"
  }
}
```

---

## Part 2: Premium Status — User Dashboard

### 2.1 Get My Premium Status

Returns the authenticated user's premium dashboard with current level, milestone progress, retention status, and the current bucket item's visual assets.

- **Path**: `GET /api/svip/status`
- **Access Control**: Any authenticated user

#### Response (200 OK) — User at SVIP level

```json
{
  "status": "success",
  "data": {
    "currentLevel": 5,
    "maxLevel": 6,
    "monthlyRechargeCoins": 8500000,
    "levelStartOfMonth": 3,
    "nextMilestone": {
      "level": 6,
      "milestoneCoins": 25000000
    },
    "progressPercent": 34,
    "retentionStatus": {
      "requiredCoins": 4000000,
      "currentProgress": 8500000,
      "meetsRequirement": true
    },
    "currentItem": {
      "name": "SVIP-2",
      "logo": "https://nimbus.com/.../logo.png",
      "svgaFile": "https://nimbus.com/.../animation.svga",
      "previewFile": "https://nimbus.com/.../preview.png"
    },
    "isVipLevel": false
  }
}
```

#### Response (200 OK) — User with no level (tier 0)

```json
{
  "status": "success",
  "data": {
    "currentLevel": 0,
    "maxLevel": 6,
    "monthlyRechargeCoins": 0,
    "levelStartOfMonth": 0,
    "nextMilestone": {
      "level": 1,
      "milestoneCoins": 500000
    },
    "progressPercent": 0,
    "retentionStatus": null,
    "currentItem": {
      "name": null,
      "logo": null,
      "svgaFile": null,
      "previewFile": null
    },
    "isVipLevel": false
  }
}
```

#### Field Reference

| Field | Type | Description |
| :--- | :--- | :--- |
| `currentLevel` | `number` | Current premium level (0 = none, 1–N = active) |
| `maxLevel` | `number` | Total number of VIP + SVIP tiers configured |
| `monthlyRechargeCoins` | `number` | Total coins recharged this calendar month |
| `levelStartOfMonth` | `number` | Level the user started the month with (for retention) |
| `nextMilestone` | `object \| null` | Next level milestone (null if at max level) |
| `nextMilestone.level` | `number` | Next level number |
| `nextMilestone.milestoneCoins` | `number` | Coins needed to reach next level |
| `progressPercent` | `number` | % progress toward next milestone (0–100) |
| `retentionStatus` | `object \| null` | Retention info (null if level 0) |
| `retentionStatus.requiredCoins` | `number` | Coins needed by month-end to retain current level |
| `retentionStatus.currentProgress` | `number` | Current recharge coins this month |
| `retentionStatus.meetsRequirement` | `boolean` | Whether they currently meet retention |
| `currentItem` | `object` | Store item for current level (found dynamically by category + tierNumber) |
| `currentItem.name` | `string \| null` | Store item name (e.g., "SVIP-2") |
| `currentItem.logo` | `string \| null` | Logo image URL |
| `currentItem.svgaFile` | `string \| null` | SVGA animation URL |
| `currentItem.previewFile` | `string \| null` | Preview image URL |
| `isVipLevel` | `boolean` | True if current level is in the VIP range (levels 1–vipTiers.length) |

---

### 2.2 Get Any User's Premium Status (Admin)

Same as above, but for any specified user.

- **Path**: `GET /api/svip/status/:userId`
- **Access Control**: `Admin` or `SubAdmin`

#### Path Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `userId` | `string` | MongoDB ObjectId of the target user |

#### Response (200 OK)

Same response shape as section 2.1.

---

### 2.3 List Users by Level (Admin)

Returns a paginated list of users who have reached a specific level through recharge.

- **Path**: `GET /api/svip/users`
- **Access Control**: `Admin` or `SubAdmin`

#### Query Parameters

| Param | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `level` | `number` | Yes | — | Level to filter by (1–N) |
| `page` | `number` | No | `1` | Page number |
| `limit` | `number` | No | `10` | Results per page |

#### Example

```
GET /api/svip/users?level=3&page=1&limit=10
```

#### Response (200 OK)

```json
{
  "status": "success",
  "data": {
    "pagination": {
      "total": 150,
      "limit": 10,
      "page": 1,
      "totalPage": 15
    },
    "users": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "userId": {
          "_id": "550e8400-e29b-41d4-a716-446655440000",
          "name": "John",
          "avatar": "https://nimbus.com/.../avatar.png"
        },
        "currentLevel": 3,
        "monthlyRechargeCoins": 8500000,
        "levelStartOfMonth": 2,
        "month": 7,
        "year": 2026
      }
    ]
  }
}
```

#### Field Reference (per user)

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | `string` | Premium document ObjectId |
| `userId` | `object` | Populated user info (`_id`, `name`, `avatar`) |
| `currentLevel` | `number` | Current premium level |
| `monthlyRechargeCoins` | `number` | Total coins recharged this month |
| `levelStartOfMonth` | `number` | Level at the start of the month |
| `month` | `number` | Tracking month (1–12) |
| `year` | `number` | Tracking year |

---

## Part 3: Store Item Auto-Grant

When a user reaches a premium level via recharge, the corresponding store item is **automatically added to their inventory (bucket)** with `useStatus: true` (equipped).

### How It Works

1. User recharges coins — `creditRegularUserCoins()` is called
2. `trackRecharge()` increments `monthlyRechargeCoins` and checks milestones **in order**: VIP tiers first, then SVIP tiers
3. If a level is crossed, the system:
   - Updates the user's `currentLevel` in the database
   - **Searches the store** by `categoryId + tierNumber` to find the matching item
   - If found → places it into the user's bucket with `useStatus: true`
   - If not found → logs a warning (admin must create the store item)
4. On next `GET /api/svip/status`, the user sees their new level and the `currentItem` with visual assets

### Upgrade Handling

| Scenario | Behavior |
| :--- | :--- |
| **New user** (level 0 → level 1) | Creates a fresh bucket entry for the level 1 item |
| **VIP → SVIP transition** (level 3 → level 4) | Removes VIP bucket item, creates SVIP bucket item |
| **Same category upgrade** (SVIP-1 → SVIP-2) | Replaces the old bucket item with the new higher-tier item |
| **Retention — level maintained** | Bucket item stays unchanged |
| **Retention — downgrade** | Bucket item is updated to the lower-level item |
| **Retention — drop to level 0** | Bucket items removed from both VIP and SVIP categories |

### Store Item Matching

Store items are matched **dynamically** at runtime:
- Find the category by title (e.g., "VIP" or "SVIP")
- Find the store item with matching `tierNumber` in that category
- **No `storeItemId` is stored in the config** — items are found by `categoryId + tierNumber`

This means:
- Admin can create/update/delete store items independently
- Config reset doesn't affect item matching
- Items are found as long as they exist in the store with the correct `tierNumber`

### Frontend Implications

- The `svipItem` field in user details is populated automatically from the bucket
- The user's equipped store items (from `GET /api/store/bucket`) will include the premium item with `useStatus: true`
- For VIP/SVIP store listings, items are enriched with `monthEnd`, `rechargeRequired`, `currentRechargeAmount` fields

---

## Part 4: VIP/SVIP Items Not Purchasable

VIP and SVIP store items can **no longer be purchased** directly from the store. They are earned exclusively through monthly recharge milestones.

### Affected Endpoint

| Endpoint | Method | Change |
| :--- | :--- | :--- |
| `/api/store/bucket` | POST | Now rejects purchases of items in the "VIP" or "SVIP" category |

### Error Response

Attempting to buy a VIP/SVIP item returns:

```json
{
  "status": "error",
  "message": "VIP/SVIP items can only be earned through monthly recharge milestones, not purchased directly."
}
```

### Frontend Implications

- VIP/SVIP items remain **visible** in the store UI
- Items earned via recharge milestones show `isBought: true` — all tiers ≤ the user's current tier are marked as bought
- Items the user hasn't reached yet show `isBought: false`
- The **Buy button** should **not** be shown for VIP/SVIP items
- Each item is enriched with `monthEnd`, `rechargeRequired`, `currentRechargeAmount` — use these to render progress bars and countdown timers

---

## Part 5: Data Model Reference

### MongoDB Collection: `svip_configs`

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | `ObjectId` | MongoDB unique identifier |
| `vipTiers` | `object[]` | Array of VIP tier configurations |
| `vipTiers[].tier` | `number` | VIP tier level (1-indexed) |
| `vipTiers[].milestoneCoins` | `number` | Monthly recharge threshold to reach this tier |
| `svipTiers` | `object[]` | Array of SVIP tier configurations |
| `svipTiers[].tier` | `number` | SVIP tier level (1-indexed) |
| `svipTiers[].milestoneCoins` | `number` | Monthly recharge threshold to reach this tier |
| `retentionThreshold` | `number` | Fraction of milestone required to retain tier (e.g. 0.5) |
| `vipCategoryName` | `string` | Store category title for VIP items |
| `svipCategoryName` | `string` | Store category title for SVIP items |
| `createdAt` | `Date` | Auto-managed timestamp |
| `updatedAt` | `Date` | Auto-managed timestamp |

### MongoDB Collection: `user_svip`

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | `ObjectId` | MongoDB unique identifier |
| `userId` | `ObjectId` | Reference to users collection (unique, indexed) |
| `currentLevel` | `number` | Current premium level (0 = none) |
| `monthlyRechargeCoins` | `number` | Coins recharged this calendar month |
| `levelStartOfMonth` | `number` | Level at the start of the month |
| `month` | `number` | Tracking month (1–12) |
| `year` | `number` | Tracking year |
| `createdAt` | `Date` | Auto-managed timestamp |
| `updatedAt` | `Date` | Auto-managed timestamp |

### Store Item `tierNumber` Field

Store items in VIP/SVIP categories must have a `tierNumber` field set:

| Field | Type | Description |
| :--- | :--- | :--- |
| `tierNumber` | `number \| null` | Tier number for VIP/SVIP items. Matched against config tiers at runtime. |

- VIP items: `categoryId` = VIP category, `tierNumber` = 1, 2, 3, ...
- SVIP items: `categoryId` = SVIP category, `tierNumber` = 1, 2, 3, ...
- Regular items: `tierNumber` = null

---

## Part 6: Endpoints Summary

| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/svip/config` | Admin / SubAdmin | Get VIP/SVIP configuration |
| `PUT` | `/api/svip/config` | Admin / SubAdmin | Update VIP/SVIP configuration |
| `GET` | `/api/svip/users` | Admin / SubAdmin | List users by level |
| `GET` | `/api/svip/status` | Any authenticated | View own premium dashboard |
| `GET` | `/api/svip/status/:userId` | Admin / SubAdmin | View any user's premium dashboard |

---

## Part 7: Implementation Notes

- **No auto-seeding**: Config is NOT created automatically on server startup. Admin must create it via API. If missing, a console warning is logged and milestones won't be checked.
- **Config caching**: `SvipConfigService` caches the config in-memory for fast reads. Admin updates immediately refresh the cache.
- **Retention cron**: A scheduled job runs on the 1st of each month at midnight. It evaluates retention for all users with `currentLevel > 0`, downgrades those who don't meet the threshold, and syncs bucket items.
- **Dynamic store matching**: Store items are found at runtime by `categoryId + tierNumber` — no config-stored `storeItemId`. This eliminates the null-storeItemId edge case entirely.
- **Sequential progression**: VIP tiers are checked first (levels 1 → vipTiers.length), then SVIP tiers (levels vipTiers.length+1 → total). Users must complete all VIP tiers before entering SVIP.
- **Shared monthly counter**: One `monthlyRechargeCoins` counter is shared across VIP and SVIP. The same recharge amount counts toward both VIP and SVIP milestones.
- **Validation on update**: Tier milestones must be strictly ascending. Last VIP milestone must be less than first SVIP milestone.
