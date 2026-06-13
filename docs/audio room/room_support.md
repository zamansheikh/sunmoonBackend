# Audio Room Level Criteria API

This API provides access to the goals and rewards for the Audio Room Support system. The GET endpoint is accessible by any authenticated user so clients can display level requirements and rewards. The POST and DELETE endpoints are restricted to admins.

**Base Path**: `/admin/room-level-criteria` (Note: Ensure this is mounted in your main server router)
**Authentication**:
- `GET /` — Any authenticated user (valid JWT token)
- `POST /`, `DELETE /:level` — Admin or SubAdmin token (`UserRoles.Admin`, `UserRoles.SubAdmin`)

---

## 1. Get All Level Criteria

Retrieves the complete list of configured levels from the database, sorted numerically.

- **URL**: `/`
- **Method**: `GET`
- **Auth Required**: YES (any authenticated user)

### Success Response

**Code**: `200 OK`
**Content example**:

```json
{
  "status": "success",
  "data": [
    {
      "level": 1,
      "roomVisitor": 2,
      "roomTransactions": 3000000,
      "totalRewardCoin": 420000,
      "ownerCoin": 330000,
      "partnerCoin": 90000,
      "numberOfPartners": 1
    },
    {
      "level": 2,
      "roomVisitor": 5,
      "roomTransactions": 6000000,
      "totalRewardCoin": 900000,
      "ownerCoin": 660000,
      "partnerCoin": 120000,
      "numberOfPartners": 2
    }
  ]
}
```

---

## 2. Create or Update Level (Upsert)

Creates a new level criteria or updates an existing one if the `level` number already exists. This operation triggers an immediate in-memory synchronization.

- **URL**: `/`
- **Method**: `POST`
- **Auth Required**: YES (Admin)
- **Data Params**:
  ```json
  {
    "level": 5,
    "roomVisitor": 150,
    "roomTransactions": 27000000,
    "totalRewardCoin": 3880000,
    "ownerCoin": 2800000,
    "partnerCoin": 270000,
    "numberOfPartners": 4
  }
  ```

### Success Response

**Code**: `200 OK`
**Content example**:

```json
{
  "status": "success",
  "data": {
    "_id": "663f7a2b1f4e3c001a2b3c4e",
    "level": 5,
    "roomVisitor": 150,
    "roomTransactions": 27000000,
    "totalRewardCoin": 3880000,
    "ownerCoin": 2800000,
    "partnerCoin": 270000,
    "numberOfPartners": 4
  }
}
```

---

## 3. Delete Level Criteria

Removes a specific level's configuration from the system and triggers an immediate in-memory synchronization.

- **URL**: `/:level`
- **Method**: `DELETE`
- **URL Params**: `level=[number]` (e.g., `/5`)
- **Auth Required**: YES (Admin)

### Success Response

**Code**: `200 OK`
**Content example**:

```json
{
  "status": "success",
  "data": {
    "level": 5,
    "message": "Level criteria deleted successfully"
  }
}
```

---
