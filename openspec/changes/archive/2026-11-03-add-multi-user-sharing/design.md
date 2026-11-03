## Context

See proposal.md - Why for motivation. Current state shaping the approach:

- The web app (`web/`) is a Next.js 16 App Router app on Vercel. Storage is Turso/libSQL (`routines`, `codes`, `rate_hits` tables, created idempotently on the first request). Auth is a single `ADMIN_PASSWORD` plus an HMAC-signed session cookie (`<expiryMs>.<hexSignature>`), verified by the edge `proxy.ts`.
- The session token carries no identity, so the API cannot tell accounts apart and every signed-in person would see the same routines.
- The routine contract (document version 1) is shared with the watch app (`zepp_app/utils/routineDoc.js`): the watch only understands `name`, `seconds`, `repeat`, `rest`, and rejects any document whose `version` is not 1. Changing the contract would break every deployed watch build.
- The deployment must not grow new services: the operator wants the accounts to live in an environment variable and everything to keep working on the existing Vercel + Turso setup.

## Goals / Non-Goals

**Goals:**

- Several accounts on the same deployment, configured in one environment variable, with per-account routine ownership.
- Public, revocable URLs for routines.
- Per-step images and links without adding an object-storage service.
- A faster routine editor.
- Zero changes for the watch app and zero manual migration steps.

**Non-Goals:**

- Password hashing in the database, password resets, invitations, or e-mail — the account list is configuration, not a registry.
- Editing a shared routine by the visitor, comments, or analytics on shared links.
- Images or links on the watch; the watch keeps the plain version-1 document.

## Decisions

### 1. Accounts as JSON in `AUTH_USERS`, with `ADMIN_PASSWORD` as fallback

The account list is parsed from one environment variable (`AUTH_USERS`), accepting both an array of objects and an object map. Entries with an unusable username or an empty password are ignored; a parse failure falls back to the legacy `ADMIN_PASSWORD`, so a typo can never lock the operator out of their own deployment. Passwords stay plaintext in the environment, exactly like `ADMIN_PASSWORD` does today — the environment is already the secret store.

Alternatives considered: a `users` table in Turso (adds a write path, a password-hashing policy, and an admin UI for something that changes twice a year); a JSON file in the repo (not an environment variable, not rotatable without a redeploy); Clerk/Auth.js (external accounts and dependencies for a handful of family members).

### 2. The session token carries the account name

The token becomes `<expiryMs>.<base64url(username)>.<signature>`, with the signature computed over the expiry *and* the user part, so the name cannot be swapped. The account is therefore authenticated, not just "somebody is logged in", and the API can scope queries.

Alternatives considered: a second cookie with the account name (unsigned, forgeable); a session table (more state to clean up, and the token already carries everything needed).

### 3. Ownership on the routine row, admins see everything

`routines.owner` stores the lowercased username. Lists and every mutation filter on it; an account flagged `admin` in the configuration bypasses the filter. Routines created before accounts existed keep an empty owner and are adopted by the first account that signs in, which keeps an existing deployment working after the upgrade.

Alternatives considered: one workspace with a shared routine list (then "sign in as someone else" changes nothing and the accounts are pointless); per-routine ACLs (a share link already covers the "show it to somebody" case).

### 4. Share links as rows with a random token

A `shares` table (`token` PK, `routine_id`, `created_by`, `created_at`, `expires_at`) backs the public pages at `/r/<token>`. The token is a 24-character random string from a URL-safe alphabet; `expires_at = 0` means "never". Discarding deletes the row, so the URL stops working immediately — no tombstone, no soft delete, no extra state to reason about.

Alternatives considered: a signed token carrying the routine id (no revocation — a discarded link would keep working until the signature expired, which is exactly what the requirement forbids); storing the link on the routine row (only one link per routine, no independent expiry).

The discard action exists in two places: in the routine list (always) and on the public page (only when the visitor is signed in as the owner). The API checks the owner, so an anonymous visitor can never discard somebody else's link.

### 5. Images embedded in the routine, shrunk in the browser

Images are stored as `data:` URLs inside the routine's steps JSON. The browser downscales them (longest edge ≤ 1024 px) and re-encodes them (JPEG below 150 KB, PNG kept when it fits) before the save request; the server re-validates the data URL, the MIME type, and the size. A routine payload is capped at 2 MB, and the whole routine is rejected with a field error when it exceeds that.

Alternatives considered: Vercel Blob (needs a `BLOB_READ_WRITE_TOKEN` and a second service to operate, for a feature used on a handful of steps); storing raw files in Turso (no benefit over embedding, and no way to render them without serving them through the app anyway).

The images are a web-only extra: the resolve endpoint strips them, so the watch keeps receiving the exact version-1 document it parses today.

### 6. The editor stays a client component, the draft lives in localStorage

The editor is loaded with `next/dynamic` (`ssr: false`) because it reads its unsaved draft from `localStorage` while the first state is built; without that, the server render and the first client render would disagree. The draft is written on every change (debounced) and restored only when it is newer than the stored routine.

### 7. Additive migrations only

`routines.owner` is added with `ALTER TABLE ... ADD COLUMN` and the `shares` table with `CREATE TABLE IF NOT EXISTS`; both run on the first request and both are idempotent (`duplicate column` errors are swallowed). There is no manual migration step on Vercel, matching how the schema has always been created.

## Risks / Trade-offs

- **Plaintext passwords in the environment** → same exposure as the current `ADMIN_PASSWORD`; mitigated by keeping the variable out of the repository, rotating it like `SESSION_SECRET`, and by the login rate limit.
- **Embedded images grow the routine rows** → the 2 MB payload cap and the 150 KB per-image target bound it; a routine with many pictures is rejected with a clear message.
- **Account names are case-insensitive but stored lowercased** → a rename in `AUTH_USERS` orphans the old routines; the owner column is compared case-insensitively, and the admin flag is the escape hatch.
- **The public page is a full copy of the routine** → anyone with the URL sees it; that is the point of the feature, and discarding the link revokes it.
- **A shared routine is not editable by the visitor** → deliberate; editing requires an account, otherwise the shared copy could be poisoned.

## Migration Plan

1. Set `AUTH_USERS` in the Vercel project (and keep `ADMIN_PASSWORD` during the transition, so the legacy path still works).
2. Deploy. The first request adds `routines.owner` and the `shares` table; existing routines keep an empty owner and are adopted by the first account that signs in.
3. Rollback: redeploy the previous version. The extra column and table are ignored by the old code; the new session token format invalidates old cookies, so users sign in again.

## Open Questions

- Whether shared links should ever be password-protected or restricted to signed-in accounts. Both are additive to the current model (extra columns on `shares`, one extra check on the page) and can be decided later without changing the specs.
