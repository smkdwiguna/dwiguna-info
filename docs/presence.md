# Presence

This feature covers attendance dashboards, terminal synchronization, device-user mapping, and attendance sheet management.

## Scope

- The main dashboard page lives at `app/(dashboard)/(admin)/presence/page.tsx`.
- Supporting views live under `app/(dashboard)/(admin)/presence/`.
- Data access is implemented with the schema in `lib/db/schema.ts` and server-side reads through `lib/db/index.ts`.

## Runtime and storage

- The feature runs as server-rendered admin pages in the Cloudflare Worker runtime.
- Data is read from Cloudflare D1.
- Attendance and device sync behavior should be implemented through server actions or route handlers, not local state.

## Main data areas

- `attendanceSheets`
- `schedules`
- `sheetTargets`
- `presencePoints`
- `presenceLogs`
- `deviceUsers`

## Route structure

- `/presence` shows the overview dashboard.
- `/presence/sheets` manages attendance sheets.
- `/presence/terminals` manages device terminals and sync state.
- `/presence/device-users` manages device-user fingerprint mappings.

## Permissions

- The presence area is superuser-only in the dashboard shell.
- If a future permission gate is added, document it here and in the access management UI.

## Notes

- Keep terminal sync behavior documented together with the device protocol.
- Any new table or admin action for presence should be listed here so the feature stays easy to trace.
