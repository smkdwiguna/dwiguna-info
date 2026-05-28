# Access, Routes, and Fallback Pages

This repo uses a simple permission-string model and route-group based dashboard pages.

## Runtime

- The app runs on Cloudflare Workers through OpenNext.
- Persistent application data is stored in Cloudflare D1.
- Server actions and route handlers should be written with the Worker runtime in mind, not a Node-only filesystem or local SQLite assumption.

## Database Strategy

- Prefer one D1 database for the whole app.
- Separate features by tables and migrations, not by creating a new database for every feature.
- The Cloudflare D1 database name is `dwiguna-info`.
- The Cloudflare runtime binding should use a camelCase name such as `dwigunaInfo`.

## Permission model

- Permissions are stored as comma-separated strings in the Google Workspace custom schema.
- `normalizeAccessList()` is used to compare permissions consistently.
- `requirePermissionOrRedirect()` is the main guard for dashboard pages.
- Superusers bypass individual permission checks.

## Dashboard pages

- The dashboard shell is powered by `features/workspace-admin/components/admin-layout.tsx`.
- The sidebar is assembled there from permission checks.
- New feature pages should add their sidebar entries there and register their permission in the access management UI.

## Short-link route safety

- The short-link system uses a root route `app/[slug]/page.tsx`.
- Reserved slugs are blocked in server-side validation to avoid conflicts with existing app routes.
- The current reserved set includes:
  - `login`
  - `users`
  - `access`
  - `presence`
  - `bulk-upload`
  - `shortlink`
  - `settings`
  - `api`
  - `_next`

### Important maintenance note

Whenever a new route, page, or feature is introduced, check whether it should be reserved for short links and update `SHORT_LINK_RESERVED_SEGMENTS` in `lib/short-links.ts` accordingly. Keep this file and `docs/shortlink.md` in sync so the reservation list does not drift from the actual route tree.

## Fallback pages

- `app/not-found.tsx` customizes the global 404 screen.
- `app/error.tsx` customizes the global error boundary.
- `app/loading.tsx` customizes the top-level loading state.

## Keeping docs current

- Add a short note here whenever a new top-level route or permission is introduced.
- If a route is meant to be reserved for short links, add it to both code validation and this note.
- If you change the route tree, also update `SHORT_LINK_RESERVED_SEGMENTS` in `lib/short-links.ts` immediately so shortlink collisions cannot happen later.
