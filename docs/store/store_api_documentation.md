# Store System API Documentation

The **Store System** provides a complete in-app store experience with categories, items (single-use and batch/premium), pricing, privileges, and user inventory management (buckets). It supports grouping items by category, multiple pricing options per item, and exclusive grant-only items.

This system consists of:

1. **Category Management** — Admin CRUD for store categories
2. **Item Management** — Admin CRUD for single and batch items
3. **Item Browsing** — Public endpoints for browsing items by category, VIP, SVIP, exclusive, or filtered by `canUserBuyThis`
4. **Bucket Management** — User purchase, sending items to others, equipping, and inventory listing
5. **Admin Grant** — Direct granting of exclusive items to users

---

## Global Authentication & Request Format

- **Base URL**: `/api/store`
- **Headers**:
  ```http
  Authorization: Bearer <your_jwt_token_here>
  Content-Type: application/json
  ```
- **File Upload Endpoints**: Use `multipart/form-data` for create/update endpoints that accept `svgaFile`, `previewFile`, and `logo` fields
- **Access Control**:
  - **Admin / SubAdmin** — Category and item CRUD, grant endpoint
  - **Any authenticated user** — Browsing items, bucket operations

---

## Part 1: Category Management

### 1.1 Create Category

- **Path**: `POST /api/store/categories`
- **Access Control**: `Admin` or `SubAdmin`

#### Request Body

```json
{
  "name": "Background",
  "description": "Chat background themes"
}
```

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | Yes | Category display name (e.g., "Vip", "Svip", "Background", "Text Bubble") |
| `description` | `string` | No | Optional description |

#### Response (201 Created)

```json
{
  "success": true,
  "result": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Background",
    "description": "Chat background themes",
    "createdAt": "2026-05-20T10:00:00.000Z",
    "updatedAt": "2026-05-20T10:00:00.000Z"
  },
  "message": "Category created successfully"
}
```

---

### 1.2 Get All Categories

- **Path**: `GET /api/store/categories`
- **Access Control**: Any authenticated user

#### Response (200 OK)

```json
{
  "success": true,
  "result": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Background",
      "description": "Chat background themes",
      "createdAt": "2026-05-20T10:00:00.000Z",
      "updatedAt": "2026-05-20T10:00:00.000Z"
    }
  ],
  "message": "Categories retrieved successfully"
}
```

---

### 1.3 Get Category by ID

- **Path**: `GET /api/store/categories/:id`
- **Access Control**: Any authenticated user

---

### 1.4 Update Category

- **Path**: `PUT /api/store/categories/:id`
- **Access Control**: `Admin` or `SubAdmin`

---

### 1.5 Delete Category

- **Path**: `DELETE /api/store/categories/:id`
- **Access Control**: `Admin` or `SubAdmin`

**Note**: Deleting a category affects all items assigned to it. Use `GET /api/store/categories/effected-items/:id` to preview impacted items before deletion.

---

### 1.6 Get Effected Items for Category Deletion

- **Path**: `GET /api/store/categories/effected-items/:id`
- **Access Control**: `Admin` or `SubAdmin`

Returns a summary of items that would be affected by deleting the category.

---

## Part 2: Item Management

### 2.1 Create Single Item

Creates a **single** store item (one file per upload).

- **Path**: `POST /api/store/items/single`
- **Access Control**: `Admin` or `SubAdmin`
- **Content-Type**: `multipart/form-data`

#### Form Fields

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | Yes | Item display name (e.g., "VIP-1", "SVIP-3") |
| `categoryId` | `string` | Yes | MongoDB ObjectId of the category |
| `prices` | `string` (JSON) | Yes | JSON stringified array of `{ validity, price }` objects |
| `privilege` | `string` (JSON) | No | JSON stringified array of privilege strings |
| `logo` | `file` | No | Item logo image |
| `svgaFile` | `file` | Yes | SVGA animation file |
| `previewFile` | `file` | Yes | Preview image file |

