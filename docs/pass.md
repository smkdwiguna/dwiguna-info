# Pass

Fitur ini menyimpan kartu akun yang bisa dipakai ulang untuk semua tipe akun, bukan hanya siswa. Istilah UI tetap memakai **Kartu** karena itu kata yang dipahami pengguna, sementara nama kode tetap memakai bahasa Inggris.

## Scope Awal

- Admin bisa mengunggah kartu massal lewat dua file ZIP: sisi depan dan sisi belakang.
- Nama file di dalam ZIP harus cocok dengan username sebelum tanda `@`.
- Sisi depan dan belakang bersifat opsional, jadi kartu boleh hanya punya satu sisi.
- Data kartu disimpan di tabel `account_passes`.
- Berkas gambar disimpan ke Google Drive lewat helper internal aplikasi.
- Halaman dasbor menampilkan kartu hanya untuk akun yang memang sudah punya data kartu.
- Dialog kartu di halaman dasbor menampilkan sisi depan/belakang dan tombol unduh PDF.

## Route dan Akses

- Upload massal memakai `POST /api/account-passes/bulk`.
- Route ini memakai izin `users` atau superuser.
- Preview gambar memakai `GET /api/account-passes/[ownerEmail]/file?side=front|back`.
- Unduhan gabungan memakai `GET /api/account-passes/[ownerEmail]/pdf`.

## Rencana Google Wallet

- Buat Google Wallet Issuer, aktifkan Google Wallet REST API, buat service account key, lalu beri akses Developer di Google Pay & Wallet Console.
- Buat satu `GenericClass` untuk kartu akun Dwiguna, lalu satu `GenericObject` per akun. ID objek sebaiknya stabil, misalnya berbasis username yang sudah dinormalisasi.
- Isi objek dari data `account_passes`: nama, email, status, `qrPayload` sebagai barcode/QR, dan link PDF sebagai tautan pendukung jika dibutuhkan.
- Buat endpoint server untuk menghasilkan signed JWT dan URL `https://pay.google.com/gp/v/save/<signed_jwt>`.
- Tambahkan tombol "Tambah ke Google Wallet" di dialog kartu hanya ketika object sudah siap dan `walletStatus` bukan `NOT_READY`.
- Sebelum rilis umum, minta publishing access. Selama demo mode, pass hanya bisa dipakai oleh admin/developer/test account dan akan bertanda test.

Catatan data: skema saat ini baru punya `walletStatus` dan `qrPayload`. Saat integrasi Google dimulai, tambahkan field seperti `googleWalletClassId`, `googleWalletObjectId`, dan `googleWalletSaveUrl` agar status bisa diaudit tanpa membuat ulang pass setiap render.

## Rencana Apple Wallet

- Daftarkan Pass Type ID di Apple Developer dan siapkan sertifikat signing pass beserta private key.
- Buat `pass.json` per akun dengan style `generic`, `serialNumber` stabil, `passTypeIdentifier`, `teamIdentifier`, `organizationName`, `description`, field nama/email, dan barcode dari `qrPayload`.
- Siapkan asset wajib seperti `icon.png` dan varian Retina. Asset tambahan seperti logo atau strip bisa dibuat dari branding sekolah.
- Generate manifest hash untuk semua file pass, tanda tangani manifest dengan sertifikat Apple, lalu zip sebagai `.pkpass`.
- Sajikan dari endpoint seperti `GET /api/account-passes/[ownerEmail]/apple.pkpass` dengan MIME `application/vnd.apple.pkpass`.
- Tambahkan tombol "Tambah ke Apple Wallet" di dialog kartu ketika file `.pkpass` sudah bisa dibuat.
- Jika pass perlu update otomatis, implementasikan PassKit web service: registrasi device, tabel device/pass/registration, token autentikasi, endpoint update, dan push notification APNs.

Catatan data: untuk Apple, tambahkan field seperti `applePassSerialNumber`, `applePassUpdatedAt`, dan token update per pass. Jangan pakai email mentah sebagai serial number publik jika ada kebutuhan privasi.

## Tahap Berikutnya

- Integrasi Google Wallet dan Apple Wallet belum aktif.
- `walletStatus` dan `qrPayload` sudah disiapkan di skema agar tahap berikutnya tidak perlu migrasi besar.
- Putuskan apakah data kartu dianggap sensitif. Jika iya, evaluasi tipe pass yang lebih privat di Google Wallet dan jangan memublikasikan gambar kartu sebagai asset wallet terbuka.

## Referensi Resmi

- Google Wallet Generic pass: https://developers.google.com/wallet/generic
- Google Wallet REST authentication: https://developers.google.com/wallet/generic/getting-started/auth/rest
- Google Wallet JWT issuing flow: https://developers.google.com/wallet/generic/use-cases/jwt
- Apple Wallet pass creation: https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/Creating.html
- Apple Wallet pass distribution: https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/DistributingPasses.html
- Apple Wallet pass updates: https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/Updating.html
