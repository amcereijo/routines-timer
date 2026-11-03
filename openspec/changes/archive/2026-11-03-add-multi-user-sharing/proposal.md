## Why

The web builder was built for a single operator with one shared password, and a routine could only be handed over as a short import code for the watch. In practice more than one person builds routines, each with their own material, and a routine often has to be shown to somebody else — a coach, a family member — without giving that person an account. The authoring UI also grew cumbersome: one field per attribute, no reordering, no preview, and no way to attach the pictures and reference links a routine needs.

## What Changes

- Allow several accounts to sign in. The accounts are configured as a single JSON environment variable (`AUTH_USERS`), so no user database and no extra service are needed. Each account owns the routines it creates; an `admin` flag lets one account see every routine. `ADMIN_PASSWORD` keeps working as a single-operator fallback.
- Carry the account name inside the signed session token so pages and APIs can scope data per account instead of serving every routine to every signed-in person.
- Redesign the routine editor: routine templates, `m:ss` durations, quick-duration chips, drag-and-drop reordering, duplicate/collapse per step, live totals, a watch preview, and recovery of an unsaved draft.
- Let each step carry up to 3 images and up to 3 http(s) links. Images are shrunk in the browser and embedded in the routine, so no object storage is required.
- Add public share links (`/r/<token>`) with an expiry, a copyable URL, and the ability to discard a link — from the routine list or from the public page itself while signed in as the owner.
- Keep the watch import contract unchanged: the resolve endpoint still answers with the version-1 document, without the web-only extras.

## Capabilities

### New Capabilities

- `web-accounts`: multi-account sign-in, session identity, and per-account routine ownership.
- `routine-share-links`: public share URLs for routines, their expiry, and discarding them.
- `web-routine-extras`: per-step images and links inside a routine definition.

### Modified Capabilities

- `web-routine-builder`: the single-operator password becomes multi-account sign-in, routines become per-account, and the editor gains the new authoring affordances.

## Impact

- **Web app:** new `AUTH_USERS` environment variable, a rewritten session token (carrying the account name), an `owner` column on routines, a new `shares` table, new API routes (`/api/auth/users`, `/api/routines/[id]/shares`, `/api/shares/[token]`), a public `/r/[token]` page, and a redesigned editor and routine list.
- **Storage:** two additive migrations (routines.owner, shares table) run automatically on the first request; no manual migration step.
- **Watch app:** unchanged. The resolve endpoint keeps returning the version-1 document, with the web-only `images`/`links` stripped, so existing watch builds keep working.
- **Deployment:** Vercel keeps the same runtime configuration; only `AUTH_USERS` (or the legacy `ADMIN_PASSWORD`) is added to the environment.