#### Request Body Example

```json
// multipart/form-data fields
prices: "[{\"validity\": 30, \"price\": 500}, {\"validity\": 90, \"price\": 1200}]"
privilege: "[\"create_room\", \"custom_badge\"]"
```

#### Response (201 Created)

```json
{
  "success": true,
  "result": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
    "name": "VIP-1",
    "categoryId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "prices": [
      { "validity": 30, "price": 500 },
      { "validity": 90, "price": 1200 }
    ],
    "privilege": ["create_room", "custom_badge"],
    "isPremium": true,
    "canUserBuyThis": true,
    "tierNumber": 1,
    "logo": "https://res.cloudinary.com/.../logo.png",
    "svgaFile": "https://res.cloudinary.com/.../anim.svga",
    "previewFile": "https://res.cloudinary.com/.../preview.png",
    "createdAt": "2026-05-20T10:00:00.000Z",
    "updatedAt": "2026-05-20T10:00:00.000Z"
  },
  "message": "Store item created successfully"
}
```

---

### 2.2 Create Batch Item (Premium)

Creates a **batch** of store items (multiple files per upload). Batch items are typically premium items (VIP, SVIP).

- **Path**: `POST /api/store/items/batch`
- **Access Control**: `Admin` or `SubAdmin`
- **Content-Type**: `multipart/form-data`

#### Form Fields

Same as single item, but `svgaFile` and `previewFile` accept multiple files (e.g., one per batch variant).

#### Response (201 Created)

Same shape as single item, with `isPremium: true`.

---

### 2.3 Update Single Item (Non-Premium)

Updates an existing **non-premium** store item. This endpoint rejects premium items — use `2.4 Update Batch Item` for VIP/SVIP items.

- **Path**: `PUT /api/store/items/single/:id`
- **Access Control**: `Admin` or `SubAdmin`
- **Content-Type**: `multipart/form-data`

#### Guard

| Condition | Error |
| :--- | :--- |
| Item not found | `404: "Store item with id {id} not found"` |
| Item is premium (`isPremium: true`) | `400: "This api is not for premium items"` |

#### Form Fields

All fields are optional. At least one field must be provided.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | No | Item display name (must be unique) |
| `categoryId` | `string` | No | MongoDB ObjectId of the new category |
| `prices` | `string` (JSON) | No | JSON stringified array of `{ validity, price }` objects (replaces entire array) |
| `privilege` | `string` (JSON) | No | JSON stringified array of privilege strings (replaces entire array) |
| `canUserBuyThis` | `boolean` | No | Whether the item can be purchased |
| `tierNumber` | `number` | No | Tier number for premium matching. Set `null` to clear. |
| `svgaFile` | `file` | No | New SVGA animation file. Old file deleted from Nimbus. |
| `previewFile` | `file` | No | New preview image. Old file deleted from Nimbus. |
| `logo` | `file` | No | New logo image. Old file deleted from Nimbus. |

> **Note**: When a file is uploaded, the old file is deleted from Nimbus storage before the new one is uploaded. If you want to replace only the logo, send only the `logo` field — `svgaFile` and `previewFile` can be omitted.

#### Request Body Example

```
multipart/form-data

name: "Cool Hat"
prices: "[{\"validity\": 30, \"price\": 100}, {\"validity\": 90, \"price\": 250}]"
privilege: "[\"custom_badge\"]"
canUserBuyThis: true
tierNumber: 2
```

#### Response (200 OK)

```json
{
  "success": true,
  "result": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
    "name": "Cool Hat",
    "categoryId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "prices": [
      { "validity": 30, "price": 100 },
      { "validity": 90, "price": 250 }
    ],
    "privilege": ["custom_badge"],
    "isPremium": false,
    "canUserBuyThis": true,
    "tierNumber": 2,
    "logo": "https://nimbus/.../new-logo.png",
    "svgaFile": "https://nimbus/.../old-anim.svga",
    "previewFile": "https://nimbus/.../old-preview.png",
    "createdAt": "2026-05-20T10:00:00.000Z",
    "updatedAt": "2026-08-01T12:00:00.000Z"
  }
}
```

