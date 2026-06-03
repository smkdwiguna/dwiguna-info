# Device ↔ Server Communication (ESP32)

Dokumen ini mendefinisikan protokol yang dipakai terminal ESP32 untuk berkomunikasi dengan server. Tujuannya supaya implementasi di firmware dan server sama persis.

Untuk checklist implementasi firmware (chunked HTTP, decode foto, alur scan, debug umum), lihat juga [Catatan Tim Firmware / Hardware](device-firmware-team-notes.md).

## Provisioning

Setiap terminal harus ada di tabel `terminals` dengan:

- `id`: identitas device, biasanya MAC atau UUID.
- `password`: shared secret untuk HMAC signing.

Contoh insert di D1:

```sql
INSERT INTO terminals (id, name, status, password)
VALUES ('ESP32-ROOM-1', 'Lab 1', '0', 'super-secret-key-min-16-chars');
```

Secret perangkat wajib diatur saat provisioning (dashboard **Tambah Perangkat** atau kolom `password`). Minimal 16 karakter ASCII; dipakai sebagai kunci HMAC. Dashboard tidak menampilkan ulang secret setelah disimpan — gunakan tombol rotasi secret jika perlu.

## Authentication

Setiap request device harus membawa header berikut:

- `X-Timestamp`: Unix epoch dalam detik.
- `X-Nonce`: string acak yang unik per request.
- `X-Signature`: HMAC-SHA256 dalam hex lowercase.

Device id diambil dari path request `/api/device/{deviceId}`, bukan dari header.

### Payload Tanda Tangan

Payload yang ditandatangani harus persis seperti ini:

```text
DEVICE_ID
TIMESTAMP
NONCE
BODY
```

Dengan:

- `DEVICE_ID` = id terminal yang sama dengan path parameter.
- `TIMESTAMP` = nilai `X-Timestamp`.
- `NONCE` = nilai `X-Nonce`.
- `BODY` = raw request body, atau string kosong jika body kosong.

### Algoritma

```text
signature = HMAC_SHA256(password, payload)
```

Nilai signature harus dikirim sebagai hex lowercase di `X-Signature`.

### Replay Protection

- `X-Timestamp` harus berada dalam rentang ±300 detik dari waktu server.

## Protocol

Semua payload device adalah plain text, bukan JSON. Setiap request dan response hanya berisi satu command string.

```text
CODE;field1;field2;...
```

Aturan:

- Jangan melakukan URL encoding.
- Jangan memasukkan `;` atau newline di field.
- `templateHex` boleh panjang, field lain diharapkan pendek.

### Command Codes

| Code | Nama    | Arah            | Field                | Keterangan                                                 |
| ---- | ------- | --------------- | -------------------- | ---------------------------------------------------------- |
| `0`  | Idle    | Server → Device | -                    | Tidak ada command pending.                                 |
| `1`  | Open    | Server → Device | -                    | Buka relay atau gate.                                      |
| `2`  | Enroll  | Server → Device | `fid`                | Mulai enrollment fingerprint untuk user tertentu.          |
| `3`  | Copy    | Server → Device | `fid`, `templateHex` | Simpan template fingerprint ke memori device.              |
| `4`  | Fetch   | Server → Device | `fid`                | Minta device mengirim template yang tersimpan.             |
| `5`  | Remove  | Server → Device | `fid`                | Hapus fingerprint tertentu dari memori device.             |
| `6`  | Empty   | Server → Device | -                    | Hapus semua fingerprint dari device.                       |
| `7`  | Success | Server → Device | `name`, `photoHex`   | Tampilkan nama dan foto user setelah identifikasi. `photoHex` adalah JPEG persegi 120×120 px (quality ~72), di-encode sebagai byte hex lowercase. Jika foto Workspace tidak ada, server mengirim avatar inisial (latar warna deterministik + 1–2 huruf). |
| `8`  | Search  | Device → Server | `fid`                | Device menemukan fingerprint; server merespons dengan `7`. |
| `9`  | Upload  | Device → Server | `fid`, `templateHex` | Device mengirim template fingerprint hasil enrollment.     |
| `A`  | Ack     | Device → Server | opsional             | Menandakan command terakhir sudah dieksekusi.              |

## Endpoint

**POST** `/api/device/{deviceId}`

Ini satu-satunya endpoint device. Device melakukan polling dengan POST, server memproses event di body request, lalu mengembalikan command yang sedang pending atau response yang sesuai.

### Prioritas respons

1. Jika `terminals.status` bukan `0` / `INHERIT` (mis. enroll `2`, copy `3`, open `1`), **respons HTTP selalu perintah itu** (`{status};{metadata}`) sampai device mengirim `A`.
2. Event di body (mis. `8;fid` scan) tetap diproses sebagai efek samping jika relevan (mis. upload template `9`), tetapi **tidak menimpa** perintah pending di respons maupun di database.
3. Hanya jika tidak ada perintah pending: scan `8` → respons `7`, atau antrean `syncQueue` → promot `3`.
4. `A` mengosongkan `status` ke `0` dan `metadata` ke `NULL` (dan mengeluarkan head `syncQueue` jika perintah terakhir adalah `3`).

## Redesign Note

Model di atas adalah implementasi yang sekarang berjalan di server. Untuk arah baru, komunikasi sebaiknya digeser ke event-driven, bukan polling periodik.

Target perubahan yang sedang dipertimbangkan:

- Device hanya kirim request saat ada event fingerprint yang nyata, misalnya scan berhasil, scan gagal, atau enrollment.
- Trigger sinkronisasi juga tidak bergantung pada polling rutin.
- UI device tidak perlu lagi menampilkan status open/close/sync yang kompleks; cukup jam, hasil scan, dan hasil sukses/gagal.
- Server-side queue berbasis `status`, `metadata`, dan `syncQueue` kemungkinan perlu diganti atau dipersempit.

