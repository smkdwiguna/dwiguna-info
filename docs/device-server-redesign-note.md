# Device Presence Redesign Note

Catatan ini ditujukan untuk tim hardware dan software yang mengerjakan terminal presensi.

Masalah utama model sekarang adalah polling periodik ke `/api/device/{deviceId}`. Pola itu boros request, mudah menghabiskan limit Cloudflare Workers, dan membuat terminal terus-menerus bertanya walaupun tidak ada fingerprint yang diproses.

Arahan redesign yang disarankan:

- Ubah komunikasi menjadi event-driven.
- Request HTTP hanya dikirim saat ada event fingerprint yang nyata.
- Trigger utama komunikasi adalah scan fingerprint, bukan polling per detik.
- Sinkronisasi fingerprint juga perlu trigger baru yang tidak bergantung pada polling.
- Tampilan device bisa dipangkas: cukup jam, status hasil scan, dan pesan sukses/gagal.

Hal yang perlu diputuskan bersama sebelum implementasi:

- Format request event baru dari device ke server.
- Jenis event yang wajib didukung: scan berhasil, scan gagal, enrollment, dan kemungkinan maintenance/admin trigger.
- Apakah server masih mengirim command balik ke device, atau cukup hasil proses scan.
- Bagaimana alur sinkronisasi berjalan tanpa queue polling.
- Bagaimana last-seen / online status dihitung jika device tidak lagi rutin mengirim POST.

Rujukan kode saat ini:

- [docs/device-server-communication.md](device-server-communication.md)
- [app/api/device/[deviceId]/route.ts](../app/api/device/[deviceId]/route.ts)
- [features/presence/actions/terminals.ts](../features/presence/actions/terminals.ts)
- [features/presence/components/terminals-list-client.tsx](../features/presence/components/terminals-list-client.tsx)
