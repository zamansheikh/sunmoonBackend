# Store System API Documentation

The **Store System** provides a complete in-app store experience with categories, items (single-use and batch/premium), pricing, privileges, and user inventory management (buckets). It supports grouping items by category, multiple pricing options per item, and exclusive grant-only items.

This system consists of:

1. **Category Management** — Admin CRUD for store categories
2. **Item Management** — Admin CRUD for single and batch items
3. **Item Browsing** — Public endpoints for browsing items by category, VIP, SVIP, exclusive, or filtered by `canUserBuyThis`
4. **Bucket Management** — User purchase, equipping, and inventory listing
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

**SVIP Name Auto-Sync**: If the item name starts with `"SVIP-"` (e.g., `"SVIP-3"`), the SVIP configuration is automatically updated to link this item's `_id` and price to the corresponding tier.

#### Response (201 Created)

Same shape as single item, with `isPremium: true`.

---

### 2.3 Update Single Item

- **Path**: `PUT /api/store/items/single/:id`
- **Access Control**: `Admin` or `SubAdmin`
- **Content-Type**: `multipart/form-data`

All fields optional (partial update).

---

### 2.4 Update Batch Item

- **Path**: `PUT /api/store/items/batch/:id`
- **Access Control**: `Admin` or `SubAdmin`
- **Content-Type**: `multipart/form-data`

**SVIP Auto-Sync Behavior**:
- If the item name starts with `"SVIP-"`, the SVIP config tier's `storeItemId` and `milestoneCoins` are automatically updated
- If the item is renamed from an SVIP name to a non-SVIP name, the config reference is cleared

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

**SVIP Auto-Sync**: If the deleted item is an SVIP item, the config tier's `storeItemId` is set to `null`.

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

Returns items in the "VIP" category.

---

### 3.3 Get SVIP Store Items

- **Path**: `GET /api/store/items/svip`
- **Access Control**: Any authenticated user

Returns items in the "SVIP" category. Each item has `canUserBuyThis: false` and `isBought` reflects whether the user has earned that tier via monthly recharge.

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

#### SVIP Purchase Block

Items in the "SVIP" category **cannot be purchased**. Attempting to buy one returns:

```json
{
  "status": "error",
  "message": "SVIP items can only be earned through monthly recharge milestones, not purchased directly."
}
```

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
| `canUserBuyThis` | `boolean` | Whether this item can be purchased. `false` = grant-only or SVIP-only |
| `isBought` | `boolean` | Whether the requesting user already owns this item |
| `logo` | `string \| null` | Logo image URL |
| `svgaFile` | `string \| null` | SVGA animation URL |
| `previewFile` | `string \| null` | Preview image URL |

---

## Part 7: Key Error Responses

### 400 Bad Request — SVIP Purchase Block

```json
{
  "status": "error",
  "message": "SVIP items can only be earned through monthly recharge milestones, not purchased directly."
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
| `PUT` | `/api/store/items/single/:id` | Admin / SubAdmin | Update single item |
| `PUT` | `/api/store/items/batch/:id` | Admin / SubAdmin | Update batch item |
| `GET` | `/api/store/items/:id` | Any authenticated | Get item by ID |
| `DELETE` | `/api/store/items/:id` | Admin / SubAdmin | Delete item |
| `GET` | `/api/store/items/effected-buckets/:itemId` | Admin / SubAdmin | Preview users who own an item |
| `PUT` | `/api/store/items/category/:category` | Admin / SubAdmin | Change item category |
| `GET` | `/api/store/items` | Any authenticated | All items grouped by category |
| `GET` | `/api/store/items/vip` | Any authenticated | VIP items |
| `GET` | `/api/store/items/svip` | Any authenticated | SVIP items |
| `GET` | `/api/store/items/exclusive` | Any authenticated | Exclusive (grant-only) items |
| `GET` | `/api/store/items/browse` | Any authenticated | Browse items filtered by `canUserBuyThis` |
| `GET` | `/api/store/items/category/:category` | Any authenticated | Items by category name |
| `POST` | `/api/store/items/grant` | Admin / SubAdmin | Grant item to user |
| `POST` | `/api/store/bucket` | Any authenticated | Buy store item |
| `PUT` | `/api/store/bucket` | Any authenticated | Equip/unequip item |
| `GET` | `/api/store/bucket` | Any authenticated | View inventory |
| `GET` | `/api/store/bucket/category/:category` | Any authenticated | View inventory by category |
| `GET` | `/api/store/privileges` | Admin / SubAdmin | List available privileges |

---

## Part 9: Implementation Notes

- **SVIP Auto-Sync**: When creating/updating/deleting batch items with names starting with `"SVIP-"`, the SVIP config is automatically synchronized — `storeItemId` and `milestoneCoins` are updated accordingly
- **Pricing validation**: Names starting with `VIP` or `SVIP` must have a valid numeric suffix (e.g., `VIP-1`, `SVIP-2`). Valid levels are `1` and `2` only for VIP; SVIP supports tiers 1–9
- **`canUserBuyThis`**: Items with `canUserBuyThis: false` are grant-only (delivered via the grant endpoint or SVIP auto-grant system)
- **Purchase flow**: When buying, the selected `priceIndex` determines the price and validity period. The user's coins are deducted atomically inside a MongoDB transaction
