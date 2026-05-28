# Shortlink

This feature adds a Bitly-style shortlink system under the `dwiguna.info` domain.

## Runtime and storage

- Short links are stored in the Cloudflare D1-backed application database named `dwiguna-info`.
- Redirects, validation, and deletion all run through Next.js server actions or route handlers executed in the Cloudflare Worker runtime.
- Do not treat the feature as file-based or Node-local; the database is the source of truth.

## User-facing behavior

- The admin page lives at `/shortlinks`.
- The sidebar label is `Tautan`.
- The page title is `Tautan Singkat`.
- Each account only sees the short links it created.
- The create dialog accepts:
  - the original URL
  - an optional custom slug
- If the slug is empty, the server generates a random URL-safe slug.

## Validation rules

- The original URL must be a valid `http` or `https` URL.
- Custom slugs may only contain letters, numbers, `-`, and `_`.
- Custom slugs cannot be empty if the user wants to override the generated value.
- Slugs are rejected when they conflict with reserved app routes.
- The server validates slug availability again during creation, so the UI check is not the only guard.

## WARNING

If you add a new top-level route, feature page, or system route in the future, update the reserved slug list in `lib/short-links.ts` inside `SHORT_LINK_RESERVED_SEGMENTS` at the same time. If you forget this, the new route can be broken by an accidental shortlink slug collision.

## Database

The feature uses the `short_links` table.

Fields:

- `id`
- `slug`
- `original_url`
- `created_by_email`
- `created_at`
- `click_count`

## Route handling

- Visiting `/{slug}` returns a server-side `301` redirect to the stored original URL.
- `GET` requests increment `click_count`.
- `HEAD` requests return the same redirect without incrementing `click_count`.
- If the slug does not exist, the app returns `404`.

## Permission model

- Access is protected by the `shortlink` permission.
- Superusers can open the page without explicitly having that permission.
- The same permission is exposed in the access management page so it can be assigned like the existing `users` permission.
