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
- `requirePermissionOrRedirect()` is a route guard used for pages that require a specific global permission string.
  - Note: some features (like Inventory) allow users to access specific resources based on membership rather than a single global permission string. The `inventory` permission string is intended for global inventory administration (creating inventories, global admin actions), while access to view specific inventories is determined by per-inventory membership stored in the database.
- Inventory records no longer have a description field. The database schema stores only the inventory name and creation timestamp.
- Inventory transfer is a stock movement between two inventories. The source inventory records an `OUT`, the destination inventory records an `IN`, and the destination item is created automatically when it does not already exist.
- Superusers bypass individual permission checks.

## Dashboard pages

- The dashboard shell is powered by `features/workspace-admin/components/admin-layout.tsx`.
  - The sidebar is assembled there. For some features (for example Inventory), visibility can be driven by per-resource membership checks (the sidebar will show Inventaris if the user has membership in any inventory) rather than a single global permission string.
  - The Inventory menu should include a submenu of all inventories the current user can access.
  - New feature pages should add their sidebar entries there and, if appropriate, implement membership-based visibility instead of a single permission string.

## Short-link route safety

- The short-link system uses a root route `app/[slug]/page.tsx`.
- Reserved slugs are blocked in server-side validation to avoid conflicts with existing app routes.
- The current reserved set includes:
  - `login`
  - `users`
  - `access`
  - `presence`
  - `inventory`
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
