# Level Tags API Documentation

The **Level Tags API** stores tag images associated with specific user levels. Each level can have one tag — files are uploaded to Nimbus and the URL is stored in the database.

---

## Table of Contents

- [Authentication & Request Format](#authentication--request-format)
- [Endpoints](#endpoints)
- [Create Level Tag](#1-create-level-tag)
- [List All Level Tags](#2-list-all-level-tags)
- [Get Level Tag by ID](#3-get-level-tag-by-id)
- [Update Level Tag](#4-update-level-tag)
- [Error Responses](#error-responses)
- [Data Model Reference](#data-model-reference)
- [File Structure Reference](#file-structure-reference)

---

## Authentication & Request Format

- **Base URL**: `/api/level-tags`
- **Headers**:
  ```http
  Authorization: Bearer <your_jwt_token_here>
  Content-Type: multipart/form-data  (for create/update with file)
  Content-Type: application/json      (for read operations)
  ```
- **Access Control**:
  - **Admin/SubAdmin** role required for `POST` and `PUT`
  - **Any authenticated user** for `GET` operations

---

## Endpoints

| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/level-tags` | Admin/SubAdmin | Create a new level tag (with file upload to Nimbus) |
| `GET` | `/api/level-tags` | Any authenticated | List all level tags (sorted by level ascending) |
| `GET` | `/api/level-tags/:id` | Any authenticated | Get a single level tag by ID |
| `PUT` | `/api/level-tags/:id` | Admin/SubAdmin | Update a level tag (level and/or file, both optional) |

---

## 1. Create Level Tag

Creates a new level tag. The `level` must be unique — only one tag per level is allowed.

- **Path**: `POST /api/level-tags`
- **Content-Type**: `multipart/form-data`

### Form Fields

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `level` | `number` | Yes | The level this tag belongs to (must be unique) |
| `tagFile` | `file` | Yes | Tag image file (uploaded to Nimbus) |

### Response (201 Created)

```json
{
  "success": true,
  "result": {
    "_id": "665a1b2c3d4e5f6a7b8c9d0e",
    "level": 5,
    "tagFile": "https://capi.tecsior.com/.../level_tag_abc123.png",
    "tagFileId": "nim_asset_abc123",
    "createdAt": "2026-05-26T10:00:00.000Z",
    "updatedAt": "2026-05-26T10:00:00.000Z"
  },
  "message": "Level tag created successfully"
}
```

### Error Responses

**409 Conflict — Duplicate level**
```json
{
  "success": false,
  "message": "Level 5 already has a tag"
}
```

**400 Bad Request — Missing required fields**
```json
{
  "success": false,
  "message": "level is required"
}
```

```json
{
  "success": false,
  "message": "tagFile is required"
}
```

---

## 2. List All Level Tags

Returns all level tags sorted by `level` in ascending order.

- **Path**: `GET /api/level-tags`

### Response (200 OK)

```json
{
  "success": true,
  "result": [
    {
      "_id": "665a1b2c3d4e5f6a7b8c9d0e",
      "level": 1,
      "tagFile": "https://capi.tecsior.com/.../level_tag_001.png",
      "tagFileId": "nim_asset_001",
      "createdAt": "2026-05-26T10:00:00.000Z",
      "updatedAt": "2026-05-26T10:00:00.000Z"
    },
    {
      "_id": "665a1b2c3d4e5f6a7b8c9d0f",
      "level": 5,
      "tagFile": "https://capi.tecsior.com/.../level_tag_005.png",
      "tagFileId": "nim_asset_005",
      "createdAt": "2026-05-26T10:00:00.000Z",
      "updatedAt": "2026-05-26T10:00:00.000Z"
    }
  ],
  "message": "Level tags retrieved successfully"
}
```

---


## 3. Get Level Tag by ID

- **Path**: `GET /api/level-tags/:id`

### Response (200 OK)

```json
{
  "success": true,
  "result": {
    "_id": "665a1b2c3d4e5f6a7b8c9d0e",
    "level": 5,
    "tagFile": "https://capi.tecsior.com/.../level_tag_005.png",
    "tagFileId": "nim_asset_005",
    "createdAt": "2026-05-26T10:00:00.000Z",
    "updatedAt": "2026-05-26T10:00:00.000Z"
  },
  "message": "Level tag retrieved successfully"
}
```

### Error Responses

**404 Not Found**
```json
{
  "success": false,
  "message": "Level tag not found"
}
```

---

## 4. Update Level Tag

Updates a level tag. Both `level` and `tagFile` are optional — only provided fields are updated. If a new file is uploaded, the old Nimbus asset is deleted and the new one is uploaded.

- **Path**: `PUT /api/level-tags/:id`
- **Content-Type**: `multipart/form-data`

### Form Fields

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `level` | `number` | No | Updated level (must remain unique across all tags) |
| `tagFile` | `file` | No | New tag image (replaces existing Nimbus file) |

At least one field must be provided.

### Response (200 OK)

```json
{
  "success": true,
  "result": {
    "_id": "665a1b2c3d4e5f6a7b8c9d0e",
    "level": 10,
    "tagFile": "https://capi.tecsior.com/.../level_tag_new789.png",
    "tagFileId": "nim_asset_new789",
    "createdAt": "2026-05-26T10:00:00.000Z",
    "updatedAt": "2026-05-27T10:00:00.000Z"
  },
  "message": "Level tag updated successfully"
}
```

### Error Responses

**404 Not Found**
```json
{
  "success": false,
  "message": "Level tag not found"
}
```

**409 Conflict — New level already taken by another tag**
```json
{
  "success": false,
  "message": "Level 10 already has a tag"
}
```

---

## Error Responses

| Status | Message | Cause |
| :--- | :--- | :--- |
| `400` | `level is required` | Missing `level` field in create |
| `400` | `tagFile is required` | Missing `tagFile` file in create |
| `404` | `Level tag not found` | Invalid ID or tag does not exist |
| `409` | `Level X already has a tag` | Duplicate level on create or update |

---

## Data Model Reference

### MongoDB Collection: `level_tags`

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | `ObjectId` | MongoDB unique identifier |
| `level` | `number` | Level this tag belongs to (unique index) |
| `tagFile` | `string` | Nimbus URL of the tag image |
| `tagFileId` | `string` | Nimbus asset `_id` (used for deletion on update) |
| `createdAt` | `Date` | Timestamp from Mongoose `timestamps: true` |
| `updatedAt` | `Date` | Timestamp from Mongoose `timestamps: true` |

### Nimbus Integration

- **Upload**: `uploadFileToNimbus({ file })` — returns `{ _id, url }`
- **Delete**: `deleteFileFromNimbus(assetId)` — called before re-upload on update
- **No folder specified** — assets stored in default Nimbus location

---

## File Structure Reference

```
src/
├── models/levelTag/
│   └── level_tag_model.ts           # Mongoose schema (level, tagFile, tagFileId)
├── repository/levelTag/
│   └── level_tag_repository.ts      # CRUD + findByLevel()
├── services/levelTag/
│   └── level_tag_service.ts         # Business logic + Nimbus integration
├── controllers/levelTag/
│   └── level_tag_controller.ts      # Request validation + response formatting
├── router/
│   └── level_tag_routes.ts          # Standalone router mounted at /api/level-tags
└── server.ts                        # app.use("/api/level-tags", LevelTagRouter)
```

### Modified Files

| File | Change |
| :--- | :--- |
| `src/core/Utils/enums.ts` | Added `LevelTags = "level_tags"` to `DatabaseNames` |
| `src/server.ts` | Added import and mount for `LevelTagRouter` |
