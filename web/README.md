# Routines Timer — web app

Next.js app for building routines and handing them to the watch with an
8-character import code.

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
| `ADMIN_PASSWORD` | yes | Password of the single operator allowed in |
| `SESSION_SECRET` | yes | HMAC secret for session cookies — generate with `openssl rand -hex 32` |

The database schema (`routines`, `codes`, `rate_hits`) is created
automatically on the first request, so an empty database is enough to
start.

Sign in at `/login` with `ADMIN_PASSWORD`. Sessions last 12 h; rotating
`SESSION_SECRET` invalidates every issued session at once.

## Deploying

Deployed to Vercel. Set the four variables above in Project Settings →
Environment Variables and deploy — no migration step, since the schema is
created on first request.

The deployed URL is what the watch app resolves codes against; point the
watch build at it with `RESOLVE_BASE_URL` (see `../zepp_app/.env.example`).

## Layout

```
app/
  page.tsx                  Routine list (post-login landing page)
  login/page.tsx            Operator sign-in
  routines/new/             Create a routine
  routines/[id]/edit/       Edit a routine
  api/routines/             CRUD
  api/routines/[id]/codes/  Generate and list import codes
  api/routines/resolve/     Public endpoint the watch calls
  api/auth/                 Login / logout
lib/
  routine.ts                Shared document contract, limits, validation
  store.ts                  Turso queries (routines, codes)
  db.ts                     Client + automatic schema creation
  session.ts                HMAC-signed session tokens
  rateLimit.ts              Sliding-window counters
proxy.ts                    Edge guard for pages and API routes
```

## Notes

- `proxy.ts` is the Next.js 16 replacement for `middleware.ts`; it
  redirects unauthenticated page requests to `/login` and rejects
  unauthenticated API requests.
- `GET /api/routines/resolve` is deliberately public — possession of an
  active code is the credential. It is rate limited to 10 requests per
  minute per IP; login is limited to 5 per 5 minutes.
- `allowedDevOrigins` in `next.config.ts` allows the dev server to be
  reached through a tunnel (`*.ngrok-free.dev`). It affects local
  development only.
