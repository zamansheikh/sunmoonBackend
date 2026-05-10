# Referral System Documentation

This document provides details on the Referral Configuration APIs for the Adda Live platform.

## Base URL
`/api/referral`

## Authentication
All admin routes require a valid JWT token with `Admin` role privileges.

---

## Referral Configuration APIs

### 1. Get Referral Configuration
Retrieves the global referral settings.

- **URL**: `/config`
- **Method**: `GET`
- **Auth required**: YES (Admin)
- **Success Response**:
  - **Code**: 200 OK
  - **Content**:
    ```json
    {
      "success": true,
      "result": {
        "_id": "60d...",
        "inviteReward": 100,
        "rechargeThreshold": 500,
        "rechargeReward": 50,
        "giftCommissionPercentage": 10,
        "createdAt": "2023-...",
        "updatedAt": "2023-..."
      },
      "message": "Referral configuration retrieved successfully."
    }
    ```

### 2. Create or Update Referral Configuration
Creates the configuration if it doesn't exist, or updates it if it does. This maintains a singleton configuration document.

- **URL**: `/config`
- **Method**: `POST`
- **Auth required**: YES (Admin)
- **Data Params**:
  ```json
  {
    "inviteReward": 100,
    "rechargeThreshold": 500,
    "rechargeReward": 50,
    "giftCommissionPercentage": 10
  }
  ```
- **Success Response**:
  - **Code**: 200 OK
  - **Content**: Same as GET response.

### 3. Update Referral Configuration (Partial)
Updates specific fields of the configuration by ID.

- **URL**: `/config/:id`
- **Method**: `PUT`
- **Auth required**: YES (Admin)
- **URL Params**: `id=[string]` (The MongoDB ID of the config)
- **Data Params**:
  ```json
  {
    "inviteReward": 150
  }
  ```
- **Success Response**:
  - **Code**: 200 OK
  - **Content**: Same as GET response.

### 4. Delete Referral Configuration
Deletes the referral configuration by ID.

- **URL**: `/config/:id`
- **Method**: `DELETE`
- **Auth required**: YES (Admin)
- **URL Params**: `id=[string]`
- **Success Response**:
  - **Code**: 200 OK
  - **Content**:
    ```json
    {
      "success": true,
      "result": null,
      "message": "Referral configuration deleted successfully."
    }
    ```

---

## Validation Rules

### Referral Configuration Object
| Field | Type | Required | Rules |
| :--- | :--- | :--- | :--- |
| `inviteReward` | Number | Yes (POST) | Must be >= 0 |
| `rechargeThreshold` | Number | Yes (POST) | Must be >= 0 |
| `rechargeReward` | Number | Yes (POST) | Must be >= 0 |
| `giftCommissionPercentage` | Number | Yes (POST) | Must be 0-100 |

## Error Responses
Standard error response format:
```json
{
  "success": false,
  "message": "Detailed error message"
}
```
Common status codes:
- `400 Bad Request`: Missing fields or validation failed.
- `401 Unauthorized`: No token provided or invalid token.
- `403 Forbidden`: User does not have Admin role.
