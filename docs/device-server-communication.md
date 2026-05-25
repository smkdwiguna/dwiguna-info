# Device ↔ Server Communication (ESP32)

This document defines the **exact** protocol used by ESP32 terminals to talk with the server. It is written to be implementable without ambiguity.

## 1. Provisioning (required)

Each terminal must exist in the `terminals` table with:

- `id`: device identifier (use MAC or UUID). The device id is provided in the request path (e.g. `/api/device/{deviceId}`).
- `password`: shared secret for HMAC signing (stored in `terminals.password`).

Example insert (D1):

```sql
INSERT INTO terminals (id, name, status, password)
VALUES ('ESP32-ROOM-1', 'Lab 1', 'INHERIT', 'super-secret-key');
```

## 2. Authentication

Every device request **must** include these headers:

- `X-Timestamp`: Unix epoch **seconds** (string, required)
- `X-Nonce`: random string (required, unique per request)
- `X-Signature`: HMAC-SHA256 in **hex** (lowercase hex, required)

Note: the device id is taken from the request path (`/api/device/{deviceId}`) and should not be sent as a header.

### 2.1 Signature payload

The **exact** payload to sign is:

```
DEVICE_ID\nTIMESTAMP\nNONCE\nBODY
```

Where:

- `DEVICE_ID` = the terminal's own `id` (same as the path parameter)
- `TIMESTAMP` = value of `X-Timestamp`
- `NONCE` = value of `X-Nonce`
- `BODY` = raw request body string (empty string if body is empty)

### 2.2 Signature algorithm

```
signature = HMAC_SHA256(password, payload)
```

Return **hex lowercase** string in `X-Signature`.

### 2.3 Replay protection

Server rules:

- `X-Timestamp` must be within **±300 seconds**.

## 3. Protocol (single payload)

All device payloads are **plain text** (no JSON). Each request/response contains **exactly one** command string:

```
CODE;field1;field2;...
```

Rules:

- No URL encoding. **Do not include** `;` or newlines in fields.
- Only `templateHex` may be large; all other fields are short.

### 3.1 Command codes

| Code | Name    | Direction       | Fields               | Description                                                |
| ---- | ------- | --------------- | -------------------- | ---------------------------------------------------------- |
| `0`  | Idle    | Server → Device | —                    | No pending command.                                        |
| `1`  | Open    | Server → Device | —                    | Set relay/gate to open state.                              |
| `2`  | Enroll  | Server → Device | `fid`                | Start fingerprint enrollment for the given user ID.        |
| `3`  | Copy    | Server → Device | `fid`, `templateHex` | Store a fingerprint template into device memory.           |
| `4`  | Fetch   | Server → Device | `fid`                | Request the device to upload its stored template.          |
| `5`  | Remove  | Server → Device | `fid`                | Delete a stored fingerprint from device memory.            |
| `6`  | Empty   | Server → Device | —                    | Wipe all fingerprints from device memory.                  |
| `7`  | Success | Server → Device | `name`, `photoHex`   | Display user info (name and photo) after identification.   |
| `8`  | Search  | Device → Server | `fid`                | Device identified a fingerprint; server responds with `7`. |
| `9`  | Upload  | Device → Server | `fid`, `templateHex` | Device uploads an enrolled template to the server.         |
| `A`  | Ack     | Device → Server | (optional)           | Acknowledge: the current command was executed.             |

## 4. Endpoint

**POST** `/api/device/{deviceId}`

This is the **only** endpoint. All communication happens here. Devices poll by sending a POST request. The server processes any events in the request body and returns the current pending command or appropriate response.

**Headers:** auth headers as described in section 2.

**Request body (one line per event, plain text):**

```
A
8;12
9;12;(templateHex)
```

Rules:

- `A` = Acknowledge. Tells the server that the current command was executed successfully. The server clears the pending command (`metadata`). If a sync is in progress, the server advances to the next fingerprint in the queue.
- `8;{fid}` = Search result. The device identified fingerprint `fid`. The server will respond with `7;{name};{photoHex}` for that same HTTP request.
- `9;{fid};{templateHex}` = Upload. The device uploads an enrolled fingerprint template. The server stores it in the `device_users` table.

**Response 200 (plain text):**

The response body is always a single command string. Examples:

```
0;
1;
2;12
3;12;(templateHex)
4;12
5;12
6
7;Budi Santoso;(photoHex)
```

## 5. How to set a command (server side)

The `terminals.metadata` column **strictly** contains the raw plain text command string that is served directly to the device on its next poll. There is **no JSON** in this column.

