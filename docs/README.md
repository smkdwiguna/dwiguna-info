# Dwiguna.Info Documentation

Folder ini berisi catatan implementasi yang mengikuti kondisi kode saat ini. Jika perilaku aplikasi berubah, dokumen di sini juga harus ikut berubah pada commit yang sama.

## System Docs

- [Access, Routes, and Fallback Pages](access-and-routing.md)
- [Device ↔ Server Communication](device-server-communication.md)
- [Catatan Tim Firmware / Hardware (ESP32)](device-firmware-team-notes.md)
- [Device Presence Redesign Note](device-server-redesign-note.md)
- [Open Source Licenses](open-source-licenses.md)

## Feature Docs

- [Inventory](inventory.md)
- [Presence](presence.md)
- [Shortlink](shortlink.md)
- [Site Shell and User Management](workspace-admin.md)
- [Access Management](access-management.md)
- [Academic](academic.md)

## Maintenance Notes

- Simpan perilaku khusus fitur di dokumen fitur masing-masing.
- Simpan konvensi route, redirect, dan permission di dokumen akses/routing.
- Jika sebuah fitur baru menambah tabel database atau server action, tulis halaman pemiliknya dan gate aksesnya di sini.
- Sebutkan runtime secara eksplisit bila perilaku bergantung pada Cloudflare Workers, D1, atau OpenNext.
- Jika menambah route baru yang bisa bentrok dengan shortlink, update `SHORT_LINK_RESERVED_SEGMENTS` di `lib/short-links.ts` dan dokumen route safety pada saat yang sama.
- Jika dependency package berubah, update [Open Source Licenses](open-source-licenses.md) dan dialog footer dashboard.
