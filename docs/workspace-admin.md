# Workspace Admin

Fitur ini mencakup shell dashboard, manajemen akses user, dan alur administrasi user bulk.

## Scope

- Shell dashboard dan sidebar ada di `features/workspace-admin/components/admin-layout.tsx`.
- Manajemen akses user ada di `features/workspace-admin/components/access-management-client.tsx`.
- Bulk upload, reset password, update foto, dan edit user ada di `features/workspace-admin/actions/`.

## Runtime

- Fitur ini berjalan di Cloudflare Worker runtime.
- Admin pages mengandalkan server action dan state user/session yang tersimpan di database.
- Jangan mengasumsikan persistence filesystem lokal untuk alur admin apa pun.

## Permission

- `users` memberi akses ke user management.
- `shortlink` memberi akses ke manajemen shortlink.
- `inventory` dipakai untuk create inventory dan aksi administratif inventaris.
- `presence` tetap dikelola sebagai area superuser di shell dashboard.
- Superuser menembus pengecekan permission individual.

## Route Ownership

- `/users` menampilkan daftar user.
- `/bulk-upload` menangani import atau pembuatan user massal.
- `/access` mengelola assignment permission.
- `/inventory` menampilkan daftar inventaris multi-tenant.
- `/inventory/[id]` menampilkan detail item, anggota, dan riwayat untuk satu inventaris.
- `/settings` adalah bagian admin yang ditampilkan untuk superuser.

## Sidebar Behavior

- Sidebar dirakit di layout pusat agar navigasi konsisten di seluruh dashboard.
- Entry Inventaris ditampilkan jika user punya permission `inventory`, punya membership inventaris, atau adalah superuser.
- Submenu Inventaris memuat semua inventaris yang bisa diakses user aktif.
- Loading sidebar menunggu permission dan daftar inventaris selesai dimuat agar submenu tidak muncul terlambat.

## Footer Legal Notice

- Footer dashboard sekarang berupa tombol yang membuka dialog lisensi sumber terbuka.
- Dialog itu menampilkan repositori GitHub, nama pengembang lead, dan daftar lisensi dependency langsung.

## Catatan

- Saat menambah fitur admin baru, daftarkan permission-nya di access management UI dan sambungkan ke sidebar.
- Pertahankan dashboard layout sebagai satu sumber kebenaran untuk navigasi.
