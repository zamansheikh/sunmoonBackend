# SVIP Milestone System API Documentation

The **SVIP Milestone System** replaces the old direct-purchase model for SVIP store items. Users now earn SVIP tiers **automatically** by recharging coins within a calendar month. Each SVIP tier is linked to a store item, which is auto-granted to the user's inventory on milestone reach.

This system consists of:

1. **SVIP Config (Admin)** — Manage tier milestones and retention thresholds
2. **SVIP Status (User)** — View personal SVIP dashboard with tier, progress, and current item
3. **SVIP Status (Admin)** — View any user's SVIP dashboard
4. **Auto-Grant System** — Internal logic that grants store items on milestone upgrades
5. **Purchase Block** — SVIP items cannot be bought directly from the store

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
  - **Any authenticated user** — View own SVIP dashboard

---

## Part 1: SVIP Configuration Management (Admin)

### 1.1 Get SVIP Configuration

Fetches the current SVIP tier configuration including milestone thresholds, retention requirements, and linked store items.

- **Path**: `GET /api/svip/config`
- **Access Control**: `Admin` or `SubAdmin`

#### Response (200 OK)

```json
{
  "status": "success",
  "data": {
    "tiers": [
      { "tier": 1, "milestoneCoins": 1000000, "storeItemId": "64f1a2b3c4d5e6f7a8b9c0d1" },
      { "tier": 2, "milestoneCoins": 3000000, "storeItemId": null },
      { "tier": 3, "milestoneCoins": 8000000, "storeItemId": "64f1a2b3c4d5e6f7a8b9c0d3" },
      { "tier": 4, "milestoneCoins": 15000000, "storeItemId": null },
      { "tier": 5, "milestoneCoins": 30000000, "storeItemId": null },
      { "tier": 6, "milestoneCoins": 50000000, "storeItemId": null },
      { "tier": 7, "milestoneCoins": 70000000, "storeItemId": null },
      { "tier": 8, "milestoneCoins": 90000000, "storeItemId": null },
      { "tier": 9, "milestoneCoins": 110000000, "storeItemId": null }
    ],
    "retentionThreshold": 2000000
  }
}
```

| Field | Type | Description |
| :--- | :--- | :--- |
| `tiers[].tier` | `number` | Tier level (1–9) |
| `tiers[].milestoneCoins` | `number` | Coins that must be recharged in a calendar month to reach this tier |
| `tiers[].storeItemId` | `string \| null` | MongoDB ObjectId of the linked store item (null until an admin creates the item with name matching `SVIP-N`) |
| `retentionThreshold` | `number` | Minimum coins to recharge each month to retain the current tier |

---

### 1.2 Update SVIP Configuration

Updates the SVIP tier configuration. You can update individual tier's milestone coins and the retention threshold. The entire `tiers` array is replaced, so send the full array.

- **Path**: `PUT /api/svip/config`
- **Access Control**: `Admin` or `SubAdmin`

#### Request Body

```json
{
  "tiers": [
    { "tier": 1, "milestoneCoins": 1000000 },
    { "tier": 2, "milestoneCoins": 3000000 },
    { "tier": 3, "milestoneCoins": 8000000 },
    { "tier": 4, "milestoneCoins": 15000000 },
    { "tier": 5, "milestoneCoins": 30000000 },
    { "tier": 6, "milestoneCoins": 50000000 },
    { "tier": 7, "milestoneCoins": 70000000 },
    { "tier": 8, "milestoneCoins": 90000000 },
    { "tier": 9, "milestoneCoins": 110000000 }
  ],
  "retentionThreshold": 2000000
}
```

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `tiers` | `object[]` | Yes | Full array of tier configurations. Each tier must have `tier` and `milestoneCoins`. The `storeItemId` is managed automatically (see auto-sync) |
| `retentionThreshold` | `number` | Yes | Minimum monthly recharge coins to retain current tier |

#### Response (200 OK)

```json
{
  "status": "success",
  "message": "SVIP Config updated successfully",
  "data": {
    "tiers": [ "...full tiers array..." ],
    "retentionThreshold": 2000000
  }
}
```

---

## Part 2: SVIP Status — User Dashboard

### 2.1 Get My SVIP Status

Returns the authenticated user's SVIP dashboard with current tier, milestone progress, retention status, and the linked store item's visual assets.

- **Path**: `GET /api/svip/status`
- **Access Control**: Any authenticated user

#### Response (200 OK) — User with active SVIP

```json
{
  "status": "success",
  "data": {
    "currentTier": 3,
    "monthlyRechargeCoins": 8500000,
    "tierStartOfMonth": 2,
    "nextMilestone": {
      "tier": 4,
      "milestoneCoins": 15000000
    },
    "progressPercent": 56,
    "retentionStatus": {
      "requiredCoins": 2000000,
      "currentProgress": 8500000,
      "meetsRequirement": true
    },
    "currentItem": {
      "name": "SVIP-3",
      "logo": "https://res.cloudinary.com/.../logo.png",
      "svgaFile": "https://res.cloudinary.com/.../animation.svga",
      "previewFile": "https://res.cloudinary.com/.../preview.png"
    }
  }
}
```

#### Response (200 OK) — User with no SVIP (tier 0)

```json
{
  "status": "success",
  "data": {
    "currentTier": 0,
    "monthlyRechargeCoins": 0,
    "tierStartOfMonth": 0,
    "nextMilestone": {
      "tier": 1,
      "milestoneCoins": 1000000
    },
    "progressPercent": 0,
    "retentionStatus": null,
    "currentItem": {
      "name": null,
      "logo": null,
      "svgaFile": null,
      "previewFile": null
    }
  }
}
```

#### Field Reference