Examples of valid `metadata` values:

| Scenario                       | `metadata` value          |
| ------------------------------ | ------------------------- |
| No pending command             | `NULL` (empty)            |
| Enroll fingerprint for user 23 | `23`                      |
| Copy fingerprint to device     | `12;(templateHex)`        |
| Remove fingerprint for user 5  | `5`                       |
| Display user info after search | `Budi Santoso;(photoHex)` |
| Open gate                      | `NULL` (empty)            |

When the device sends `A` (Ack), the server clears `metadata` to `NULL`.

## 6. Additional terminal columns

The `terminals` table has dedicated columns for connection status and sync features:

### `timeout` — Last Seen Timestamp

Stores the Unix epoch timestamp (seconds) of the last time the device polled the server. Updated automatically on every POST request. The dashboard uses this to display an **Online** (green dot) or **Offline** (red dot) indicator:

- **Online**: `(now - timeout) ≤ 120 seconds` (2 minutes)
- **Offline**: `(now - timeout) > 120 seconds` or `timeout` is `0`/`NULL`

### `syncQueue` — Fingerprint Sync Queue

Stores a JSON array of user IDs (fid numbers) to be synchronized to the device. Example:

```json
[24, 25, 26, 30, 45]
```

**Sync workflow:**

1. Admin clicks the **sync button** (🔄) on a terminal in the dashboard.
2. The server collects all user IDs that have fingerprint data and writes them to `syncQueue`.
3. On the next device poll, if `metadata` is empty and `syncQueue` has items:
   - The server pops the **first** fid from the queue.
   - Looks up the user's fingerprint from `device_users`.
   - Sets `metadata` to `3;{fid};{templateHex}` (Copy command).
4. The device receives `3;{fid};{templateHex}`, stores the fingerprint, and sends `A` (Ack).
5. On the next poll, the server sees the Ack, clears `metadata`, removes the completed fid from the queue, and repeats step 3 with the next fid.
6. If the device **fails** or disconnects mid-sync, the command remains in `metadata` and will be retried on the next poll. The queue does not advance until the device acknowledges.
7. Users without fingerprint data are automatically skipped.
8. When `syncQueue` is empty, normal operation resumes.

## 7. Error responses

All errors are plain text:

```
ERR;Message
```

Common status codes:

- `401` Missing/invalid auth, stale timestamp, signature mismatch.
- `400` Invalid body or malformed events.
- `500` Server/database error.

## 8. ESP32 signing example (pseudo‑C++)

```cpp
String deviceId = "ESP32-ROOM-1";
String timestamp = String(nowEpochSeconds);
String nonce = randomNonce();
String body = payloadText; // exact string sent in HTTP body

String payload = deviceId + "\n" + timestamp + "\n" + nonce + "\n" + body;
String signature = hmac_sha256_hex(devicePassword, payload);

setHeader("X-Timestamp", timestamp);
setHeader("X-Nonce", nonce);
setHeader("X-Signature", signature);

httpPost("https://example.com/api/device/" + deviceId, body);
```

## 9. NTP time synchronization

The device clock **must** stay accurate for HMAC signature validation. Use NTP to synchronize time:

```cpp
#include <WiFi.h>
#include <time.h>

// Call once after WiFi connects
void setupNTP() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  // Wait for time to sync
  struct tm timeinfo;
  while (!getLocalTime(&timeinfo)) {
    delay(500);
  }
}
```

**For long-running devices**, re-sync periodically to prevent clock drift:

```cpp
// Call this every 6-12 hours (e.g. in loop() with a millis() check)
void resyncNTP() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
}

unsigned long lastNtpSync = 0;
const unsigned long NTP_INTERVAL = 6UL * 60 * 60 * 1000; // 6 hours

void loop() {
  if (millis() - lastNtpSync > NTP_INTERVAL) {
    resyncNTP();
    lastNtpSync = millis();
  }
  // ... rest of your polling logic
}
```

**Important:** ESP32's internal RTC can drift ~1-2 seconds per hour. Without periodic NTP re-sync, after 24+ hours the timestamp will be rejected by the server (±300 second window). A 6-hour re-sync interval is safe.

## 10. Notes & recommendations

- **TLS** is strongly recommended. ESP32 can pin the **root CA** or the **SHA‑256 cert fingerprint**.
- If network is unstable, retry with exponential backoff.
- Keep device clock synced (NTP) to pass timestamp validation (see section 9).
- Compression is **not required** (small payloads).
