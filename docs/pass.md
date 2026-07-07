# Pass

Fitur ini menyimpan kartu akun yang bisa dipakai ulang untuk semua tipe akun, bukan hanya siswa. Istilah UI tetap memakai **Kartu** karena itu kata yang dipahami pengguna, sementara nama kode tetap memakai bahasa Inggris.

## Scope Awal

- Admin bisa mengunggah kartu massal lewat dua file ZIP: sisi depan dan sisi belakang.
- Nama file di dalam ZIP harus cocok dengan username sebelum tanda `@`.
- Sisi depan dan belakang bersifat opsional, jadi kartu boleh hanya punya satu sisi.
- Data kartu disimpan di tabel `account_passes`.
- Berkas gambar disimpan ke Google Drive lewat helper internal aplikasi.
- Halaman dasbor menampilkan kartu hanya untuk akun yang memang sudah punya data kartu.

## Route dan Akses

- Upload massal memakai `POST /api/account-passes/bulk`.
- Route ini memakai izin `users` atau superuser.

## Tahap Berikutnya

- Integrasi Google Wallet dan Apple Wallet belum aktif di tahap awal.
- `walletStatus` dan `qrPayload` sudah disiapkan di skema agar tahap berikutnya tidak perlu migrasi besar.
