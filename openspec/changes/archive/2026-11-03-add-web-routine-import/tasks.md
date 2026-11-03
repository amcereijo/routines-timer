## 1. Web app scaffold (`web/`)

- [x] 1.1 Create a Next.js (App Router, TypeScript) project in the new top-level `web/` folder with ESLint and App Router defaults
- [x] 1.2 Add dependencies: Turso libSQL client (`@libsql/client`) for storage and rate limiting; no auth framework (per design decision 3)
- [x] 1.3 Add a routine-shared module with the contract types and limits (version 1 document shape, 8-char code alphabet `ABCDEFGHJKMNPQRSTVWXYZ23456789`, name/step/duration/repeat/rest limits) plus a `validateRoutine()` returning per-field errors

## 2. Web storage layer

- [x] 2.1 Implement routine persistence in Turso: `routines` table (id, name, steps JSON, timestamps) with create/read/update/delete
- [x] 2.2 Implement import-code persistence in Turso: `codes` table (code PK, routine_id, created_at, expires_at) with server-side expiry enforcement, lazy pruning of expired rows, primary-key collision retry, and delete-by-routine on routine deletion
- [x] 2.3 Implement sliding-window rate-limit counters in Turso (`rate_hits` table): resolve ≤10/min/IP, login ≤5/5min/IP

## 3. Web authentication

- [x] 3.1 Implement login/logout API routes: constant-time password check against `ADMIN_PASSWORD`, HMAC-signed 12 h session token (`SESSION_SECRET`), HttpOnly + Secure + SameSite=Lax cookie
- [x] 3.2 Add edge `middleware.ts` verifying session signature/expiry; redirect unauthenticated page requests to `/login` and reject unauthenticated API requests
- [x] 3.3 Build the `/login` page with a generic error message and rate-limited submissions

## 4. Web routine builder UI + API

- [x] 4.1 Build the routine list page (name, total duration, edit/delete/code actions) — the post-login landing page
- [x] 4.2 Build the routine editor (create/edit) with an ordered step editor (name, seconds, optional repeat/rest) applying the shared validation client- and server-side via CRUD API routes
- [x] 4.3 Implement routine deletion that also invalidates all of its active codes

## 5. Import codes (web)

- [x] 5.1 Implement code generation API: crypto-random 8-char codes, expiration presets (15 min / 1 h / 24 h), uniqueness among active codes
- [x] 5.2 Build the code UI: display the newly generated code and list active codes per routine with remaining lifetime
- [x] 5.3 Implement the public `GET /api/routines/resolve?code=...` route: 200 + v1 document for active codes, generic 404 for unknown/expired/malformed/orphaned codes, 429 past the rate limit; error bodies carry no routine content

## 6. Web deployment

- [x] 6.1 Configure the Vercel project: Turso database + env vars (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_PASSWORD`, `SESSION_SECRET`), and deploy
- [x] 6.2 Verify production behavior end to end: login, CRUD, code generation, resolution, expiry, and rate limiting

## 7. Watch configuration (`zepp_app/`)

- [x] 7.1 Register `page/import` and a new `module.app-side` (`app-side/index.js`) in `app.json`, and add the ZML dependency to `package.json`
- [x] 7.2 Add a constants entry for the resolution base URL (injected at build time from the `RESOLVE_BASE_URL` env var via `scripts/write-config.js`), the 8-char code alphabet, and the document validation limits mirroring the web module

## 8. Watch app-side service

- [x] 8.1 Implement `app-side/index.js`: on messaging request carrying a code, `fetch` the resolve endpoint over HTTPS and return status + raw body text to the device
- [x] 8.2 Handle and report fetch/network errors distinctly from HTTP statuses so the device can map feedback states

## 9. Watch import page

- [x] 9.1 Create `page/import` reusing `utils/keyboard.js` restricted to the code alphabet and 8 characters max, with a gated Import button
- [x] 9.2 Wire the Import action to send the code via ZML request, showing loading state and the five feedback outcomes (success, invalid/expired, phone disconnected, network failure, invalid data)

## 10. Watch validation and save

- [x] 10.1 Implement the watch-side document validator (JSON parse, version == 1, name/step/duration/repeat/rest limits, printable ASCII) that never mutates storage on failure
- [x] 10.2 On success, save via the existing `addRoutine(name, steps)` and confirm the import to the user

## 11. Watch entry point and polish

- [x] 11.1 Add the Import button to the home screen next to "+ New" and add all new strings to `page/i18n/en-US.po`
- [x] 11.2 Verify `zeus build` succeeds for the updated app

## 12. End-to-end verification

- [x] 12.1 Manual end-to-end test: create a routine on the web, generate a code, import it on the watch, and run/edit/delete it as a normal routine
- [ ] 12.2 Negative tests: unknown code, expired code, code for a deleted routine, disconnected phone, malformed payload — saved routines unchanged in every case