#### Error Responses

| Status | Message |
| :--- | :--- |
| `400` | `"name, categoryId, prices, privilege, canUserBuyThis, or tierNumber — at least one is required"` |
| `400` | `"This api is not for premium items"` |
| `400` | `"svgaFile must be a .svga file"` |
| `400` | `"previewFile must be an image"` |
| `400` | `"logo must be an image"` |
| `404` | `"Store item with id {id} not found"` |

---

### 2.4 Update Batch Item (Premium — VIP, SVIP)

Updates an existing **premium** (batch) store item. This is the endpoint for VIP and SVIP items. It rejects non-premium items — use `2.3 Update Single Item` for regular items.

- **Path**: `PUT /api/store/items/batch/:id`
- **Access Control**: `Admin` or `SubAdmin`
- **Content-Type**: `multipart/form-data`

#### Guard

| Condition | Error |
| :--- | :--- |
| Item not found | `404: "Store item with id {id} not found"` |
| Item is not premium (`isPremium: false`) | `400: "This api is not for single items"` |

#### Form Fields

All fields are optional. At least one of `name`, `categoryId`, `prices`, or `tierNumber` must be provided.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | No | Item display name (must be unique). VIP/SVIP names must follow `PREFIX-NUMBER` format (e.g. `"VIP-1"`, `"SVIP-3"`). |
| `categoryId` | `string` | No | MongoDB ObjectId of the new category |
| `prices` | `string` (JSON) | No | JSON stringified array of `{ validity, price }` objects (replaces entire array) |
| `privilege` | `string` (JSON) | No | JSON stringified array of privilege strings |
| `tierNumber` | `number` | No | Tier number for VIP/SVIP matching. Used by the premium config to match milestone rewards. |
| `categoryNames` | `string` | No | Comma-separated bundle category names to replace files for (e.g. `"VIP-1, VIP-2, VIP-3"`) |
| `svgaFlags` | `string` | No | Comma-separated `"1"/"0"` per category — `"1"` = file attached, `"0"` = no file. Count must match `categoryNames`. |
| `previewFlags` | `string` | No | Same as `svgaFlags` but for preview files |
| `svgaFile` | `file[]` | No | Up to 10 SVGA files, mapped to categories via `categoryNames` + `svgaFlags` |
| `previewFile` | `file[]` | No | Up to 10 preview files, mapped to categories via `categoryNames` + `previewFlags` |
| `logo` | `file` | No | New logo image. Old file deleted from Nimbus. |

#### Bundle File Replacement

When you upload files for a `categoryName` that already has bundle files on the item:

1. Old `svgaFileId` and `previewFileId` for that category are collected
2. Old files are deleted from Nimbus
3. New bundle entry is appended to `bundleFiles`
4. Existing bundles for **other** categories are preserved unchanged

If you don't provide `categoryNames`, no bundle files are touched — only metadata (name, prices, etc.) is updated.

#### `svgaFlags` / `previewFlags` Format

These flags tell the server which categories have files attached, since multer flattens all files into a single array.

```
categoryNames: "VIP-1, VIP-2, VIP-3"
svgaFlags:     "1,0,1"     → file for VIP-1, skip VIP-2, file for VIP-3
previewFlags:  "0,1,1"     → skip VIP-1, file for VIP-2, file for VIP-3
```

Rules:
- Flag count must equal `categoryNames` count
- Number of `"1"` flags must equal the number of uploaded files for that field
- When flags are omitted, legacy behavior applies: file count must equal category count

#### Request Body Example — Update Metadata Only

```
multipart/form-data

name: "SVIP-5"
prices: "[{\"validity\": 30, \"price\": 5000000}]"
tierNumber: 5
```

