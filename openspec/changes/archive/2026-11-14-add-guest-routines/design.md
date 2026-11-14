# Design: add-guest-routines

## Context

The web app is a Next.js application (`web/`) where `proxy.ts` gates every non-public path behind an account session cookie. Account routines live in a libsql store owned per account (`web/lib/store.ts`, `users.ts`), import codes are short-lived rows that resolve anonymously (`/api/routines/resolve`), and share links are separate tokens. See proposal.md for motivation and `specs/web-guest-routines/spec.md` for the required behavior.

## Goals / Non-Goals

**Goals:**
- Guest authoring that reuses the existing routine validation, editor UI, and import-code machinery with minimal intrusion.
- Hard ephemerality: beacon-triggered delete on page leave, plus a server-enforced 24-hour TTL, plus automatic cleanup.
- Zero blast radius on accounts: no existing account query, ownership rule, or admin flow changes shape.

**Non-Goals:**
- No changes to the watch apps; code resolution stays anonymous and unchanged.
- No guest share links, no guest recovery, no guest-to-account conversion.
- No persistent guest identity beyond the workspace cookie (no fingerprinting, no cross-visit memory).

## Decisions

### 1. Separate `guest_routines` table instead of owner-less rows in `routines`

Routine: one guest workspace holds exactly one routine. Guest rows get `id`, `workspace_token`, `payload` (validated routine JSON), `created_at`, `expires_at`.

**Why:** the legacy-adoption rule ("routines without an owner get adopted on sign-in") would eat guest rows if they shared the table (see `specs/web-accounts/spec.md` delta). A separate table also keeps every existing account query untouched and makes TTL cleanup a trivial `DELETE WHERE expires_at < now`.

**Alternative rejected:** nullable `owner` on `routines` — pollutes every account-scoped query and confuses the adoption path.

### 2. Guest workspace = random-token cookie, not a signed account session

On entering as guest, the server mints a high-entropy workspace token in an HttpOnly, Secure, SameSite=Lax cookie (max-age 24h, matching the TTL cap). Guest API endpoints authorize by matching the cookie token to `guest_routines.workspace_token`.

**Why:** the existing session token carries an account name and is validated against the account configuration; a pseudo-account would trip the "session whose account no longer exists" invalidation and per-account scoping. A standalone token keeps the flows independent per spec.

**Alternative rejected:** a `guest: true` claim inside the account session — couples invalidation and rotation logic built for accounts.

### 3. Leave detection via `pagehide` + `sendBeacon` to a dedicated POST endpoint

The builder registers a `pagehide` listener (more reliable than `unload`/`beforeunload` on mobile) that calls `navigator.sendBeacon('/api/guest/routine/leave')`. The endpoint deletes the workspace's routine and its codes immediately, keying off the workspace cookie — no body needed. An explicit "Discard" action in the guest UI calls the same endpoint.

**Why:** `sendBeacon` survives page teardown but only issues POST, so a dedicated POST path avoids method-override hacks on the REST routes.

**Limitation accepted:** reloads and same-app navigations also fire `pagehide`; that matches the spec ("no recovery after leaving"), and re-entering simply starts a fresh workspace.

### 4. Guest import codes reuse the existing codes pipeline with a guest binding

Add a nullable `guest_routine_id` to the import-codes store; exactly one of `routine_id` / `guest_routine_id` is set. Resolution joins through whichever binding exists and, for guest-bound codes, also rejects when the parent routine is deleted or past `expires_at` (resolution already fails as unknown for missing/deleted rows, satisfying the spec's indistinguishability). Guests pick from the same expiration presets (15 min, 1 h, 24 h); the effective expiration is `min(preset, routine's remaining TTL)`.

**Why:** the watch-side resolution contract (v1 JSON document, rate limits, error shape) must not change; reusing the table and endpoint guarantees that with one extra join.

**Alternative rejected:** minting account-style codes against a hidden system account — would leak guest data into account/admin views, violating the no-visibility requirement.

### 5. Proxy and UI surface

`proxy.ts` gains public paths for guest pages (`/guest`) and guest API routes (`/api/guest/*`); those routes self-authorize via the workspace cookie. The login page adds a "Continue as guest" entry. The guest builder reuses the existing routine editor component against `/api/guest/routine` endpoints, renders only the import-code panel (no share-link UI), and shows the routine's remaining TTL.

**Why:** everything guest is namespaced, so the existing account gating in `proxy.ts` is extended by enumeration, not weakened.

### 6. TTL enforcement and cleanup

Server records `expires_at = created_at + 24h` at creation and checks it on every guest read and every code resolution (expired ⇒ treated as deleted). A periodic sweep deletes expired guest rows and their codes — reusing the same expired-data cleanup mechanism the app already runs for import codes.

## Risks / Trade-offs

- **Beacon loss on crash or aggressive mobile tab killing** → the routine lingers until the 24h TTL; bounded and spec-sanctioned (no UI can ever reach it again).
- **Code dies when the page closes** → the guest must finish the watch import before leaving; this is the explicitly requested behavior. The guest UI should state it next to the code panel.
- **Anonymous traffic filling storage** → per-IP rate limits on workspace creation/saves/code minting (spec: 10/min per operation, 30 workspaces/day), one routine per workspace, small validated payload, hard TTL.
- **`expires_at` vs code preset mismatch** → guest code expiration is capped at the routine's remaining TTL, so a code can never outlive its routine.

## Migration Plan

1. Additive schema migration: create `guest_routines`, add nullable `guest_routine_id` to the codes table. No existing rows are touched, so no data migration is needed.
2.Ship proxy paths, guest API routes, and the guest builder page behind the same deployment.
3. Rollback: remove the guest paths and drop `guest_routines`; orphaned `guest_routine_id` bindings are ignored by resolution (rows can be swept alongside). Authenticated features are unaffected throughout.
