# Routine Timer — Zepp OS app for Amazfit Balance

Create sequences of timers ("routines"), run them immediately, or save them to
run later. While a routine is running, each step counts down one after another
until all complete. You can pause/resume or stop at any time.

## User flow

```
┌──────────────┐   New Routine   ┌──────────────────────────────┐
│     HOME     │ ───────────────▶│            CREATE            │
│              │                 │  Step list (tap = edit,      │
│  New Routine │◀─────────────── │  × = delete, ▲▼ = scroll)    │
│  Saved       │      back       │                              │
└──────┬───────┘                 │  [+ Add Step]                │
       │                         │  [START]        [SAVE]       │
       │ Saved                   └───────┬─────────────┬────────┘
       ▼                                 │             │
┌──────────────┐                         │ push        │ save & push
│    SAVED     │   tap routine           ▼             ▼
│  routines    │ ────────────────▶ ┌──────────────────────────┐
│  (run / ×)   │                   │           RUN            │
└──────────────┘                   │  Step n/N  next-step →   │
                                   │  big countdown + bar     │
                                   │  [PAUSE/RESUME] [STOP]   │
                                   └───────────┬──────────────┘
                                               │ all steps done
                                               ▼
                                        "DONE!" → OK → back
```

## How to use (steps)

1. **Create a routine**
   - Home → **New Routine**
   - *(Optional)* tap **✎** next to the routine name to give it a name
     (default: "Routine N" in the saved list).
   - **+ Add Step** → in the step editor:
     - *(Optional)* tap **✎** next to the step name to name it
       (default: "Step N").
     - Pick a duration with the **min −/+** and **sec −/+** wheels, then `✓`
       (`✕` cancels).
   - Repeat to add more steps (max 20). Tap a step row to edit it,
     `×` to delete it, `▲▼` to scroll when there are more than 3.
2. **Run it now**: press **START**.
3. **Save it for later**: press **SAVE** → it appears in **Saved** under its
   name (max 10; when full, the oldest is dropped; saving again with the same
   name overwrites the previous one).
4. **Run a saved routine**: Home → **Saved** → tap the routine.
5. **While running**
   - The watch shows the routine name, `n/N · step name`, the remaining time,
     a progress bar (turns red in the last 5 s) and the next step.
   - The watch **vibrates** at every step change and when the routine ends.
   - The screen **stays on** during the run.
   - **PAUSE** freezes the countdown (button becomes **RESUME**);
     **STOP** aborts and returns to the previous screen.
   - When the last step finishes, a **DONE!** screen appears; press **OK**.

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
  home.js               Main menu
  create.js             Routine name + create/edit steps, START / SAVE
  saved.js              Saved routines list
  run.js                Countdown runner (pause/resume/stop)
  i18n/                 en-US, es-ES translations (.po)
utils/
  constants.js          Colors and limits
  format.js             m:ss formatting helpers
  storage.js            Saved-routine persistence
  textInput.js          Text input: system keyboard w/ mini-keyboard fallback
  keyboard.js           Built-in mini keyboard overlay (API 3.x devices)
```

### Tech notes

- Framework: plain `@zos/ui` widgets (TEXT / BUTTON / FILL_RECT), navigation
  with `@zos/router` (`push` with JSON params, `back`).
- Countdown: global `setInterval` (1 s) — the timer only ticks while not
  paused, so pause is trivially correct.
- Screen-on during runs: `setPageBrightTime` + `pauseDropWristScreenOff`
  from `@zos/display`; restored in `onDestroy` via `resetDropWristScreenOff`.
- Step-change/finish feedback: `Vibrator` with `VIBRATOR_SCENE_DURATION`
  from `@zos/sensor`.
- Page lifecycle: Zepp OS destroys the page on `push` and re-runs
  `onInit`+`build` on `back`, so each page always renders fresh state
  (no stale saved lists).

## Build & run

### Prerequisites

- **Node.js 24+ recommended** (or Node 18/20 with extra patches, see below)
- A Zepp developer account: https://dev.zepp.com/
- The Zepp app on your phone with the Balance paired (for on-device preview)

```sh
npm install
npx zeus login        # one-time browser authentication
npx zeus build        # produces dist/*.zab
npx zeus preview      # QR / device prompts to run on simulator or watch
```

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

### Installing on the watch

The `.zab` in `dist/` is installed via `zeus preview` (developer mode) or
through the Zepp developer console. See
https://docs.zepp.com/docs/guides/tools/ for details.
