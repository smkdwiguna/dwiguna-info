# Shortlink

Fitur ini menyediakan sistem shortlink ala Bitly di bawah domain `dwiguna.info`.

## Runtime dan Storage

- Short link disimpan di database aplikasi Cloudflare D1 bernama `dwiguna-info`.
- Redirect, validasi, dan penghapusan semuanya berjalan di Next.js server action atau route handler yang dieksekusi di Cloudflare Worker runtime.
- Database adalah sumber kebenaran, bukan filesystem lokal.

## Perilaku Pengguna

- Halaman admin shortlink ada di `/shortlinks`.
- Label sidebar adalah `Tautan`.
- Judul halaman adalah `Tautan Singkat`.
- Setiap akun hanya melihat shortlink yang dibuat sendiri.
- Form create menerima URL asal dan slug opsional.
- Jika slug kosong, server akan membuat slug acak yang aman dipakai di URL.

## Validasi

- URL asal harus valid dengan skema `http` atau `https`.
- Slug kustom hanya boleh berisi huruf, angka, `-`, dan `_`.
- Slug kustom tidak boleh kosong jika user memang ingin menimpa slug otomatis.
- Slug ditolak bila bentrok dengan route aplikasi yang sudah dipakai.
- Server memeriksa ketersediaan slug sekali lagi saat create, jadi validasi UI bukan satu-satunya pengaman.

## Route Handling

- Membuka `/{slug}` mengarah ke redirect server-side ke URL asli yang tersimpan.
- Request `GET` menaikkan `click_count`.
- Request `HEAD` memberi redirect yang sama tanpa menaikkan `click_count`.
- Jika slug tidak ditemukan, aplikasi mengalihkan ke `/shortlink-not-found` dengan status `301`.

## Permission Model

- Akses halaman shortlink dilindungi permission `shortlink`.
- Superuser tetap bisa membuka halaman tanpa permission itu secara eksplisit.
- Permission yang sama tersedia di halaman access management agar bisa diatur seperti permission `users`.

## Route Safety

- Shortlink memakai route root `app/[slug]/page.tsx`.
- Daftar slug reserved harus tetap sinkron dengan route aplikasi nyata.
- Saat route baru ditambahkan, update `SHORT_LINK_RESERVED_SEGMENTS` di `lib/short-links.ts` dan dokumen route safety di saat yang sama.
