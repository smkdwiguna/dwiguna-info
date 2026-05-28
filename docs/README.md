# Dwiguna.Info Documentation

This folder collects implementation notes for the main systems and feature areas in the app.

## System docs

- [Device ↔ Server Communication](device-server-communication.md)
- [Access, Routes, and Fallback Pages](access-and-routing.md)

## Feature docs

- [Shortlink](shortlink.md)
- [Workspace Admin](workspace-admin.md)
- [Presence](presence.md)
- [Inventory](inventory.md)

## Notes

- Keep feature-specific behavior in feature docs.
- Keep route and permission conventions in the access/routing notes.
- If a new system adds a database table or server action, document the owning page and the permission gate here.
- Note the runtime explicitly when a feature depends on Cloudflare Workers, D1, or OpenNext behavior.
- For any new route or feature page that could conflict with short links, update `SHORT_LINK_RESERVED_SEGMENTS` in `lib/short-links.ts` and the route-safety notes in `docs/access-and-routing.md` immediately.
