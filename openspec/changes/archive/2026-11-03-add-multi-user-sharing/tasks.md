## 1. Account configuration and sessions

- [x] 1.1 Add `lib/users.ts`: parse `AUTH_USERS` (array and object-map forms), ignore unusable entries, fall back to `ADMIN_PASSWORD` as a single `admin` operator
- [x] 1.2 Extend the session token to `<expiryMs>.<base64url(username)>.<signature>` with the signature covering both parts (`lib/base64.ts`, `lib/session.ts`)
- [x] 1.3 Add `lib/auth.ts` (`getRequestUser`, `canAccessOwnedResource`, `ownerKey`) and `lib/currentUser.ts` (session cookie → account for server components)
- [x] 1.4 Update the login route to check username + password, issue the account-bearing session, and adopt owner-less routines
- [x] 1.5 Add the public `GET /api/auth/users` route (usernames and display names only) and rework the login page with a username field

## 2. Per-account routine ownership

- [x] 2.1 Add the `owner` column to `routines` and the `shares` table to the schema, applied idempotently on the first request (`lib/db.ts`)
- [x] 2.2 Scope the store to owners: `listRoutines(owner)`, `createRoutine(..., owner)`, `claimLegacyRoutines(owner)` (`lib/store.ts`)
- [x] 2.3 Enforce ownership in the routine API: list, create, read, update, delete, and the import-code routes
- [x] 2.4 Scope the routine list page and the edit page to the signed-in account, showing the owner only when it differs

## 3. Routine extras (images, descriptions, links)

- [x] 3.1 Extend `RoutineStep` with `images`, `description` and `links` and add the limits (3 images, 3 links, 200 KB per image, 500 chars per link, 500 chars per description, 2 MB per routine)
- [x] 3.2 Validate images (embedded PNG/JPEG/WebP/GIF data URLs), descriptions (optional text, ≤ 500 chars) and links (`http`/`https` only) in `validateRoutine`
- [x] 3.3 Strip the extras from the resolve endpoint so the watch keeps receiving the plain version-1 document
- [x] 3.4 Add `lib/images.ts`: browser-side downscale and re-encode (longest edge ≤ 1024 px, ≤ 150 KB per image)
- [x] 3.5 Add the description to the editor (textarea with counter) and to the public share page (line breaks preserved)

## 4. Public share links

- [x] 4.1 Add the `shares` store: create (random token, expiry presets), list, get, delete, lazy pruning of expired rows
- [x] 4.2 Add `GET`/`POST /api/routines/[id]/shares` and `DELETE /api/shares/[token]`, with the owner check on both
- [x] 4.3 Add the public page `/r/[token]` showing the routine, its images, and its links, with the owner-only discard action
- [x] 4.4 Add the share panel to the routine list: create a link, copy the URL, open it, discard it, see its expiry
- [x] 4.5 Let the proxy serve `/r/*` publicly and keep every other route authenticated

## 5. Routine editor redesign

- [x] 5.1 Rework the editor: templates, `m:ss` durations, quick-duration chips, drag-and-drop reordering, duplicate, collapse, insert-below
- [x] 5.2 Add live totals (total and work time, matching the watch's repetition and rest semantics) and a watch preview
- [x] 5.3 Add the image picker with thumbnails and the link editor, wired to the shared validator
- [x] 5.4 Add localStorage draft saving and recovery; load the editor client-side (`next/dynamic`) to keep the first render in sync
- [x] 5.5 Refresh the stylesheet and the routine list layout for the new components

## 6. Verification and documentation

- [x] 6.1 Type-check, lint, and production build
- [x] 6.2 End-to-end test against a local database: sign in as two accounts, verify isolation, CRUD, share link creation, public page, discard, import code, resolve
- [x] 6.3 Verify the legacy configuration (`ADMIN_PASSWORD` only) still signs in
- [x] 6.4 Update `.env.example` and `README.md` with `AUTH_USERS`, the share links, and the new editor