#### Request Body Example — Replace Bundle Files

```
multipart/form-data

name: "VIP-2"
prices: "[{\"validity\": 30, \"price\": 1200000}]"
categoryNames: "VIP-2"
svgaFlags: "1"
previewFlags: "1"
svgaFile: (binary)
previewFile: (binary)
```

#### Response (200 OK)

```json
{
  "success": true,
  "result": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
    "name": "SVIP-5",
    "categoryId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "prices": [
      { "validity": 30, "price": 5000000 }
    ],
    "privilege": ["create_room", "custom_badge"],
    "isPremium": true,
    "canUserBuyThis": false,
    "tierNumber": 5,
    "logo": "https://nimbus/.../logo.png",
    "bundleFiles": [
      {
        "categoryName": "VIP-2",
        "svgaFile": "https://nimbus/.../anim.svga",
        "svgaFileId": "abc123",
        "previewFile": "https://nimbus/.../preview.png",
        "previewFileId": "def456",
        "fileType": "svga"
      }
    ],
    "createdAt": "2026-05-20T10:00:00.000Z",
    "updatedAt": "2026-08-01T12:00:00.000Z"
  }
}
```

#### Error Responses

| Status | Message |
| :--- | :--- |
| `400` | `"name, categoryId, prices, or tierNumber — at least one is required"` |
| `400` | `"This api is not for single items"` |
| `400` | `"VIP or SVIP names must include a valid numeric level suffix, e.g., VIP-1 or SVIP-3"` |
| `400` | `"categoryNames are required"` (when svgaFile sent without categoryNames) |
| `400` | `"categoryNames and svgaFiles must be the same length"` |
| `400` | `"categoryNames and previewFiles must be the same length"` |
| `400` | `"categoryNames and svgaFiles must be the same length"` |
| `404` | `"Store item with id {id} not found"` |

---

### 2.5 Get Item by ID

- **Path**: `GET /api/store/items/:id`
- **Access Control**: Any authenticated user

#### Response (200 OK)

```json
{
  "success": true,
  "result": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
    "name": "VIP-1",
    "categoryId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "prices": [
      { "validity": 30, "price": 500 },
      { "validity": 90, "price": 1200 }
    ],
    "privilege": ["create_room"],
    "isPremium": true,
    "canUserBuyThis": true,
    "tierNumber": 1,
    "logo": "https://...",
    "svgaFile": "https://...",
    "previewFile": "https://...",
    "createdAt": "2026-05-20T10:00:00.000Z",
    "updatedAt": "2026-05-20T10:00:00.000Z"
  }
}
```

---

### 2.6 Delete Item

- **Path**: `DELETE /api/store/items/:id`
- **Access Control**: `Admin` or `SubAdmin`

---

### 2.7 Get Effected Buckets Summary

Previews users who have a specific item in their bucket before deletion.

- **Path**: `GET /api/store/items/effected-buckets/:itemId`
- **Access Control**: `Admin` or `SubAdmin`

---

### 2.8 Change Item Category

Moves an item to a different category.

- **Path**: `PUT /api/store/items/category/:category`
- **Access Control**: `Admin` or `SubAdmin`

---

## Part 3: Item Browsing

### 3.1 Get All Store Items (Grouped by Category)

Returns all store items grouped by category name.

- **Path**: `GET /api/store/items`
- **Access Control**: Any authenticated user

#### Response (200 OK)

```json
{
  "success": true,
  "result": {
    "Vip": [
      {
        "name": "VIP-1",
        "prices": [{ "validity": 30, "price": 500 }],
        "canUserBuyThis": true,
        "isBought": false
      }
    ],
    "Svip": [
      {
        "name": "SVIP-3",
        "prices": [{ "validity": 30, "price": 8000000 }],
        "canUserBuyThis": false,
        "isBought": true
      }
    ],
    "Background": [ ... ],
    "Text Bubble": [ ... ]
  }
}
```

