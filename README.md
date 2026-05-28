# Dwiguna.Info

Ini adalah sistem aplikasi Next.js untuk autentikasi dan portal utama SMK TI Dwiguna. Aplikasi ini menangani login, sesi pengguna, alur SSO, dan contoh endpoint internal.

## Fitur Utama

- Login dengan Better Auth langsung ke Google Workspace.
- Penyimpanan dan pembacaan token sesi terenkripsi AES-GCM.

## Infrastruktur

- Aplikasi ini dijalankan sebagai Next.js app di atas Cloudflare Workers.
- Database utama untuk data aplikasi memakai Cloudflare D1 dengan nama `dwiguna-info`.
- OpenNext dipakai sebagai lapisan adaptasi build dan runtime ke Cloudflare.
- Saat mengerjakan fitur yang menyentuh data, anggap sumber kebenaran ada di Worker runtime dan binding D1, bukan filesystem lokal.

### Strategi Database

- Satu database D1 untuk seluruh aplikasi adalah pilihan yang paling masuk akal.
- Buat tabel berbeda untuk domain fitur yang berbeda, bukan database berbeda per fitur.
- Nama database yang dipakai di Cloudflare dan dokumentasi harus konsisten: `dwiguna-info`.
- Binding runtime Cloudflare tetap memakai nama camelCase `dwigunaInfo`.

## Dokumentasi

- Lihat [docs/README.md](docs/README.md) untuk indeks dokumentasi sistem dan fitur.
- Dokumen per fitur ada di folder [docs/](docs) dan diringkas di indeks tersebut.

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

## Catatan Runtime

- Untuk pengujian database lokal, gunakan alur yang kompatibel dengan Cloudflare binding D1.
- Jika ada dokumentasi baru, jelaskan apakah fitur itu berjalan di browser, Worker, atau server action yang memakai D1.
