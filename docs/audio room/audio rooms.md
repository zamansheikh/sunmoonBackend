# Audio Room API Documentation

## Mute / Unmute Seat

This API allows the room owner (host) to toggle the mute state of any seat in an audio room. When a seat is muted, any user sitting on that seat is muted. When they leave, the seat remains muted, but the user is unmuted.

* **Route**: `/api/audio-rooms/:roomId/mute-unmute-seat/:seatKey`
* **Method**: `PUT`
* **Headers**: 
  * `Authorization`: `Bearer <token>` (Required)
* **Access Control**: Room Host (Owner) only.

### Path Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `roomId` | `string` | The unique ID of the audio room. |
| `seatKey` | `string` | The target seat identifier (e.g. `seat-1`, `seat-2`, ..., or `hostSeat`). |

### Request Body
None.

---

### Response (200 OK)

Returns the updated audio room document.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Seat mute status updated successfully",
  "result": {
    "_id": "60d5ec49f1b2c51f4c8b4567",
    "roomId": "room_123",
    "title": "Welcome to my room!",
    "numberOfSeats": 8,
    "hostSeat": {
      "available": true,
      "isMute": false
    },
    "seats": {
      "seat-1": {
        "available": true,
        "isMute": true
      },
      "seat-2": {
        "available": true,
        "isMute": false
      }
    },
    "hostId": "60d5ec49f1b2c51f4c8b4568",
    "membersCount": 1,
    ...
  }
}
```

---

### Error Responses

#### 403 Forbidden (Non-Host Access)
Returned if the requester is not the room host.
```json
{
  "success": false,
  "statusCode": 403,
  "message": "You are not authorized to take this action"
}
```

#### 404 Not Found (Invalid Room or Seat)
Returned if the room or seat key does not exist.
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Seat not found"
}
```

---

### WebSocket Real-time Events

Toggling the mute state of a seat automatically broadcasts two WebSocket events to all participants currently joined to the room:

1. **`BasicRoomUpdate`**:
   * **Payload**:
     ```json
     {
       "seats": {
         "seat-1": { "available": true, "isMute": true },
         "seat-2": { "available": true, "isMute": false }
         ...
       }
     }
     ```
2. **`RoomData`**:
   * **Payload**: Serialized room details containing the updated seats map.

---

## Socket Message Events — svipItem & vipItem Fields

Room messages and member details now carry optional `svipItem` and `vipItem` data for the sender, displaying their purchased/earned SVIP and VIP store items.

### `IRoomMessage` — Sent via `AudioRoomChannels.AudioRoomMessage`

```json
{
  "senderId": "...",
  "senderName": "...",
  "senderAvatar": "...",
  "text": "Hello!",
  "equippedStoreItems": { ... },
  "svipItem": {
    "name": "SVIP-2",
    "logo": "https://..."
  },
  "vipItem": {
    "name": "VIP-1",
    "logo": "https://..."
  }
}
```

### `IMemberDetails` — Sent during room join/seat updates

Same new fields on the member object:

```json
{
  "_id": "...",
  "name": "...",
  "avatar": "...",
  "equippedStoreItems": { ... },
  "svipItem": { "name": "...", "logo": "..." },
  "vipItem": { "name": "...", "logo": "..." }
}
```

**Note**: These fields will always be present as objects (never undefined), but their inner fields may be `null` if the user hasn't purchased/earned anything.
