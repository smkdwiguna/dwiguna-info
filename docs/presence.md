# Presence

Fitur ini mencakup dashboard kehadiran, sinkronisasi terminal, mapping device-user, dan pengelolaan lembar absensi.

## Scope

- Halaman utama ada di `app/(site)/(shell)/presence/page.tsx`.
- Halaman pendukung ada di `app/(site)/(shell)/presence/`.
- Akses data memakai schema di `lib/db/schema.ts` dan pembacaan server-side lewat `lib/db/index.ts`.

## Runtime dan Storage

- Fitur ini berjalan sebagai dashboard pages yang dirender di Cloudflare Worker runtime.
- Data dibaca dari Cloudflare D1.
- Sinkronisasi attendance dan device harus lewat server action atau route handler, bukan local state.

## Area Data Utama

- `attendanceSheets`
- `schedules`
- `sheetTargets`
- `presencePoints`
- `presenceLogs`
- `deviceUsers`

## Struktur Route

- `/presence` menampilkan dashboard overview.
- `/presence/sheets` mengelola attendance sheets.
- `/presence/terminals` mengelola terminal device dan status sync.
- `/presence/device-users` mengelola mapping fingerprint user-device.

## Permission

- Area presence saat ini superuser-only di shell dashboard.
- Jika nanti ditambah permission eksplisit, dokumentasikan di sini dan di access management UI.

## Catatan

- Perilaku sinkronisasi terminal sebaiknya didokumentasikan bersama protokol device.
- Jika menambah tabel atau admin action baru untuk presence, tulis di sini agar alur fitur tetap mudah dilacak.
