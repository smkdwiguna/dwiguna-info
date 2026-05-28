# Dwiguna.Info

Dwiguna.Info adalah portal internal berbasis Next.js untuk autentikasi, navigasi admin, dan sistem kerja SMK TI Dwiguna. Aplikasi ini berjalan di Cloudflare Workers melalui OpenNext dan memakai Cloudflare D1 sebagai sumber data utama.

## Gambaran Umum

- Login memakai Better Auth dan Google Workspace.
- Sesi pengguna disimpan dan dibaca dari runtime server, bukan dari filesystem lokal.
- Modul utama saat ini mencakup users, access, shortlinks, presence, inventory, dan endpoint device terminal.
- Footer dashboard menampilkan tombol copyright yang membuka dialog lisensi sumber terbuka.

## Runtime dan Data

- Aplikasi dibangun sebagai Next.js App Router app.
- Runtime produksi dan development mengikuti model Cloudflare Workers.
- Semua data aplikasi utama tersimpan di Cloudflare D1 dengan nama `dwiguna-info`.
- Binding runtime Cloudflare memakai nama camelCase `dwigunaInfo`.
- Saat menulis server action atau route handler, anggap Worker runtime dan D1 sebagai sumber kebenaran.

## Navigasi dan Izin

- Sidebar dashboard dirakit di `features/workspace-admin/components/admin-layout.tsx`.
- Permission `inventory` dipakai untuk membuat inventaris dan tindakan administratif inventaris, bukan untuk membatasi akses baca inventaris yang sudah dibagikan.
- Pengguna yang tidak memiliki membership inventaris dan juga tidak punya permission `inventory` akan diarahkan keluar dari `/inventory`.
- Menu Inventaris di sidebar hanya muncul jika user punya membership inventaris, permission `inventory`, atau status superuser.

## Dokumentasi

- Indeks dokumentasi ada di [docs/README.md](docs/README.md).
- Penjelasan akses dan rute ada di [docs/access-and-routing.md](docs/access-and-routing.md).
- Detail inventaris ada di [docs/inventory.md](docs/inventory.md).
- Detail shortlink ada di [docs/shortlink.md](docs/shortlink.md).
- Detail presence ada di [docs/presence.md](docs/presence.md).
- Detail komunikasi device ada di [docs/device-server-communication.md](docs/device-server-communication.md).
- Ringkasan lisensi sumber terbuka ada di [docs/open-source-licenses.md](docs/open-source-licenses.md).

## Menjalankan

```bash
bun install
bun run dev
```

Secara default aplikasi berjalan di `http://localhost:3000`.

## Konfigurasi

Environment yang umum dipakai:

- `BETTER_AUTH_SECRET`: Secret untuk enkripsi Better Auth.
- `BETTER_AUTH_URL`: URL aplikasi ini, misalnya `http://localhost:3000` atau `https://dwiguna.info`.
- `GOOGLE_CLIENT_ID`: Client ID OAuth dari Google Cloud.
- `GOOGLE_CLIENT_SECRET`: Client secret OAuth dari Google Cloud.
- `GOOGLE_CLIENT_EMAIL`: Email service account dari Google Cloud.
- `GOOGLE_PRIVATE_KEY`: Private key RSA service account dari Google Cloud dalam base64.

## Catatan Runtime

- Untuk pengujian database lokal, gunakan alur yang kompatibel dengan Cloudflare D1.
- Jika menambah dokumentasi baru, jelaskan dengan jelas apakah fitur itu berjalan di browser, Worker, server action, atau route handler.
