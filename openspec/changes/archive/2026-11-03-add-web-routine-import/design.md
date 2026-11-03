## Context

See proposal.md - Why for motivation. Current state shaping the approach:

- The watch app lives in `zepp_app/` (Zepp OS API 3.0, target 3.7, Amazfit Balance 480×480). Pages: `home`, `create`, `saved`, `run`. Routines persist in `localStorage` key `saved_routines` as `[{ id, name, steps: [{ seconds, name, repeat?, rest? }] }]` via `utils/storage.js` (`addRoutine` already provides same-name overwrite and `MAX_SAVED = 10` oldest-first eviction). Limits today: `MAX_STEPS = 20`, on-screen keyboard caps names at 18 chars, default rest 10 s. There is no networking code and no `app-side` module yet; only permission is `device:os.local_storage`. A reusable on-screen keyboard exists at `utils/keyboard.js`.
- The repo root has no web project. Per the planning request, the web app is a **new top-level `web/` folder** and will be **hosted on Vercel**.
- Two deployable units result: the web app (`web/`) and the updated watch app (`zepp_app/`).

## Goals / Non-Goals

**Goals:**

- Next.js (App Router) web app in `web/`, deployable to Vercel as-is, covering the `web-routine-builder` and `routine-import-codes` capabilities.
- Watch update in `zepp_app/` covering the `watch-routine-import` capability, reusing the existing save path unchanged.
- One shared versioned routine-document contract (v1) between web and watch, with identical validation limits on both sides.

**Non-Goals:**

- Multi-user accounts, organizations, or per-watch identities.
- Code revocation UI or single-use/redemption-count codes (codes stay valid until expiry; expiry is short and rate limiting covers guessing).
- Editing imported routines on the web after import, or syncing watch→web.
- A shared code package between `web/` and `zepp_app/` (limits are duplicated deliberately; see Decisions).
- Changes to existing Create/Run/Edit/Delete watch behavior.

## Decisions

### 1. Web stack: Next.js App Router in `web/` on Vercel (user-selected)

One framework serves the authenticated builder UI (React Server Components) and the API routes (`app/api/*`) in a single Vercel deployment. Alternatives considered: static SPA + separate serverless API, or an Express backend — both add a second deployable and config surface for a single-operator tool, so they were rejected.

### 2. Storage: Turso (libSQL over HTTP) for routines, codes, and rate limits

Turso is used for the operator's other projects and is a native Vercel Marketplace integration (Vercel KV was sunset, so no first-party KV exists any more). The data model is tiny and relational, so SQLite fits: `routines` (id, name, steps JSON), `codes` (code PK, routine_id, created_at, expires_at), `rate_hits` (scope, client, ts). Accessed with `@libsql/client`, which is fetch-based and therefore serverless-friendly with no native dependencies.

Code expiry has no native TTL in SQL, so it is enforced on read (`expires_at > now`) and expired rows are pruned lazily on every write/list — the server still rejects expired codes exactly like a TTL would, and the table self-cleans without a cron job. Uniqueness of codes comes from the primary key; the (astronomically unlikely) collision retries with a fresh random code. Sliding-window rate limits are `DELETE` stale hits → `INSERT` current hit → `COUNT` per (scope, client). Local development runs against a plain SQLite file (`TURSO_DATABASE_URL=file:./dev.db`), so no extra service is needed to run or test the app.

