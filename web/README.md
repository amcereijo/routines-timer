# Routines Timer — web app

Next.js app for building routines, sharing them with a link, and handing them
to the watch with an 8-character import code.

The watch app (`../zepp_app`) cannot reach the internet directly. It asks
the Zepp phone app to proxy a request to
`GET /api/routines/resolve?code=...`, which returns the routine stored
here — or a generic 404 if the code is unknown, expired, malformed, or
belongs to a deleted routine.

## Requirements

- Node.js 20+ (developed on Node 24)
- A [Turso](https://turso.tech) database, or a local SQLite file

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

`.env.local` is git-ignored. `.env.example` is the committed template —
keep it in sync when adding a variable.

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `TURSO_DATABASE_URL` | yes | `file:./dev.db` locally, `libsql://<db>-<org>.turso.io` in production |
| `TURSO_AUTH_TOKEN` | remote DB only | Token from the Turso dashboard → your database → Auth Tokens |
| `AUTH_USERS` | yes | Accounts allowed to sign in, as a JSON array (see below) |
| `ADMIN_PASSWORD` | legacy | Password of a single operator named `admin`; only used when `AUTH_USERS` is missing |
| `SESSION_SECRET` | yes | HMAC secret for session cookies — generate with `openssl rand -hex 32` |

The database schema (`routines`, `codes`, `shares`, `rate_hits`) is created
automatically on the first request, so an empty database is enough to
start. Adding the `owner` column to an existing `routines` table happens the
same way — no migration step.

### Accounts

Several people can use the same deployment. The accounts live in one
environment variable, so there is no user database to maintain:

```bash
AUTH_USERS='[
  {"username":"angel","password":"s3cret","name":"Angel","admin":true},
  {"username":"sam","password":"hunter2","name":"Sam"}
]'
```

- `username` — used to sign in; letters, digits, `.`, `_`, `-`
- `password` — plain text, same trust level as `ADMIN_PASSWORD`
- `name` — optional label shown in the UI
- `admin` — optional; an admin sees and manages every account's routines

The object form (`{"angel": {"password": "…"}, "sam": "…"}`) is accepted as
well. Entries with an unusable username or an empty password are ignored,
and a variable that cannot be parsed falls back to `ADMIN_PASSWORD`, so a
typo never locks you out.

Each account owns the routines it creates; other accounts cannot read,
edit, share, or delete them. Sharing is done with public links instead.
Routines that were created before accounts existed are adopted by the first
account that signs in.

Sign in at `/login`. Sessions last 12 h and carry the account name;
rotating `SESSION_SECRET` invalidates every issued session at once.

## Features

- **Routine editor** — templates, `m:ss` durations, quick-duration chips,
  drag-and-drop reordering, duplicate/collapse per step, live totals, a
  watch preview, and recovery of an unsaved draft after a reload.
- **Images, notes, and links per step** — up to 3 images, an optional
  description (500 characters, line breaks allowed), and up to 3 http(s) links
  per step. Images are shrunk in the browser (longest edge ≤ 1024 px,
  ≤ 150 KB each) and embedded in the routine; the whole routine payload is
  capped at 2 MB. The extras are shown on the public share page and are
  stripped from the watch document.
- **Public share links** — `/r/<token>` shows a routine to anybody, with no
  account. Links can expire (1 h, 24 h, 7 d, 30 d, or never) and can be
  discarded, which kills the URL immediately — from the routine list or from
  the public page while signed in as the owner.
- **Watch import codes** — the short-lived 8-character codes the watch types
  in, unchanged.

## Deploying

Deployed to Vercel. Set the variables above in Project Settings →
Environment Variables and deploy — no migration step, since the schema is
created on first request.

The deployed URL is what the watch app resolves codes against; point the
watch build at it with `RESOLVE_BASE_URL` (see `../zepp_app/.env.example`).

## Layout

```
app/
  page.tsx                  Routine list (post-login landing page)
  login/page.tsx            Sign-in (username + password)
  routines/new/             Create a routine
  routines/[id]/edit/       Edit a routine
  r/[token]/                Public share page (read-only, no account)
  api/routines/             CRUD
  api/routines/[id]/codes/  Generate and list import codes
  api/routines/[id]/shares/ Create and list public share links
  api/shares/[token]/       Discard a public share link
  api/routines/resolve/     Public endpoint the watch calls
  api/auth/                 Login / logout / account list
lib/
  routine.ts                Shared document contract, limits, validation
  store.ts                  Turso queries (routines, codes, shares)
  db.ts                     Client + automatic schema creation
  session.ts                HMAC-signed session tokens
  users.ts                  Account configuration (AUTH_USERS)
  auth.ts                   Request → account helpers
  images.ts                 Browser-side image shrinking
  format.ts                 Duration and expiry formatting
  rateLimit.ts              Sliding-window counters
proxy.ts                    Edge guard for pages and API routes
```

## Notes

- `proxy.ts` is the Next.js 16 replacement for `middleware.ts`; it
  redirects unauthenticated page requests to `/login` and rejects
  unauthenticated API requests. `/login`, `/api/auth/login`,
  `/api/auth/users`, `/api/routines/resolve` and `/r/*` are public.
- `GET /api/routines/resolve` is deliberately public — possession of an
  active code is the credential. It is rate limited to 10 requests per
  minute per IP; login is limited to 5 per 5 minutes.
- The resolve endpoint returns the plain version-1 document: the web-only
  `description`, `images` and `links` are stripped, so the watch keeps
  importing routines exactly as before.
- `allowedDevOrigins` in `next.config.ts` allows the dev server to be
  reached through a tunnel (`*.ngrok-free.dev`). It affects local
  development only.
