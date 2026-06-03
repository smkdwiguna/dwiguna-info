# Catatan untuk Tim Firmware / Hardware (Terminal Presensi)

Dokumen ini ditujukan untuk engineer yang mengembangkan firmware ESP32 (atau platform serupa). Spesifikasi protokol lengkap ada di [Device ↔ Server Communication](device-server-communication.md); halaman ini merangkum hal yang sering bikin bug di lapangan dan kontrak yang harus dipegang firmware.

## Ringkasan cepat

| Item | Nilai |
|------|--------|
| Endpoint | `POST https://{host}/api/device/{deviceId}` |
| Content-Type body request | plain text (bukan JSON) |
| Content-Type response | `text/plain; charset=utf-8` |
| Auth | HMAC-SHA256 + header `X-Timestamp`, `X-Nonce`, `X-Signature` |
| Rentang waktu auth | ±300 detik dari jam server (wajib NTP) |
| Layar referensi | 480×320 px (foto profil biasanya widget persegi, bukan full screen) |
| Foto dari server | JPEG **120×120**, field `photoHex` = byte file di-encode **hex lowercase** |
| Tanpa foto Workspace | Server kirim **avatar inisial** (2 huruf + warna latar), tetap JPEG |

`deviceId` di path harus sama persis dengan string yang dipakai saat menghitung HMAC (contoh: `ESP32-ROOM-1`).

---

## 1. Autentikasi HMAC (wajib benar)

### Header

```
X-Timestamp: {unix detik}
X-Nonce: {string acak unik per request}
X-Signature: {hmac hex lowercase}
```

### Payload yang ditandatangani

Empat baris dipisah `\n` (LF), **tanpa** baris kosong di akhir:

```text
{deviceId}
{timestamp}
{nonce}
{body}
```

`body` = isi POST mentah. Jika kosong, baris keempat string kosong (tetap ada `\n` setelah nonce).

### Contoh (pseudocode)

```cpp
String payload = deviceId + "\n" + timestamp + "\n" + nonce + "\n" + body;
String signature = hmac_sha256_hex(password, payload); // output hex lowercase
```

### Checklist debug auth gagal (401)

- [ ] NTP sudah sync (`configTime` + `getLocalTime` sukses sebelum POST pertama)
- [ ] `X-Timestamp` dalam detik, bukan milidetik
- [ ] `deviceId` di URL = `deviceId` di payload HMAC
- [ ] `body` untuk HMAC = byte yang **benar-benar** dikirim (contoh `8;0`, bukan string kosong kalau ada isi)
- [ ] Signature hex **lowercase**
- [ ] Password sama dengan kolom `terminals.password` di server

---

## 2. HTTP response: WAJIB decode body, bukan baca mentah

Server di production (Cloudflare) sering mengirim:

```http
Transfer-Encoding: chunked
```

Body **bukan** langsung `7;Nama;...`. Contoh mentah yang salah dibaca sebagai perintah:

```text
1d
7;Aldenio Zefanya Pangemanan;
0
```

| Baris | Arti |
|-------|------|
| `1d` | Ukuran chunk berikutnya dalam **hex** (0x1d = 29 byte) |
| `7;Aldenio Zefanya Pangemanan;` | **Isi respons sebenarnya** (perintah server) |
| `0` | Akhir chunked stream |

### Bug yang pernah terjadi

Parser mengambil baris pertama `1d` → digit pertama `1` → firmware mengira perintah **Open Gate** dan membuka pintu.

### Yang harus dilakukan firmware

1. Setelah header selesai (`\r\n\r\n`), jika ada `Transfer-Encoding: chunked`:
   - Baca baris ukuran chunk (hex)
   - Baca tepat N byte data chunk
   - Abaikan `\r\n` setelah data chunk
   - Ulangi sampai ukuran chunk `0`
2. **Gabungkan** semua byte chunk → satu string perintah
3. Baru parse `CODE;field1;field2;...`

Alternatif: gunakan library HTTP client yang **otomatis** decode chunked (mis. `HTTPClient` Arduino dengan handler lengkap, bukan parse manual socket).

Respons sukses juga bisa memakai `Content-Length` di environment lain; tetap utamakan path yang benar untuk chunked.

---

## 3. Format perintah (plain text)

Satu perintah per respons HTTP (setelah decode body):

```text
CODE;field1;field2;...
```

### Device → Server (di body POST)

Satu event per baris; boleh beberapa baris dalam satu POST:

| Baris | Makna |
|-------|--------|
| `A` | Ack: perintah server terakhir sudah selesai dieksekusi |
| `8;{fid}` | Fingerprint cocok di slot `fid` (0–999) |
| `9;{fid};{templateHex}` | Upload template hasil enrollment |

Contoh scan berhasil:

```text
8;0
```

### Server → Device (body respons)

| Code | Aksi firmware |
|------|----------------|
| `0` | Idle, tidak ada yang pending |
| `1` | Buka relay / gate |
| `2` | Mulai enrollment untuk `fid` |
| `3` | Simpan template `fid;templateHex` ke memori sensor |
| `4` | Kirim template tersimpan untuk `fid` ke server (event `9`) |
| `5` | Hapus `fid` dari memori |
| `6` | Hapus semua template |
| `7` | Tampilkan `name` + decode `photoHex` |
| `ERR;...` | Gagal (lihat pesan setelah `ERR;`) |

Setelah mengeksekusi perintah server (kecuali `0`), kirim **`A`** pada POST berikutnya agar server menghapus command pending.

