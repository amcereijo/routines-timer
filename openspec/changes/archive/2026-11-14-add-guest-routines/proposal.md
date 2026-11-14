# Proposal: add-guest-routines

## Why

Watch users who only want to push one routine to their watch must currently sign in with a configured account before they can use the web builder. That friction drives away occasional users: they just want to compose a routine in the browser, transfer it to the watch with an import code, and leave nothing behind.

## What Changes

- The login page gains a "continue as guest" option that opens the routine builder without username or password.
- A guest authors exactly one routine at a time. The routine is persisted server-side so the watch can resolve its import code, but it is ephemeral:
  - It disappears when the guest leaves or closes the page (active deletion via a sendBeacon-triggered endpoint).
  - Otherwise it expires automatically after 24 hours.
- A guest routine can only mint import codes for the watch. Public share links are NOT offered for guest routines, and no link can be generated for them.
- The guest routine is unrecoverable by design: there is no session restore, no list of past routines, and no way back once the page is abandoned. When a guest creates a new routine, the previous one is replaced.
- Guest flows are rate-limited like the existing public surfaces, and guest data is cleaned up automatically.

## Capabilities

### New Capabilities

- `web-guest-routines`: Anonymous, ephemeral routine authoring on the web app — guest entry, single-routine lifecycle (create, edit, replace), active deletion on page leave, 24-hour expiration, and code-only transfer to the watch.

### Modified Capabilities

- `web-routine-builder`: The "Operator authentication" requirement changes — the builder pages are no longer restricted to authenticated accounts only; a carve-out admits the guest authoring flow.
- `web-accounts`: The "Per-account routine ownership" requirement changes — "every routine records the account that created it" must be scoped to account-created routines so ephemeral guest routines without an owner are exempt.

## Impact

- **Web app (`web/`)**: login page (guest entry), builder pages (guest mode), proxy/middleware auth rules, routine API routes (guest create/edit/replace/delete), new beacon deletion endpoint, import-code issuance for guest routines, periodic cleanup of expired guest rows.
- **Data layer**: guest routines need storage distinct from owned account routines (separate table or owner-less rows) with TTL fields.
- **Watch apps (`zepp_app/`, `huawei_app/`)**: none — import-code resolution is unchanged and already anonymous.
- **Existing authenticated features**: share links, per-account lists, and admin views are untouched; guests never appear in them.
