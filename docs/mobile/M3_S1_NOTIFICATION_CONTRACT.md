# M3/S1 Notification API Contract (Server)

Scope: Notification preference data shape and app push token registration/unregistration.

Base path: `/api/notifications`
Auth: `Authorization: Bearer <access_token>` (same auth middleware as existing protected routes)

## 1) Read notification preferences

`GET /api/notifications/preferences`

Response `200`:

```json
{
  "notificationPreferences": {
    "inAppEnabled": true,
    "pushEnabled": true,
    "bookingConfirmation": true,
    "bookingCancellation": true,
    "newBookingRequest": true,
    "newMessage": true,
    "marketingUpdates": true
  },
  "emailPreferences": {
    "bookingConfirmation": true,
    "bookingCancellation": true,
    "newBookingRequest": true,
    "newMessage": true,
    "welcomeEmail": true
  }
}
```

## 2) Update notification preferences

`PUT /api/notifications/preferences`

Request body:

```json
{
  "preferences": {
    "pushEnabled": false,
    "newMessage": false
  }
}
```

Response `200`:

```json
{
  "message": "Notification preferences updated successfully",
  "notificationPreferences": {
    "inAppEnabled": true,
    "pushEnabled": false,
    "bookingConfirmation": true,
    "bookingCancellation": true,
    "newBookingRequest": true,
    "newMessage": false,
    "marketingUpdates": true
  }
}
```

Notes:
- Only boolean keys in the allowed notification preference set are accepted.
- Existing email preference behavior is unchanged and remains under `/api/email-preferences`.

## 3) Register app push token

`POST /api/notifications/device-tokens/register`

Request body:

```json
{
  "token": "fcm-or-apns-token",
  "platform": "android",
  "provider": "fcm",
  "deviceId": "device-123",
  "appVersion": "1.0.0"
}
```

Response `200`:

```json
{
  "message": "Push token registered successfully",
  "token": {
    "token": "fcm-or-apns-token",
    "platform": "android",
    "provider": "fcm",
    "deviceId": "device-123",
    "appVersion": "1.0.0",
    "createdAt": "2026-03-07T10:00:00.000Z",
    "lastSeenAt": "2026-03-07T10:00:00.000Z"
  },
  "totalTokens": 1
}
```

## 4) Unregister app push token

`DELETE /api/notifications/device-tokens/unregister`

Request body (token + platform variant):

```json
{
  "token": "fcm-or-apns-token",
  "platform": "android"
}
```

Response `200`:

```json
{
  "message": "Push token unregistered successfully",
  "removedCount": 1,
  "totalTokens": 0
}
```

Alternative request body:

```json
{
  "deviceId": "device-123"
}
```

## 5) List current push token bindings

`GET /api/notifications/device-tokens`

Response `200`:

```json
{
  "tokens": [
    {
      "token": "fcm-or-apns-token",
      "platform": "android",
      "provider": "fcm",
      "deviceId": "device-123",
      "appVersion": "1.0.0",
      "createdAt": "2026-03-07T10:00:00.000Z",
      "lastSeenAt": "2026-03-07T10:00:00.000Z"
    }
  ]
}
```
