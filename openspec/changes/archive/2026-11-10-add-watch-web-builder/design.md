## Context

See proposal.md - Why for motivation. Current state shaping the approach:

- The watch app lives in `zepp_app/` (Zepp OS API 3.0, target 3.7, Amazfit
  Balance 480×480). Pages: `home`, `create`, `saved`, `run`, `import`. The
  create page (`page/create.js`) renders a scrollable `VIEW_CONTAINER` with
  the step rows and the "+ Add Step" button, plus a routine-name row and a
  SAVE button.
- The web app lives in `web/` (Next.js App Router, Vercel). The routine
  builder is at `/routines/new`; every page except `/login`, the public
  share pages and the resolve API is behind the session proxy
  (`web/proxy.ts`).
- The deployment address is already injected into the watch build through
  `RESOLVE_BASE_URL` (`scripts/write-config.js` → `utils/generatedConfig.js`
  → `utils/constants.js`), used today by the app-side service that resolves
  import codes.
- Zepp OS destroys a page when another page is pushed and re-runs
  `onInit` + `build` when the user comes back, so page state does not
  survive a navigation.

## Goals / Non-Goals

**Goals:**

- One extra tap from the "New Routine" screen to the address of the web
  builder.
- Show the address both as text and as a QR code, and explain what it is
  for.
- Never lose the routine that is being created when the user looks at the
  address.
- Point at the deployment the app was built against, without hard-coding a
  second URL.

**Non-Goals:**

- Opening web pages on the watch itself (the watch has no browser).
- Editing or syncing routines between the watch and the web app (the
  existing import-code flow already covers watch ← web).
- A short link or a dedicated deep-link scheme.

## Decisions

### 1. The entry lives in the "New Routine" screen, not in Home

The request is a submenu of the routine creation flow, so the entry is the
first row of the create page's step list (styled as a menu row with a title
and a hint line, distinct from the step rows). It is only shown while a new
routine is being created (`editId == null`), because "create it in the web
app" is not meaningful while editing a routine that already exists.

Alternative considered: a second bottom-bar button on Home next to
"+ New Routine" / "Import". Rejected: Home is already busy and the entry
would be a shortcut without the context of the creation flow.

### 2. The web screen is a new page (`page/web`)

A new page (registered in `app.json`) rather than an overlay: it is a
different context (an address to use elsewhere), it needs the whole screen
for the QR code, and the standard back gesture / a BACK button returns to
the editor.

### 3. Address: `RESOLVE_BASE_URL` + `/routines/new`

The base URL is already injected at build time, so the same constant that
points the app-side service at the deployment also points the user at the
builder — one place to change when the deployment changes. The base URL may
carry a trailing slash, so it is trimmed before the path is appended
(`utils/constants.js` → `WEB_BUILDER_URL`).

### 4. QR code: the native `QRCODE` widget

`@zos/ui`'s `widget.QRCODE` renders a QR code plus a white background
(API_LEVEL 2.0+, so every supported device has it). The widget is created
inside a `try`/`catch`; if a device does not know it, the screen shows the
address and a short explanation instead of crashing. No QR encoder is
bundled in the app — the watch only needs to display the code, not produce
one.

### 5. Draft: keep the routine being created

Pushing `page/web` destroys `page/create`, and the page is rebuilt from
scratch when the user comes back, which would throw away the steps already
added. The routine (name, steps, edit id) is therefore stored in
`localStorage` (`utils/draft.js`) before pushing and restored on the next
`onInit` of the create page. The draft is dropped as soon as it is
restored, and also when the create page is destroyed for any reason other
than opening the web screen, so it can never resurrect stale steps.

### 6. Web app: keep the requested path through the login

The proxy redirects unauthenticated visitors to `/login`, losing the
requested path. The QR code points at `/routines/new`, so without this the
user would sign in and land on the routine list instead of the builder. The
proxy now adds `?next=<pathname>` and the login page pushes that path
after a successful sign-in. Only same-site paths are accepted (`/…` and
not `//…`), so the parameter cannot be used as an open redirect.