Implikasi yang perlu disepakati sebelum implementasi:

- Format payload baru untuk event fingerprint.
- Apakah response server tetap plain-text command atau cukup hasil proses scan.
- Mekanisme start sync tanpa polling.
- Cara menghitung online/offline kalau `timeout` tidak lagi diupdate secara periodik.
- Apakah admin action tetap dibutuhkan dari dashboard, atau pindah ke trigger fisik/maintenance mode di device.

### Request Body

Satu baris per event:

```text
A
8;12
9;12;(templateHex)
```

Makna event:

- `A` = Ack. Server menghapus command yang sedang pending dan lanjut ke antrean sync berikutnya bila ada.
- `8;{fid}` = hasil pencarian fingerprint. Server merespons dengan `7;{name};{photoHex}` untuk request itu juga.
- `9;{fid};{templateHex}` = upload template fingerprint ke server, disimpan di tabel `device_users`.

### Response

Response selalu satu command string plain text. Contoh:

```text
0;
1;
2;12
3;12;(templateHex)
4;12
5;12
6
7;Budi Santoso;(photoHex)
```

### Foto untuk perangkat

- Server selalu menormalisasi foto ke **JPEG 120×120** (crop persegi, center) sebelum dikirim sebagai `photoHex`.
- Tanpa foto di Google Workspace, server membuat **avatar inisial** (mis. `BS` untuk Budi Santoso) dengan warna latar dari hash nama.
- Firmware cukup decode JPEG dari hex; tidak perlu resize lagi di device.

## Server-Side Command Storage

Kolom `terminals.metadata` menyimpan raw plain text command string untuk polling berikutnya. Tidak ada JSON di kolom ini.

Contoh nilai `metadata` yang valid:

| Skenario                           | Nilai `metadata`          |
| ---------------------------------- | ------------------------- |
| Tidak ada command pending          | `NULL`                    |
| Enrollment fingerprint user 23     | `23`                      |
| Copy fingerprint ke device         | `12;(templateHex)`        |
| Remove fingerprint user 5          | `5`                       |
| Tampilkan user info setelah search | `Budi Santoso;(photoHex)` |
| Open gate                          | `NULL`                    |

Saat device mengirim `A`, server mengosongkan `metadata` menjadi `NULL`.

## Kolom Terminal Tambahan

### `timeout` - Last Seen Timestamp

- Menyimpan Unix epoch timestamp dalam detik dari polling terakhir device.
- Diupdate otomatis setiap POST request.
- Dashboard memakai nilai ini untuk indikator online/offline.
- Online jika selisih dengan waktu sekarang kurang atau sama dengan 120 detik.
- Offline jika lebih dari 120 detik atau nilainya `0`/`NULL`.

### `syncQueue` - Fingerprint Sync Queue

- Menyimpan JSON array berisi daftar `fid` yang harus disinkronkan ke device.

Contoh:

```json
[24, 25, 26, 30, 45]
```

#### Alur Sync

1. Admin menekan tombol sync pada terminal di dashboard.
2. Server mengumpulkan semua user yang punya fingerprint dan memasukkannya ke `syncQueue`, serta men-set `status` ke **`6`** (empty — hapus semua template di device).
3. Device poll → terima `6;`, hapus memori sidik jari, kirim `A`.
4. Poll berikutnya (idle): jika `syncQueue` masih berisi item, server mengambil `fid` pertama.
4. Server mencari template fingerprint di `device_users` dan menulis `3;{fid};{templateHex}` ke `metadata`.
5. Device menerima command `3`, menyimpan template, lalu mengirim `A`.
6. Setelah `A` diterima, server menghapus command yang pending, mengeluarkan `fid` tadi dari queue, lalu lanjut ke item berikutnya.
7. Jika device gagal atau koneksi putus, command tetap di `metadata` dan akan dicoba lagi saat polling berikutnya.
8. User yang tidak punya fingerprint otomatis dilewati.

## Error Response

Semua error dikirim sebagai plain text:

```text
ERR;Message
```

Status umum:

- `401` auth missing, auth invalid, timestamp kedaluwarsa, atau signature salah.
- `400` body tidak valid atau event malformed.
- `500` error server atau database.

## Contoh Signing

```cpp
String deviceId = "ESP32-ROOM-1";
String timestamp = String(nowEpochSeconds);
String nonce = randomNonce();
String body = payloadText;

String payload = deviceId + "\n" + timestamp + "\n" + nonce + "\n" + body;
String signature = hmac_sha256_hex(devicePassword, payload);

setHeader("X-Timestamp", timestamp);
setHeader("X-Nonce", nonce);
setHeader("X-Signature", signature);

httpPost("https://example.com/api/device/" + deviceId, body);
```

## Sinkronisasi Waktu

Clock device harus akurat untuk validasi HMAC. Gunakan NTP:

```cpp
#include <WiFi.h>
#include <time.h>

void setupNTP() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  struct tm timeinfo;
  while (!getLocalTime(&timeinfo)) {
    delay(500);
  }
}
```

Untuk device yang hidup lama, lakukan re-sync berkala agar drift tidak menumpuk.

```cpp
void resyncNTP() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
}

unsigned long lastNtpSync = 0;
const unsigned long NTP_INTERVAL = 6UL * 60 * 60 * 1000;

void loop() {
  if (millis() - lastNtpSync > NTP_INTERVAL) {
    resyncNTP();
    lastNtpSync = millis();
  }
}
```

## Rekomendasi

- TLS sangat disarankan.
- Jika jaringan tidak stabil, gunakan exponential backoff.
- Tetap sinkronkan waktu device agar lolos validasi timestamp.
- Kompresi tidak wajib.
