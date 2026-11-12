# Routines Timer — Zepp OS app for Amazfit Balance

Create sequences of timers ("routines"), run them immediately, or save them to
run later. While a routine is running, each step counts down one after another
until all complete. You can pause/resume or stop at any time.

## User flow

```
┌──────────────────┐  + Add Routine ┌──────────────────────────┐
│       HOME       │ ──────────────▶│          ADD             │
│  routine list    │                │  [On the watch]          │
│  (saved routines)│◀────────────── │  [In the web app]        │
│  swipe to scroll │      back      │  "web routines come back │
│  [Start][Edit][×]│                │   with their import code"│
│ [+ Add Routine]  │                └───────┬───────────┬──────┘
└──────┬───────────┘                        │           │
       │ tap name / Start                   │           │
       │ Edit / ×                           │           │
       ▼                                    ▼           ▼
┌──────────────────────────┐   ┌───────────────────┐  ┌────────────────┐
│           RUN            │◀──│      CREATE       │  │      WEB       │
│  Step n/N  next-step →   │   │  Step list (tap = │  │  explanation   │
│  big countdown + bar     │   │  edit, × = delete) │  │  + address     │
│  [PAUSE/RESUME] [STOP]   │   │  [+ Add Step]     │  │  [SHOW QR CODE]│
└───────────┬──────────────┘   │  [START]   [SAVE] │  │  [ENTER CODE]  │
            │ all steps done   └───────────────────┘  │  [BACK]        │
            ▼                                          └───────┬────────┘
      "DONE!" → OK → back                                  [SHOW QR CODE]
                                                               ▼
                                                     ┌────────────────┐
                                                     │   QR CODE      │
                                                     │  (full screen) │
                                                     │  [BACK]        │
                                                     └────────────────┘

┌──────────────────┐  ENTER CODE ┌───────────────────┐
│       WEB        │ ────────────▶│      IMPORT       │
│  (address screen)│              │  8-character code │
└──────────────────┘              │  [IMPORT]         │
                                  └─────────┬─────────┘
                                            │ success
                                            ▼
                                    back to the HOME list
```

> Note: `page/saved` still exists in the build targets but is no longer
> linked from the UI — HOME shows the saved routines directly.

> Note: the Home list is a scrollable area (`VIEW_CONTAINER`). Every routine
> is a big card (name + summary + three large buttons) and the list is
> swiped up/down to see the other routines. **+ Add Routine** stays pinned at
> the bottom, so it is always one tap away.

## How to use (steps)

1. **Create a routine**
   - Home → **+ Add Routine** → **On the watch**
   - *(Optional)* tap the **routine name row** to give it a name
     (default: "Routine N" in the list).
   - **+ Add Step** → in the step editor:
     - *(Optional)* tap the **step name row** to name it
       (default: "Step N").
     - Pick a duration with the **min −/+** and **sec −/+** wheels, then `OK`
       (`CANCEL` cancels).
   - Repeat to add more steps (max 20). Tap a step row to edit it,
     `×` to delete it, `▲▼` to scroll when there are more than 2.
2. **Create it in the web app instead**
   - Home → **+ Add Routine** → **In the web app** → the screen shows the
     address of the web builder and a QR code.
   - Scan the code with the phone, sign in and build the routine there.
   - The web app gives the routine an **import code** → back on the watch,
     tap **ENTER CODE** and enter the code (the phone app must be
     connected). The imported routine is an ordinary saved routine and the
     watch goes back to the routine list, where it is already there.
3. **Run it now**: press **START**.
4. **Save it for later**: press **SAVE** → it appears on the **Home** list
   under its name (max 10; when full, the oldest is dropped; saving again with
   the same name overwrites the previous one).
5. **Run a saved routine**: on **Home**, tap the routine name or its
   **Start** button.
   - The list shows two routines at a time; swipe up/down to reach the
     others (the next routine peeks in at the bottom).
   - **Edit** loads the routine back into the editor (title shows
     "Edit Routine"); pressing **SAVE** updates it in place, keeping its
     position in the list. Leaving with the back gesture discards changes.
   - **×** deletes the routine.
6. **While running**
   - The watch shows the routine name, `n/N · step name`, the remaining time,
     a progress bar (turns red in the last 5 s) and the next step.
   - Alerts while running (see `utils/alerts.js`):
     - **Last 3 s of each step**: one short vibration + one soft sound per
       second.
     - **Step ends**: single long vibration + double sound.
     - **Routine ends**: triple long vibration + triple long sound.
     - Sounds use `SystemSounds` (API_LEVEL 3.6+; soft `MESSAGE` ding for the
       warnings, `ALARM` with repeats for step/routine end) and are skipped
       silently when the device has system sounds disabled or is on an older
       API level. Vibration uses the API 3.6 action-array form
       (`CONTINUOUS`/`PAUSE` with durations) and falls back to the fixed
       `VIBRATOR_SCENE_*` modes on older firmware.
   - The screen **stays on** during the run.
   - **PAUSE** freezes the countdown (button becomes **RESUME**);
     **STOP** aborts and returns to the previous screen.
   - When the last step finishes, a **DONE!** screen appears; press **OK**.

