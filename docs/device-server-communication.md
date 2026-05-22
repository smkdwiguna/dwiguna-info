# Device ↔ Server Communication (ESP32)

This document defines the **exact** protocol used by ESP32 terminals to talk with the server. It is written to be implementable without ambiguity.

## 1. Provisioning (required)

Each terminal must exist in the `terminals` table with:
- `id`: device identifier (use MAC or UUID). The device id is provided in the request path (e.g. `/api/device/{deviceId}`).
- `secret`: shared secret for HMAC signing (stored in `terminals.password`).

Example insert (D1):
```
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
METHOD\nPATHNAME\nTIMESTAMP\nNONCE\nBODY
```

Where:
- `METHOD` = uppercase HTTP method (`GET`, `POST`)
- `PATHNAME` = URL path only (example: `/api/device/ESP32-ROOM-1`)
- `TIMESTAMP` = value of `X-Timestamp`
- `NONCE` = value of `X-Nonce`
- `BODY` = raw request body string (empty string for GET)

### 2.2 Signature algorithm

```
signature = HMAC_SHA256(secret, payload)
```

Return **hex lowercase** string in `X-Signature`.

### 2.3 Replay protection

Server rules:
- `X-Timestamp` must be within **±300 seconds**.
- `X-Nonce` must be **unique** for the device within the last **300 seconds**.
  Reuse is rejected with `401`.

## 3. Protocol (single payload)

All device payloads are **plain text** (no JSON). Each request/response contains **exactly one** legacy command string:
```
CODE;field1;field2;...
```

Rules:
- No URL encoding. **Do not include** `;` or newlines in fields.
- Only `templateHex` may be large; all other fields are numeric.

### 3.1 Command codes (legacy compatible)

- `0` close
- `1` open
- `2` enroll (requires `fid`)
- `3` copy (requires `fid`, `templateHex`)
- `4` fetch (requires `fid`)
- `5` remove (requires `fid`)
- `6` empty
- `7` success (requires `name`, optional `photoHex`)

## 4. Endpoint (single endpoint mode)

POST `/api/device/{deviceId}`

**Purpose:** Single lane for both sending device events and receiving the current command. Devices sign the POST as described in the auth section. The server will process any events in the request body and return the current pending command payload (a `CODE;...` string) in the POST response body (text/plain). Devices should poll by POSTing an empty body or include events to report; the response is the command to execute now.

**Headers:** (auth headers) — device id is taken from the path (no `X-Device-Id` header required).

**Body text (one line per event):**
```
A;cmd-1716360000
8;12
9;12;A1B2C3... (templateHex)
```

Rules:
- `A;{commandId}` clears `pendingCommand` **only** if it matches the command `id`.
- `A` or `A;` with no id clears any pending command.
- `8;{fid}` = searched. Server will set a `7;{name};{photoHex}` pending command which will be returned in the POST response on the next poll.
- `9;{fid};{templateHex}` = enrolled template (stored in DB).

**Response 200 (text):**
```
1;
```

Other examples:
```
2;12
3;12;A1B2C3... (templateHex)
4;12
5;12
6
7;Budi Santoso; (optional photoHex)
```

If no pending command:
```
0;
```

**How to set a command (server side):**  
Put `pendingCommand` into `terminals.metadata` JSON. Example:
```json
{
  "pendingCommand": { "id": "cmd-1716360000", "code": 2, "fid": 23 },
  "pendingCommandAt": 1716360000
}
```

## 5. Legacy endpoints (optional JSON)

These still exist for compatibility but are **not recommended** for new device code:

### GET `/api/device/schedule?date=YYYY-MM-DD`
### POST `/api/device/logs`

## 6. Error responses

All errors are text:
```
ERR;Message
```

Common status codes:
- `401` Missing/invalid auth, stale timestamp, reused nonce, signature mismatch.
- `400` Invalid JSON or invalid log entries.
- `500` Server/database error.

## 7. ESP32 signing example (pseudo‑C++)

```
String method = "POST";
String path = "/api/device/ESP32-ROOM-1";
String timestamp = String(nowEpochSeconds);
String nonce = randomNonce();
String body = payloadText; // exact string sent in HTTP body

String payload = method + "\n" + path + "\n" + timestamp + "\n" + nonce + "\n" + body;
String signature = hmac_sha256_hex(deviceSecret, payload);

setHeader("X-Device-Id", deviceId);
setHeader("X-Timestamp", timestamp);
setHeader("X-Nonce", nonce);
setHeader("X-Signature", signature);
```

## 8. Notes & recommendations

- **TLS** is strongly recommended. ESP32 can pin the **root CA** or the **SHA‑256 cert fingerprint**.
- If network is unstable, batch logs and retry with exponential backoff.
- Keep device clock synced (NTP) to pass timestamp validation.
- Compression is **not required** for logs (small payloads). If you want compression later, add `Content-Encoding: gzip` and implement server-side decompression first.
