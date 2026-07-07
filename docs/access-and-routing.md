# Access, Routes, and Fallback Pages

Dokumen ini menjelaskan bagaimana izin, route, redirect, dan fallback page saling bekerja di aplikasi ini.

## Runtime

- Aplikasi berjalan di Cloudflare Workers melalui OpenNext.
- Data aplikasi disimpan di Cloudflare D1.
- Server action dan route handler harus ditulis dengan asumsi Worker runtime, bukan filesystem lokal atau SQLite lokal.

## Strategi Database

- Gunakan satu database D1 untuk seluruh aplikasi.
- Pisahkan fitur dengan tabel dan migrasi, bukan dengan membuat database baru per fitur.
- Nama database Cloudflare D1 adalah `dwiguna-info`.
- Binding runtime Cloudflare memakai nama camelCase seperti `dwigunaInfo`.

## Model Permission

- Permission disimpan sebagai string yang dipisahkan koma di Google Workspace custom schema.
- `normalizeAccessList()` dipakai untuk membaca permission secara konsisten.
- `requirePermissionOrRedirect()` dipakai untuk halaman yang butuh permission global tertentu.
- `requireSuperUserOrRedirect()` dipakai untuk halaman yang hanya boleh dibuka superuser.
- `inventory` dipakai untuk akses administratif inventaris, terutama membuat inventaris baru dan aksi global inventaris.
- `users` dipakai untuk user management dan upload kartu massal.
- Akses melihat inventaris tertentu tetap berbasis membership baris-per-barang di database, bukan permission global tunggal.
- Pengguna yang tidak punya membership inventaris dan juga tidak punya permission `inventory` akan ditolak saat membuka `/inventory` dan diarahkan ke dashboard dengan flash message.
- Inventory tidak lagi menyimpan deskripsi level inventaris. Yang tersisa di entitas inventaris hanyalah nama dan timestamp pembuatan.
- Transfer inventaris adalah mutasi stok antar dua inventaris. Sumber mencatat `OUT`, tujuan mencatat `IN`, dan item tujuan dibuat otomatis jika belum ada.
- Superuser selalu menembus pengecekan permission individual.

## Dashboard Shell

- Shell dashboard dikelola oleh `features/site-shell/components/site-layout.tsx`.
- Layout route group fisik sekarang ada di `app/(site)/layout.tsx` dan `app/(site)/(shell)/`.
- Sidebar dirakit di sana, termasuk visibilitas menu berdasarkan permission dan membership.
- Menu Inventaris muncul jika user adalah superuser, punya permission `inventory`, atau punya membership pada setidaknya satu inventaris.
- Submenu Inventaris berisi daftar semua inventaris yang bisa diakses user aktif.
- Loading sidebar memakai satu state gabungan agar izin dan daftar inventaris tampil serempak setelah semua data siap.

## Route Kartu

- `POST /api/account-passes/bulk` dipakai untuk upload kartu massal.
- Route ini harus lolos izin `users` atau superuser.
- `GET /api/account-passes/[ownerEmail]/file?side=front|back` dipakai untuk preview sisi kartu.
- `GET /api/account-passes/[ownerEmail]/pdf` dipakai untuk unduh PDF gabungan.
- Halaman dasbor hanya menampilkan kartu kalau data kartu memang sudah ada untuk akun aktif.

## Route Safety untuk Shortlink

- Sistem shortlink memakai route root `app/[slug]/page.tsx`.
- Slug yang bentrok dengan route aplikasi diblokir di validasi server.
- Set slug yang saat ini harus dianggap reserved meliputi:
  - `login`
  - `users`
  - `access`
  - `presence`
  - `inventory`
  - `bulk-upload`
  - `shortlink`
  - `settings`
  - `api`
  - `_next`

### Catatan Pemeliharaan

Kalau menambah route atau halaman baru, cek apakah slug-nya harus masuk daftar reserved. Update `SHORT_LINK_RESERVED_SEGMENTS` di `lib/short-links.ts` dan dokumen shortlink pada saat yang sama agar daftar reserved tidak drift dari route tree aktual.

## Fallback Pages

- `app/not-found.tsx` menyesuaikan global 404 screen.
- `app/error.tsx` menyesuaikan global error boundary.
- `app/loading.tsx` menyesuaikan top-level loading state.

## Kebiasaan Dokumentasi

- Tambahkan catatan singkat di dokumen ini jika menambah top-level route atau permission baru.
- Jika route harus dilindungi dari shortlink, pastikan route safety di kode dan dokumentasi ikut diperbarui.
- Jika route tree berubah, langsung sinkronkan daftar reserved slug dengan implementasi.