### Creating routines in the web

The **In the web app** entry of the **Add Routine** section (Home → **+ Add
Routine**) opens a screen with the address of the web routine builder:

- a short explanation of what the link is for,
- the address itself (`https://<web-app>/routines/new`),
- **SHOW QR CODE**, which opens a screen with the QR code alone, as big as
  the round screen allows, so it is easy to scan with the phone (the watch
  cannot open web pages itself); **BACK** returns to the address,
- **ENTER CODE**, which opens the import screen, and **BACK**.

The address comes from the build-time `RESOLVE_BASE_URL` (see
[Build-time configuration](#build-time-configuration-resolve_base_url)),
so it always points at the deployment the app was built against. The web
app asks the user to sign in; after signing in they land on the routine
builder.

The screen also explains how the routine gets back to the watch: a routine
created in the web app comes with an **import code**, which is entered on
the watch with **ENTER CODE**. That screen says where the codes come from,
so both halves of the flow point at each other. After a successful import
the watch shows the routine list, with the imported routine in it.

### Naming text input

Text input (routine/step names) uses the **system keyboard** when the device's
`API_LEVEL` is 4.0 or newer (`createKeyboard`, `inputType.CHAR`). On devices
with API_LEVEL 3.x — like the Amazfit Balance on Zepp OS 3.5 — a built-in
mini keyboard overlay is used instead (uppercase letters, digits, space,
backspace; max 18 chars). Detection is automatic via
`getSystemInfo().minAPI`.

## Other info

### Target device

| Property | Value |
| --- | --- |
| Watch | Amazfit Balance |
| Screen | 480×480, round |
| API_LEVEL | 3.0+ (Balance ships with 3.5, up to 3.7) |
| deviceSource | 8519936 (CN), 8519937, 8519939 |

### Data & limits

- Saved routines persist in `localStorage` (`device:os.local_storage`
  permission) under the key `saved_routines`.
- Routine shape: `{ id, name, steps: [{ seconds, name }] }` (`name` may be
  `''` → falls back to "Routine N" / "Step N" in the UI).
- Limits: 20 steps/routine, 10 saved routines, step duration 5 s – 59:59,
  names up to 18 chars.

### Project structure

```
app.json                App configuration (targets, permissions, i18n)
app.js                  App entry
assets/balance.r/       Icon (per-target assets: <target>.<shape>)
page/
  home.js               Home: scrollable saved-routines list + bottom bar
                        (+ Add Routine)
  add.js                Add Routine section: on the watch / in the web app
  create.js             Routine name + create/edit steps, START / SAVE
  saved.js              Saved routines list (no longer linked from the UI)
  run.js                Countdown runner (pause/resume/stop)
  import.js             Import a routine with an 8-character code
  web.js                Web builder address + explanation (+ SHOW QR CODE,
                        ENTER CODE)
  qr.js                 QR code of the web builder, drawn by the app
  i18n/                 en-US translations (.po)
utils/
  builder.js            Path of the routine builder in the web app
  constants.js          Colors and limits
  format.js             m:ss formatting helpers
  storage.js            Saved-routine persistence
  routineList.js        Shared scrollable saved-routine list renderer
  textInput.js          Text input: system keyboard w/ mini-keyboard fallback
  keyboard.js           Built-in mini keyboard overlay (API 3.x devices)
  alerts.js             Vibration + sound feedback for step/routine end
```

### Tech notes

- Framework: plain `@zos/ui` widgets (TEXT / BUTTON / FILL_RECT), navigation
  with `@zos/router` (`push` with JSON params, `back`).
- Long lists (saved routines, steps) live in a `VIEW_CONTAINER`
  (`scroll_enable: 1`): the rows are children of the container and the
  scroll offset is read from `scroll_complete_func` (`info.yoffset`) and
  restored with `setProperty(prop.POS_Y, offset)` when the list is rebuilt.
- Countdown: global `setInterval` (1 s) — the timer only ticks while not
  paused, so pause is trivially correct.
- Screen-on during runs: `setPageBrightTime` + `pauseDropWristScreenOff`
  from `@zos/display`; restored in `onDestroy` via `resetDropWristScreenOff`.
- End-of-step/routine feedback: `Vibrator` + `SystemSounds` from
  `@zos/sensor`, centralized in `utils/alerts.js` (patterns described above).
- Page lifecycle: Zepp OS destroys the page on `push` and re-runs
  `onInit`+`build` on `back`, so each page always renders fresh state
  (no stale saved lists). The routine list is rebuilt from storage, so a
  routine imported on the previous screen shows up right away.
- QR code: drawn by the app itself (`page/qr.js`), **not** with the
  `widget.QRCODE` widget. The widget renders the code into a fixed-size
  bitmap and crops it, so a 33-module code (this URL) loses its right-hand
  column — the finder pattern never appears and the code cannot be
  scanned. Instead the matrix is generated at build time from the
  deployment URL (`scripts/write-config.js` → `utils/generatedQr.js`, one
  character per module, `qrcode` package) and the page draws it with
  filled rectangles: one per block of neighbouring dark modules, ~210
  rectangles for a 33×33 code. 7px per module plus the 4-module quiet
  zone keeps the whole code on a 287px white card inside the round
  screen.

## Build & run

### Prerequisites

- **Node.js 24+ recommended** (or Node 18/20 with extra patches, see below)
- A Zepp developer account: https://dev.zepp.com/
- The Zepp app on your phone with the Balance paired, with **Developer Mode**
  enabled (see "Installing on the watch" below)

```sh
npm install
npx zeus login        # one-time browser authentication
npx zeus build        # produces dist/*.zab
npx zeus preview      # QR / device prompts to run on simulator or watch
```

### Build-time configuration (`RESOLVE_BASE_URL`)

The routine-import feature calls the web app's `/api/routines/resolve` endpoint
from the **app-side service** that runs in the Zepp phone app. Its base URL is
injected at build time, so you can point a build at a different environment
without editing source:

```sh
# one-off build against another environment
RESOLVE_BASE_URL=https://staging.example.com npm run build

# or keep it in a local .env file (see .env.example)
cp .env.example .env
```

`npm run build` / `npm run preview` run `scripts/write-config.js` first
(also wired as `prebuild`), which writes `utils/generatedConfig.js` from, in
order of precedence:

1. `RESOLVE_BASE_URL` from the environment
2. `RESOLVE_BASE_URL` from `.env`
3. the built-in default (the production deployment)

Calling `npx zeus build` directly skips the generator and reuses the last
generated `utils/generatedConfig.js`, so plain `zeus build` still works.

### Why a package fix is needed at all

`@zeppos/zeus-cli@1.9.3` (the latest CLI) declares its dependency as
`"zeppos-app-utils": "private-modules/zeppos-app-utils"` — a folder **bundled
inside the CLI package itself**, which is where the real, full-featured module
lives (with `modules.fetchDevices`, `modules.build`, …).

npm does not understand that path: it sees the bare name `zeppos-app-utils`,
finds the unrelated `zeppos-app-utils@1.0.0` placeholder published on the npm
registry (which lacks `fetchDevices`), and hoists **that** to top-level
`node_modules`. When `zeus build` then does `require('zeppos-app-utils')` it
gets the wrong package and crashes with `TypeError: devicesData is not a
function`.

**This is already automated in this repo**: the `postinstall` script
(`scripts/postinstall.sh`) copies the bundled module over the wrong one after
every `npm install`:

```sh
rm -rf node_modules/zeppos-app-utils && \
  cp -r node_modules/@zeppos/zeus-cli/private-modules/zeppos-app-utils \
      node_modules/zeppos-app-utils
```

If you ever bypass the hook (e.g. `npm install --ignore-scripts`), run it
manually with `sh scripts/postinstall.sh`.

### Node version matters

- **Node 24+ (recommended)**: with the fix above, everything works. Node
  ≥22.12 can `require()` ES modules natively, which is what the CLI and its
  dependencies need.
- **Node 18/20**: `require()` of ESM is unsupported there, so the CLI also
  crashes with `ERR_REQUIRE_ESM` on the ESM-only packages it depends on
  (`package-json` ≥8, `ora` ≥9). To use 18/20 you must additionally convert
  `node_modules/package-json` and `node_modules/ora` into CommonJS stubs
  (set `"type": "commonjs"` in their `package.json` and replace their
  `index.js` with a tiny `module.exports` shim).
- **Node 22.0–22.11**: avoid; `require(esm)` isn't available until 22.12.

Nothing here affects the produced `.zab` — these are issues in the build tool
only, not in the app code.

### Installing on the watch (Zepp App Developer Mode)

The easiest way to run the app on your real watch is the **Developer Mode**
built into the Zepp phone app — no store submission needed.

1. **Enable Developer Mode** in the Zepp app on your phone:
   - Go to **Profile → Settings → About** and tap the **Zepp icon 7 times**
     in a row until the pop-up appears.
2. **Preview on the watch**: run `npx zeus preview` in this project — it
   builds and shows a **QR code**. In the Zepp app, use the Developer Mode
   **Scan** function to scan it; the app installs and launches on your
   paired Balance.
3. Developer Mode also gives you:
   - **Watch screenshots** (saved to your phone's gallery)
   - **Real-device logs** (Device App / Side Service log viewer — handy for
     debugging this app)
   - **Bridge mode** for live development
   - **Device API_LEVEL lookup** (Device information button)

Full instructions:
https://docs.zepp.com/docs/guides/tools/zepp-app/

Alternatively, the `.zab` produced in `dist/` can be distributed through the
Zepp developer console. See https://docs.zepp.com/docs/guides/tools/ for
details.