Each key is a category name, and the value is an array of items in that category. Each item includes `canUserBuyThis` and `isBought` for the requesting user.

---

### 3.2 Get VIP Store Items

- **Path**: `GET /api/store/items/vip`
- **Access Control**: Any authenticated user

Returns items in the VIP category (as configured by `vipCategoryName` in the premium config). Each item is enriched with **current progress** fields so the frontend can display a progress bar and expiry info directly.

#### Response (200 OK)

```json
{
  "success": true,
  "result": [
    {
      "_id": "665a...",
      "name": "VIP-2",
      "logo": "https://...",
      "svgaFile": "https://...",
      "isPremium": true,
      "tierNumber": 2,
      "prices": [{ "validity": 30, "price": 1200000 }],
      "canUserBuyThis": true,
      "isBought": true,
      "monthEnd": "2026-07-31T23:59:59.999Z",
      "rechargeRequired": 1200000,
      "currentRechargeAmount": 8500000
    }
  ]
}
```

#### Enrichment Fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `monthEnd` | `Date` | End of the current calendar month — useful for showing expiry/countdown |
| `rechargeRequired` | `number` | Coins the user must recharge in the current month to unlock this item (from premium config's `vipTiers[].milestoneCoins`) |
| `currentRechargeAmount` | `number` | How many coins the authenticated user has already recharged this month (from their `user_svip` document) |

> **Frontend tip**: Use `currentRechargeAmount / rechargeRequired` to render a progress bar per item. Combine with `monthEnd` to show a countdown timer. For tiers already earned (`isBought: true`), the progress bar can be shown as 100% complete.

---

### 3.3 Get SVIP Store Items

- **Path**: `GET /api/store/items/svip`
- **Access Control**: Any authenticated user

Returns items in the SVIP category (as configured by `svipCategoryName` in the premium config). Items have `canUserBuyThis: false` and `isBought` reflects whether the user has earned that tier via monthly recharge. Items are enriched with **current progress** fields so the frontend can display a progress bar and expiry info directly.

#### Response (200 OK)

```json
{
  "success": true,
  "result": [
    {
      "_id": "665a...",
      "name": "SVIP-3",
      "logo": "https://...",
      "svgaFile": "https://...",
      "isPremium": true,
      "tierNumber": 3,
      "prices": [{ "validity": 30, "price": 8000000 }],
      "canUserBuyThis": false,
      "isBought": false,
      "monthEnd": "2026-07-31T23:59:59.999Z",
      "rechargeRequired": 8000000,
      "currentRechargeAmount": 5000000
    }
  ]
}
```

#### Enrichment Fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `monthEnd` | `Date` | End of the current calendar month — useful for showing expiry/countdown |
| `rechargeRequired` | `number` | Coins the user must recharge in the current month to unlock this item (from premium config's `svipTiers[].milestoneCoins`) |
| `currentRechargeAmount` | `number` | How many coins the authenticated user has already recharged this month (from their `user_svip` document) |

> **Frontend tip**: Use `currentRechargeAmount / rechargeRequired` to render a progress bar per item. Combine with `monthEnd` to show a countdown timer. For tiers already earned (`isBought: true`), the progress bar can be shown as 100% complete.

---

### 3.4 Get Exclusive Store Items

- **Path**: `GET /api/store/items/exclusive`
- **Access Control**: Any authenticated user

Returns items with `canUserBuyThis: false` across all categories.

---

### 3.5 Browse Store Items (Filterable by `canUserBuyThis`)

Returns items grouped by category, filtered by the `canUserBuyThis` flag.

- **Path**: `GET /api/store/items/browse`
- **Access Control**: Any authenticated user

#### Query Parameters

| Param | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `canUserBuyThis` | `string` (`"true"` \| `"false"`) | No | `"true"` | Filter by purchase availability |

#### Examples

- `GET /api/store/items/browse` — buyable items (default)
- `GET /api/store/items/browse?canUserBuyThis=true` — same as above
- `GET /api/store/items/browse?canUserBuyThis=false` — exclusive/grant-only items

#### Response (200 OK)

```json
{
  "success": true,
  "result": {
    "Accessories": [
      {
        "_id": "665a...",
        "name": "Cool Hat",
        "logo": "https://...",
        "categoryId": "664b...",
        "isPremium": false,
        "prices": [{ "validity": 30, "price": 100 }],
        "canUserBuyThis": true,
        "totalSold": 42
      }
    ],
    "Effects": []
  }
}
```

When `canUserBuyThis=true`, only non-premium items are returned (`isPremium: false`). When `canUserBuyThis=false`, all categories including premium are included. An empty result returns `{}`.

---

### 3.6 Get Store Items by Category

- **Path**: `GET /api/store/items/category/:category`
- **Access Control**: Any authenticated user

---

## Part 4: Bucket (User Inventory) Management

### 4.1 Buy Store Item

Purchases a store item and adds it to the user's inventory.

- **Path**: `POST /api/store/bucket`
- **Access Control**: Any authenticated user

#### Request Body

```json
{
  "itemId": "64f1a2b3c4d5e6f7a8b9c0d2",
  "priceIndex": 0
}
```

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `itemId` | `string` | Yes | MongoDB ObjectId of the store item to purchase |
| `priceIndex` | `number` | No | Index into the item's `prices` array. Defaults to `0` |

#### VIP/SVIP Purchase Block

Items in the VIP or SVIP category **cannot be purchased**. Attempting to buy one returns:

```json
{
  "status": "error",
  "message": "VIP/SVIP items can only be earned through monthly recharge milestones, not purchased directly."
}
```

This applies to both hardcoded category names ("VIP", "SVIP") and custom names configured via `vipCategoryName` / `svipCategoryName` in the premium config.

#### Response (200 OK)

```json
{
  "success": true,
  "result": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
    "itemId": "64f1a2b3c4d5e6f7a8b9c0d2",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "useStatus": false,
    "purchasedDate": "2026-05-20T10:00:00.000Z",
    "expireAt": "2026-06-19T10:00:00.000Z"
  },
  "message": "Item purchased successfully"
}
```

---

### 4.2 Equip / Unequip Item

Toggles the `useStatus` of a bucket item (equip or unequip).

- **Path**: `PUT /api/store/bucket`
- **Access Control**: Any authenticated user

#### Request Body

```json
{
  "bucketItemId": "64f1a2b3c4d5e6f7a8b9c0d3"
}
```

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `bucketItemId` | `string` | Yes | MongoDB ObjectId of the bucket entry to toggle |

#### Response (200 OK)

```json
{
  "success": true,
  "result": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
    "itemId": "64f1a2b3c4d5e6f7a8b9c0d2",
    "useStatus": true,
    "purchasedDate": "2026-05-20T10:00:00.000Z",
    "expireAt": "2026-06-19T10:00:00.000Z"
  },
  "message": "Item equipped successfully"
}
```

---

### 4.3 Get My Buckets (Inventory)

Returns all items in the user's inventory.

- **Path**: `GET /api/store/bucket`
- **Access Control**: Any authenticated user

---

### 4.4 Get My Buckets by Category

Returns items in the user's inventory filtered by category name.

- **Path**: `GET /api/store/bucket/category/:category`
- **Access Control**: Any authenticated user

---

### 4.5 Send Store Item to Another User

Sends a store item to another user's bucket. The sender pays the item's coin price, and the recipient receives the item in their inventory. If the recipient already owns the item, the expiry is renewed from the current date.

- **Path**: `POST /api/store/bucket/send`
- **Access Control**: Any authenticated user

#### Request Body

```json
{
  "recipientUserId": 100024,
  "itemId": "64f1a2b3c4d5e6f7a8b9c0d2",
  "priceIndex": 0
}
```

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `recipientUserId` | `number` | Yes | Recipient's numeric userId (short ID, min 100001) |
| `itemId` | `string` | Yes | MongoDB ObjectId of the store item to send |
| `priceIndex` | `number` | No | Index into the item's `prices` array. Defaults to `0` |

#### Behavior

- **Coins deducted from sender** — the sender's balance is reduced by the selected price option
- **Item granted to recipient** — a new bucket entry is created for the recipient with the selected validity period
- **Expiry renewal** — if the recipient already owns the item, the expiry is extended from the current date (not stacked on the existing expiry)
- **VIP/SVIP items blocked** — items in VIP or SVIP categories cannot be sent
- **Exclusive items blocked** — items with `canUserBuyThis: false` cannot be sent

#### Error Responses

| Status | Message | When |
| :--- | :--- | :--- |
| `400` | `Cannot send item to yourself` | Sender and recipient are the same user |
| `400` | `VIP/SVIP items cannot be sent to other users` | Item belongs to VIP/SVIP category |
| `400` | `This item is not available for purchase` | Item has `canUserBuyThis: false` |
| `400` | `Item has no pricing options` | Item has empty `prices` array |
| `400` | `Invalid price option selected` | `priceIndex` is out of bounds |
| `400` | `Insufficient coins. Required: X, available: Y` | Sender does not have enough coins |
| `404` | `Recipient not found` | No user found with the given `recipientUserId` |
| `404` | `Item not found` | No item found with the given `itemId` |

#### Response (200 OK)

Returns the store item document:

```json
{
  "success": true,
  "result": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
    "name": "Neon Frame",
    "categoryId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "prices": [
      { "validity": 30, "price": 5000 }
    ],
    "isPremium": false,
    "canUserBuyThis": true,
    "totalSold": 42
  }
}
```

---

## Part 5: Admin Grant Item

Grants an exclusive store item directly to a user's inventory without requiring purchase.

- **Path**: `POST /api/store/items/grant`
- **Access Control**: `Admin` or `SubAdmin`

#### Request Body

```json
{
  "itemId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "validity": 30
}
```

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `itemId` | `string` | Yes | MongoDB ObjectId of the store item to grant |
| `userId` | `string` | Yes | Target user's numeric userId |
| `validity` | `number` | Yes | Duration in days the item will be valid |

#### Response (200 OK)

Same shape as a bucket item:

```json
{
  "success": true,
  "result": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
    "itemId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "useStatus": true,
    "purchasedDate": "2026-05-20T10:00:00.000Z",
    "expireAt": "2026-06-19T10:00:00.000Z"
  },
  "message": "Item granted successfully"
}
```

---

## Part 6: Field Reference

### Item Object Fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | `string` | MongoDB ObjectId |
| `name` | `string` | Display name (e.g., "VIP-1", "SVIP-3") |
| `categoryId` | `string` | Category ObjectId |
| `prices` | `object[]` | Array of pricing options |
| `prices[].validity` | `number` | Duration in days |
| `prices[].price` | `number` | Price in coins |
| `privilege` | `string[]` | Privileges the item grants |
| `isPremium` | `boolean` | Whether this is a premium (batch) item |
| `canUserBuyThis` | `boolean` | Whether this item can be purchased. `false` = grant-only or VIP/SVIP-only |
| `isBought` | `boolean` | Whether the requesting user already owns this item |
| `tierNumber` | `number \| null` | Tier number for VIP/SVIP items. Used for dynamic matching with premium config at runtime. `null` for regular items. Settable via update endpoints. |
| `logo` | `string \| null` | Logo image URL |
| `svgaFile` | `string \| null` | SVGA animation URL |
| `previewFile` | `string \| null` | Preview image URL |

---

## Part 7: Key Error Responses

### 400 Bad Request — VIP/SVIP Purchase Block

```json
{
  "status": "error",
  "message": "VIP/SVIP items can only be earned through monthly recharge milestones, not purchased directly."
}
```

### 400 Bad Request — Insufficient Coins

```json
{
  "success": false,
  "message": "Insufficient coins"
}
```

---

## Part 8: Endpoints Summary

| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/store/categories` | Admin / SubAdmin | Create category |
| `GET` | `/api/store/categories` | Any authenticated | List categories |
| `GET` | `/api/store/categories/:id` | Any authenticated | Get category by ID |
| `PUT` | `/api/store/categories/:id` | Admin / SubAdmin | Update category |
| `DELETE` | `/api/store/categories/:id` | Admin / SubAdmin | Delete category |
| `GET` | `/api/store/categories/effected-items/:id` | Admin / SubAdmin | Preview items affected by category delete |
| `POST` | `/api/store/items/single` | Admin / SubAdmin | Create single item |
| `POST` | `/api/store/items/batch` | Admin / SubAdmin | Create batch (premium) item |
| `PUT` | `/api/store/items/single/:id` | Admin / SubAdmin | Update non-premium item (name, prices, tier, files) |
| `PUT` | `/api/store/items/batch/:id` | Admin / SubAdmin | Update premium item (VIP/SVIP — metadata + bundle files) |
| `GET` | `/api/store/items/:id` | Any authenticated | Get item by ID |
| `DELETE` | `/api/store/items/:id` | Admin / SubAdmin | Delete item |
| `GET` | `/api/store/items/effected-buckets/:itemId` | Admin / SubAdmin | Preview users who own an item |
| `PUT` | `/api/store/items/category/:category` | Admin / SubAdmin | Change item category |
| `GET` | `/api/store/items` | Any authenticated | All items grouped by category |
| `GET` | `/api/store/items/vip` | Any authenticated | VIP items (enriched with progress) |
| `GET` | `/api/store/items/svip` | Any authenticated | SVIP items (enriched with progress) |
| `GET` | `/api/store/items/exclusive` | Any authenticated | Exclusive (grant-only) items |
| `GET` | `/api/store/items/browse` | Any authenticated | Browse items filtered by `canUserBuyThis` |
| `GET` | `/api/store/items/category/:category` | Any authenticated | Items by category name |
| `POST` | `/api/store/items/grant` | Admin / SubAdmin | Grant item to user |
| `POST` | `/api/store/bucket` | Any authenticated | Buy store item |
| `POST` | `/api/store/bucket/send` | Any authenticated | Send store item to another user |
| `PUT` | `/api/store/bucket` | Any authenticated | Equip/unequip item |
| `GET` | `/api/store/bucket` | Any authenticated | View inventory |
| `GET` | `/api/store/bucket/category/:category` | Any authenticated | View inventory by category |
| `GET` | `/api/store/privileges` | Admin / SubAdmin | List available privileges |

---

## Part 9: Implementation Notes

- **Premium tier matching**: VIP and SVIP store items are matched to premium config tiers via the `tierNumber` field on the store item and the category name. No `storeItemId` is stored in the config — items are found dynamically at runtime by `categoryId + tierNumber`.
- **VIP/SVIP purchase block**: Items in VIP or SVIP categories (including custom names configured via `vipCategoryName`/`svipCategoryName`) cannot be purchased directly. They are earned exclusively through the monthly recharge milestone system.
- **`canUserBuyThis`**: Items with `canUserBuyThis: false` are grant-only (delivered via the grant endpoint or VIP/SVIP auto-grant system)
- **Purchase flow**: When buying, the selected `priceIndex` determines the price and validity period. The user's coins are deducted atomically inside a MongoDB transaction
- **Enriched store listings**: Both VIP and SVIP item listings include `monthEnd`, `rechargeRequired`, and `currentRechargeAmount` fields for rendering progress bars and countdown timers in the frontend
- **Send store item**: When sending a store item to another user, if the recipient already owns it, the expiry is renewed from the current date (not stacked). VIP/SVIP and exclusive items cannot be sent.
