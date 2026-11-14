# Tasks: add-guest-routines

## 1. Data layer

- [x] 1.1 Add a migration creating the `guest_routines` table (`id`, `workspace_token`, `name`, `steps` JSON, `created_at`, `expires_at`) — the routine content is stored like in `routines`
- [x] 1.2 Add a nullable `guest_routine_id` column to the import-codes table, enforcing exactly one of `routine_id` / `guest_routine_id` per code (table rebuilt once, existing rows keep their account binding)
- [x] 1.3 Add `web/lib/` store functions for guest routines: create, read by workspace token, replace, delete, and expired-row sweep (rejecting reads past `expires_at`)

## 2. Guest workspace and routing

- [x] 2.1 Implement guest workspace minting: high-entropy token in an HttpOnly, Secure, SameSite=Lax cookie with 24h max-age (`web/lib/`)
- [x] 2.2 Extend `proxy.ts` public paths for the guest builder page (`/guest`) and guest API routes (`/api/guest/*`), leaving all account paths gated as today
- [x] 2.3 Add per-IP rate limiting for guest workspace creation, saves, and code minting (10/min each, 30 workspaces/day) reusing `web/lib/rateLimit.ts`

## 3. Guest routine API

- [x] 3.1 `POST /api/guest/session`: create a guest workspace and set the workspace cookie
- [x] 3.2 `POST /api/guest/routine` (create), `PUT` (edit), `PATCH`/re-create (replace previous routine and delete its codes), validated with the existing routine validation limits from `web/lib/routine.ts`
- [x] 3.3 `GET /api/guest/routine`: return the workspace's routine with its remaining TTL; expired or missing routines return empty
- [x] 3.4 `POST /api/guest/routine/leave`: beacon-safe endpoint that immediately deletes the workspace's routine and all its codes, keying off the workspace cookie

## 4. Import codes for guest routines

- [x] 4.1 `POST /api/guest/routine/codes`: mint a code with the existing presets (15 min, 1 h, 24 h), effective expiration capped at the routine's remaining TTL
- [x] 4.2 Extend code resolution to join through `guest_routine_id` and fail as unknown when the guest routine is deleted or expired, preserving the v1 document shape and existing rate limits
- [x] 4.3 Verify share-link creation rejects guest routines

## 5. Guest UI

- [x] 5.1 Add a "Continue as guest" entry on the login page that calls the session endpoint and enters the guest builder
- [x] 5.2 Build the `/guest` builder page reusing the existing routine editor component against the guest API, showing the routine's remaining TTL
- [x] 5.3 Render only the import-code panel in guest mode (no share-link UI) with a notice that the code dies when the page is left
- [x] 5.4 Register a `pagehide` listener sending `navigator.sendBeacon('/api/guest/routine/leave')`, plus an explicit "Discard" action calling the same endpoint

## 6. Cleanup and verification

- [x] 6.1 Wire the expired guest-row sweep into the existing expired-data cleanup mechanism (also removing codes of deleted/expired guest routines)
- [x] 6.2 End-to-end checks: guest creates routine → mints code → watch resolution succeeds; leave page → code fails as unknown; >24h → routine and codes gone; guest data invisible to account and admin lists
- [x] 6.3 Run `openspec validate add-guest-routines --strict` and the web app's lint/build before handoff
