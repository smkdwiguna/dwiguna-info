# Dwiguna.Info

Ini adalah sistem aplikasi Next.js untuk autentikasi dan portal utama SMK TI Dwiguna. Aplikasi ini menangani login, sesi pengguna, alur SSO, dan contoh endpoint internal.

## Fitur Utama

- Login dengan Better Auth langsung ke Google Workspace.
- Dukungan SSO kustom untuk aplikasi eksternal.
- Penyimpanan dan pembacaan token sesi terenkripsi AES-GCM.
- Endpoint contoh di `/api/example` untuk kebutuhan integrasi atau pengujian.

## Menjalankan

Jalankan server development:

```bash
bun install
bun run dev
```

Secara default aplikasi berjalan di `http://localhost:3000`.

## Konfigurasi

Beberapa variabel environment yang dipakai:

- `BETTER_AUTH_SECRET`: Secret yang digunakan oleh enkripsi better auth
- `BETTER_AUTH_URL`: URL aplikasi ini, misalnya http://localhost:3000 atau https://dwiguna.info
- `GOOGLE_CLIENT_ID`: Kredensial client ID OAuth dari Google Cloud
- `GOOGLE_CLIENT_SECRET`: Kredensial client secret OAuth dari Google Cloud
- `GOOGLE_CLIENT_EMAIL`: Alamat email service account dari Google Cloud
- `GOOGLE_PRIVATE_KEY`: Private key RSA service account dari Google Cloud