---

## 4. Foto profil (`7;name;photoHex`)

### Kontrak (perilaku server saat ini)

- Server **selalu** mengirim `photoHex` (tidak kosong) untuk perintah `7`.
- Isi `photoHex`: file **JPEG** hasil normalisasi **120×120 px**, quality ~72, crop persegi (center).
- Encoding: setiap byte file → 2 karakter hex `0-9a-f` (lowercase).
- Ukuran file kira-kira **2–6 KB** → panjang hex kira-kira **4–12 ribu karakter**. Siapkan buffer/string cukup besar.

### Jika user tidak punya foto di Google Workspace

Server membuat **avatar inisial**:

- 1–2 huruf dari nama (nama depan + nama belakang, contoh *Aldenio Pangemanan* → `AP`)
- Latar warna deterministik dari hash nama (sama nama = sama warna)
- Tetap format JPEG 120×120 — decoder di device **sama** dengan foto asli

Firmware **tidak perlu** resize ulang; tampilkan di area persegi di TFT (mis. 80–120 px sisi).

### Parsing field perintah `7`

```text
7;{name};{photoHex}
```

- `name` tidak boleh mengandung `;` atau newline (server sudah sanitize).
- `photoHex` adalah field terakhir: **semua sisa string setelah `;` kedua** adalah hex JPEG (tidak ada `;` di dalam hex).

### Decode di device (alur)

```text
photoHex (string) → bytes (parse hex) → buffer JPEG → decode JPEG → bitmap RGB untuk TFT
```

Pseudocode hex → bytes:

```cpp
size_t byteLen = photoHex.length() / 2;
uint8_t* jpeg = ...;
for (size_t i = 0; i < byteLen; i++) {
  jpeg[i] = (fromHex(photoHex[i*2]) << 4) | fromHex(photoHex[i*2 + 1]);
}
// lalu TJpgDec / JPEGDecoder / library JPEG pilihan tim
```

Pastikan library JPEG mendukung baseline JPEG umum (hasil server memakai mozjpeg/jpeg-js).

---

## 5. Alur scan fingerprint (happy path)

```mermaid
sequenceDiagram
    participant User
    participant ESP as ESP32
    participant API as Server

    User->>ESP: Sidik jari cocok (fid=0)
    ESP->>API: POST body "8;0" + HMAC
    Note over API: Lookup user, siapkan JPEG 120x120
    API-->>ESP: 7;Nama Lengkap;{photoHex}
    ESP->>ESP: Decode chunked HTTP body
    ESP->>ESP: Tampilkan nama + foto
    ESP->>API: POST body "A" + HMAC
    API-->>ESP: 0;
```

---

## 6. `fid` (fingerprint ID)

- Rentang **0–999** (sesuai kapasitas sensor / skema database).
- `fid` = `device_users.id` di server, bukan slot internal sensor kecuali sudah disepakati mapping 1:1 saat sync.
- Event `8;{fid}` artinya: "saya mendeteksi sidik jari yang cocok dengan slot/id ini".

---

## 7. Sinkronisasi template dari dashboard

Saat admin menekan sync di dashboard, server mengantre `fid` di `syncQueue` dan mengirim perintah `3;{fid};{templateHex}` secara bertahap.

Firmware:

1. Terima `3`, simpan template ke slot `fid`
2. POST `A`
3. Ulangi sampai respons `0;` dan antrean habis

Jika koneksi putus sebelum `A`, server mengulang command yang sama pada poll berikutnya.

---

## 8. Error umum

| Gejala | Kemungkinan penyebab |
|--------|----------------------|
| 401 Unauthorized | Jam/NTP, signature, atau password salah |
| Pintu terbuka padahal scan user | Body respons chunked tidak di-decode (`1d` dibaca sebagai cmd `1`) |
| Nama kosong / foto gagal | Jarang setelah update server; cek decode `7` dan panjang buffer hex |
| Respons lambat (~1–2 d) | Normal: server ambil nama/foto dari Google Admin API lalu resize |
| `ERR;...` | Baca pesan setelah `ERR;`, perbaiki request atau hubungi tim backend |

---

## 9. Rekomendasi implementasi

- **TLS** wajib di production.
- **NTP** saat boot + re-sync berkala (mis. tiap 6 jam).
- **Backoff** eksponensial jika WiFi/server gagal.
- **Satu thread/task** khusus HTTP; jangan parse respons di callback yang sama dengan UI tanpa buffer lengkap.
- Log debug: cetak **body setelah chunked decode**, bukan raw socket.
- Setelah perintah `7`, kirim `A` agar dashboard tidak stuck di status "Menampilkan Info".

---

## 10. Rujukan & kontak

| Dokumen | Isi |
|---------|-----|
| [device-server-communication.md](device-server-communication.md) | Spesifikasi protokol lengkap (normatif) |
| [device-server-redesign-note.md](device-server-redesign-note.md) | Arah redesign (event-driven, kurangi polling) — belum wajib di firmware saat ini |
| [presence.md](presence.md) | Fitur dashboard presence |

Kode server terkait:

- `app/api/device/[deviceId]/route.ts` — handler POST device
- `lib/device-auth.ts` — verifikasi HMAC
- `lib/device-user-photo.ts` — resize JPEG + avatar inisial

Perubahan protokol atau ukuran foto akan diumumkan lewat update dokumen di repo yang sama; firmware harus mengacu pada commit/tag release yang disepakati bersama tim backend.
