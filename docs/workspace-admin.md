# Workspace Admin

This feature covers the dashboard shell, user access management, and bulk user administration flows.

## Scope

- Dashboard shell and sidebar live in `features/workspace-admin/components/admin-layout.tsx`.
- User access management lives in `features/workspace-admin/components/access-management-client.tsx`.
- Bulk upload, photo updates, password reset, and user editing actions live under `features/workspace-admin/actions/`.

## Runtime

- The feature runs in the Cloudflare Worker runtime.
- Admin pages rely on server actions and database-backed user/session state.
- Do not assume local filesystem persistence for any of the admin flows.

## Permissions

- `users` grants access to user management.
- `shortlink` grants access to short-link management.
- `presence.view`, `presence.edit.sheets`, and `presence.edit.attendances` belong to the presence feature.
- Superusers bypass individual permission checks.

## Route ownership

- `/users` shows the user list.
- `/bulk-upload` handles user creation/import.
- `/access` manages permission assignment.
- `/settings` is part of the admin area and is exposed to superusers.

## Notes

- When adding a new admin feature, register its permission in the access management UI and wire it into the sidebar.
- Keep the dashboard layout centralized so navigation stays consistent.
