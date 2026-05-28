# Access Management

Fitur ini mengurus pemberian dan penghapusan permission user.

## Scope

- UI access management ada di `features/access-management/components/access-management-client.tsx`.
- Server action untuk membaca user dan menulis permission ada di `features/access-management/actions/`.
- Fitur ini terpisah dari site shell dan user-management bulk upload.

## Runtime

- Fitur ini berjalan di Cloudflare Worker runtime.
- Data permission dibaca dan ditulis dari custom schema Google Workspace.

## Route

- `/access` dipakai untuk menambah dan menghapus permission user.

## Permission Model

- `users` tetap dipakai untuk user-management.
- `shortlink` tetap dipakai untuk manajemen shortlink.
- `presence` dan `inventory` tetap mengikuti aturan akses yang sudah ada.
- Superuser tetap bisa membuka halaman access management tanpa permission tambahan.

## Catatan

- Jika menambah permission baru, update access management UI, dokumen izin, dan sidebar terkait pada perubahan yang sama.
