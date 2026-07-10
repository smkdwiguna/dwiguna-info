# Site Shell and User Management

Fitur ini mencakup shell dashboard dan alur administrasi user bulk.

## Scope

- Shell dashboard dan sidebar ada di `features/site-shell/components/site-layout.tsx`.
- Compatibility alias lama masih tersedia di `features/workspace-admin/components/site-layout.tsx`.
- Bulk upload, reset password, update foto, dan edit user ada di `features/workspace-admin/actions/`.
- Upload kartu massal ada di `features/workspace-admin/components/bulk-pass-upload-client.tsx` dan route `POST /api/account-passes/bulk`.

## Runtime

- Fitur ini berjalan di Cloudflare Worker runtime.
- Dashboard pages mengandalkan server action dan state user/session yang tersimpan di database.
- Jangan mengasumsikan persistence filesystem lokal untuk alur admin apa pun.

## Permission

- `users` memberi akses ke user management.
- `shortlink` memberi akses ke manajemen shortlink.
- `inventory` dipakai untuk create inventory dan aksi administratif inventaris.
- `users` juga dipakai untuk upload kartu massal.
- `presence` tetap dikelola sebagai area superuser di shell dashboard.
- Superuser menembus pengecekan permission individual.

## Route Ownership

- `/users` menampilkan daftar user.
- `/users/bulk-upload` menangani import atau pembuatan user massal.
- `/access` mengelola assignment permission dan dipisah ke feature access-management.
- `/inventory` menampilkan daftar inventaris multi-tenant.
- `/inventory/[id]` menampilkan detail item, anggota, dan riwayat untuk satu inventaris.
- `/settings` adalah bagian dashboard yang ditampilkan untuk superuser.

## Sidebar Behavior

- Sidebar dirakit di layout pusat agar navigasi konsisten di seluruh dashboard.
- Entry Inventaris ditampilkan jika user punya permission `inventory`, punya membership inventaris, atau adalah superuser.
- Submenu Inventaris memuat semua inventaris yang bisa diakses user aktif.
- Loading sidebar menunggu permission dan daftar inventaris selesai dimuat agar submenu tidak muncul terlambat.

## Footer Legal Notice

- Footer dashboard sekarang berupa tombol yang membuka dialog lisensi sumber terbuka.
- Dialog itu menampilkan repositori GitHub, nama pengembang lead, dan daftar lisensi dependency langsung.

## Catatan

- Saat menambah fitur dashboard baru, daftarkan permission-nya di access management UI dan sambungkan ke sidebar.
- Pertahankan site layout sebagai satu sumber kebenaran untuk navigasi.

## Google API — domain-wide delegation

Service account memakai **dua token terpisah**:

| Token             | Scope                                                  | Dipakai untuk                                          |
| ----------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| Admin             | `admin.directory.*` (user, group, orgunit, userschema) | Directory users, foto thumbnail Admin, device presence |
| People (opsional) | `directory.readonly`                                   | Foto profil high-res via People API                    |

Jika scope People **belum** ditambahkan di Google Admin → Security → API controls → Domain-wide delegation (client ID service account), People API dilewati dan foto device memakai Admin SDK + `thumbnailPhotoUrl`.

**Jangan** mencampur scope People ke JWT Admin — satu scope yang belum di-delegasikan membuat seluruh token gagal (`unauthorized_client`) dan semua fallback ikut mati.