Alternatives considered: Upstash Redis via the Marketplace (fine, but a second vendor/DB type alongside the operator's existing Turso usage, and requires Redis TTL semantics that SQL can emulate); Neon/Postgres (heavier than needed for a single-operator tool).

### 3. Auth: env password + HMAC-signed session cookie

Single operator password in `ADMIN_PASSWORD` env var; session secret in `SESSION_SECRET`. Login route verifies the password (constant-time compare), then issues an HttpOnly, Secure, SameSite=Lax cookie containing an HMAC-signed token with a 12 h expiry; `middleware.ts` verifies the signature/expiry on protected routes using the Web Crypto API (edge-compatible, zero extra deps). Alternatives considered: Auth.js or Clerk — unnecessary dependencies and external accounts for one operator. Login attempts are rate-limited (5 per 5 min per IP) using the same KV counter mechanism as resolution.

### 4. Import code: 8 chars × 30-symbol alphabet, presets 15 min / 1 h / 24 h

Alphabet: `ABCDEFGHJKMNPQRSTVWXYZ23456789` (unambiguous, drops 0, 1, I, L, O, U) → ~39 bits of entropy per code. Combined with ≤10 resolve attempts/min/IP and a maximum 24 h lifetime, brute force is infeasible (≤14 400 attempts against a 30^8 space). Unknown, expired, and malformed codes all return the same generic 404, leaking nothing about which codes exist. Alternative considered: 6-char codes (~29 bits) — rejected as too weak even rate-limited.

### 5. Routine document contract v1

```json
{ "version": 1, "name": "HIIT", "steps": [{ "name": "Work", "seconds": 30, "repeat": 3, "rest": 10 }] }
```

Resolution endpoint: `GET /api/routines/resolve?code=XXXXXXXX` → `200` + document, or generic `404`, or `429` when rate-limited. `repeat`/`rest` may be omitted (watch applies its existing defaults: 1 and 10). Validation limits (18-char names, ≤20 steps, 5–3599 s, printable ASCII only so the watch font can render every imported name) live in one constants module per codebase; the spec files are the contract that keeps them in sync, so no shared package is introduced.

### 6. Watch transport: ZML messaging + app-side service as HTTPS proxy

Device pages cannot rely on direct internet access; the supported path per the proposal is the phone. Implementation: device app uses ZML (`messaging` request/response) to ask the app-side service to fetch; the app-side service (`app-side/index.js`, registered as a new `module.app-side` in `app.json`) runs in the Zepp phone app and performs the HTTPS `fetch` to the resolve endpoint, returning the raw JSON text. The watch parses and validates it itself so the phone never needs to be trusted with validation. `page/import` is registered in `app.json` and reuses `utils/keyboard.js` with its charset restricted to the code alphabet; Home gains a second bottom-bar button ("Import") alongside "+ New". The resolve base URL is a single watch-side constant pointing at the deployment; it is **injected at build time** from the `RESOLVE_BASE_URL` environment variable (or `.env`) by `zepp_app/scripts/write-config.js`, which writes `utils/generatedConfig.js` before `zeus build`. This keeps the deployed URL out of source edits and lets one codebase be built against staging and production. Errors map to the five feedback states in the spec by inspecting messaging errors vs. HTTP status vs. validation results.

### 7. Save path reuse, zero migration

Import calls the existing `addRoutine(name, steps)` unchanged, inheriting same-name overwrite and eviction semantics — one of the proposal's explicit goals (no special cases after import).

## Risks / Trade-offs

- **Phone-side dependency**: imports silently fail when the Zepp app is killed/disconnected → dedicated "phone must be connected" feedback state; documented limitation, acceptable because creation-on-watch remains untouched.
- **Plaintext env password**: acceptable for single operator; mitigated by login rate limiting and 12 h sessions → rotate `SESSION_SECRET` to invalidate all sessions instantly.
- **SQL instead of Redis TTLs**: code expiry is enforced at read time and expired rows are pruned lazily, so a database that is never touched keeps stale rows until the next write. Irrelevant at this scale (single operator, a handful of codes).
- **SQLite write concurrency**: Turso serializes writes; the app issues only tiny statements, so contention is a non-issue for one operator.
- **Trust boundary on the phone**: app-side service forwards untainted JSON text only; all validation happens on the watch, so a compromised response cannot corrupt watch storage (spec: pre-save validation).
- **Charset mismatch**: web could accept names the watch cannot render → both sides restrict names to printable ASCII (`0x20`–`0x7E`), enforced in specs on both capabilities.

## Migration Plan

1. Provision the Vercel project + a Turso database (Marketplace integration or an existing database); set `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_PASSWORD`, `SESSION_SECRET`; deploy `web/`. The schema is created automatically on first request.
2. Set the watch-side resolve base URL constant to the deployment URL; build `zepp_app` (`zeus build`) and sideload/update.
3. Rollback: redeploy previous web version, and/or remove the Import entry by shipping the prior watch build. No data migration exists (new feature; watch storage format untouched).

## Open Questions

- Exact ZML request/response API surface (method names, payload size limits) will be confirmed against the installed `zml` package during implementation; an 8-char code + v1 document (~1 KB) is well within typical limits.
- Whether the Vercel deployment URL is a custom domain or `*.vercel.app` — only affects the watch-side base-URL constant.