| Field | Type | Description |
| :--- | :--- | :--- |
| `currentTier` | `number` | Current SVIP tier (0 = none) |
| `monthlyRechargeCoins` | `number` | Total coins recharged this calendar month |
| `tierStartOfMonth` | `number` | Tier the user started the month with (for retention comparison) |
| `nextMilestone` | `object \| null` | Next tier milestone (null if at max tier) |
| `nextMilestone.tier` | `number` | Next tier number |
| `nextMilestone.milestoneCoins` | `number` | Coins needed to reach next tier |
| `progressPercent` | `number` | % progress toward next milestone (0–100) |
| `retentionStatus` | `object \| null` | Retention info (null if tier 0) |
| `retentionStatus.requiredCoins` | `number` | Coins needed by month-end to retain current tier |
| `retentionStatus.currentProgress` | `number` | Current recharge coins this month |
| `retentionStatus.meetsRequirement` | `boolean` | Whether they currently meet retention |
| `currentItem` | `object` | SVIP store item linked to current tier |
| `currentItem.name` | `string \| null` | Store item name (e.g., "SVIP-3") |
| `currentItem.logo` | `string \| null` | Logo image URL |
| `currentItem.svgaFile` | `string \| null` | SVGA animation URL |
| `currentItem.previewFile` | `string \| null` | Preview image URL |

---

### 2.2 Get Any User's SVIP Status (Admin)

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

## Part 3: SVIP Store Item Auto-Grant

When a user reaches an SVIP milestone via recharge, the corresponding SVIP store item is **automatically added to their inventory (bucket)** with `useStatus: true` (equipped).

### How It Works

1. User recharges coins — `creditRegularUserCoins()` is called
2. `trackRecharge()` increments `monthlyRechargeCoins` and checks milestone thresholds against the SVIP config
3. If a milestone is crossed (tier upgrade), the system:
   - Updates the user's SVIP tier in the database
   - Places the linked SVIP store item into their bucket with `useStatus: true`
4. On next `GET /api/svip/status`, the user sees their new tier and the `currentItem` with the store item's visual assets

### Upgrade Handling

| Scenario | Behavior |
| :--- | :--- |
| **New SVIP user** (tier 0 → tier 1) | Creates a fresh bucket entry for the SVIP-1 item |
| **Existing user upgrading** (tier 2 → tier 5) | Replaces the old bucket item with the new higher-tier item |
| **Retention — tier maintained** | Bucket item stays unchanged |
| **Retention — downgrade** | Bucket item is updated to the lower-tier item |
| **Retention — drop to tier 0** | SVIP bucket item is removed entirely |

### Frontend Implications

- The `svipItem` field in user details (`GET /api/auth/my-details`, `GET /api/auth/user/:id`) is populated automatically from the bucket — no frontend changes needed
- The `svipItem` in socket room messages is also populated automatically
- The user's equipped store items (from `GET /api/store/bucket`) will include the SVIP item with `useStatus: true`

---

## Part 4: SVIP Items No Longer Purchasable

SVIP store items can **no longer be purchased** directly from the store. They are earned exclusively through monthly recharge milestones.

### Affected Endpoint

| Endpoint | Method | Change |
| :--- | :--- | :--- |
| `/api/store/bucket` | POST | Now rejects purchases of items in the "SVIP" category |

### Error Response

Attempting to buy an SVIP item returns:

```json
{
  "status": "error",
  "message": "SVIP items can only be earned through monthly recharge milestones, not purchased directly."
}
```

### Frontend Implications

- SVIP items remain **visible** in the store UI (they appear in `GET /api/store/items/svip`)
- Items earned via recharge milestones show `isBought: true` — all tiers ≤ the user's current tier are marked as bought
- Items the user hasn't reached yet show `isBought: false`
- The **Buy button** should **not** be shown for SVIP items. Instead, show the user's current milestone progress and which tier they need to reach to unlock the item
- SVIP items are set to `canUserBuyThis: false` automatically

---

## Part 5: Data Model Reference

### MongoDB Collection: `svip_configs`

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | `ObjectId` | MongoDB unique identifier |
| `tiers` | `object[]` | Array of tier configurations |
| `tiers[].tier` | `number` | Tier level (1-indexed) |
| `tiers[].milestoneCoins` | `number` | Monthly recharge threshold to reach this tier |
| `tiers[].storeItemId` | `ObjectId \| null` | Reference to the linked store item (`store_items` collection) |
| `retentionThreshold` | `number` | Minimum monthly recharge to retain current tier |
| `createdAt` | `Date` | Auto-managed timestamp |
| `updatedAt` | `Date` | Auto-managed timestamp |

---

## Part 6: Endpoints Summary

| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/svip/config` | Admin / SubAdmin | Get SVIP tier configuration |
| `PUT` | `/api/svip/config` | Admin / SubAdmin | Update SVIP tier configuration |
| `GET` | `/api/svip/status` | Any authenticated | View own SVIP dashboard |
| `GET` | `/api/svip/status/:userId` | Admin / SubAdmin | View any user's SVIP dashboard |

---

## Part 7: Implementation Notes

- **Tier config caching**: `SvipConfigService` caches the config in-memory for fast reads. Admin updates immediately refresh the cache
- **Retention cron**: A scheduled job runs at month-end to evaluate retention. Users who meet the threshold keep their tier; those who don't are downgraded or reset
- **Auto-sync on store item operations**: When an admin creates, updates, or deletes a batch store item whose name starts with `"SVIP-"`, the SVIP config's `storeItemId` and `milestoneCoins` are automatically synchronized (see Admin documentation for details)
- **Default thresholds**: 9 tiers (1M to 110M coins), retention at 2M coins. Customizable via the config API
