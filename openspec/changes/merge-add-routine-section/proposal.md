## Why

Adding a routine is split across three places on the watch. Home shows two
separate buttons ("+ New Routine" and "Import"), and the web builder is
hidden as the first row of the step list inside the editor, where it looks
like a step rather than a way to add a routine. The user has to guess where
each of the three ways to add a routine lives, and the web route — build in
the browser, then bring the routine over with its import code — is the one
that is hardest to find.

## What Changes

- Home shows a single "Add Routine" button that opens a new "Add Routine"
  section instead of the two separate actions.
- The new section offers the two ways to add a routine side by side:
  "On the watch" (build the routine step by step on the watch) and
  "In the web app" (scan a code, build it in the browser and bring it over
  with its import code).
- The web builder entry moves out of the editor's step list into that
  section, so the editor only contains steps.
- The web builder screen gains an "ENTER CODE" button that opens the import
  screen, so the web route is complete without leaving the section: build in
  the browser, enter the import code, the routine is on the watch.
- After a successful import the watch returns to the routine list, so the
  freshly imported routine is visible right away.
- The draft that kept the watch-side routine alive across a visit to the web
  builder screen is dropped: the editor no longer links to the web builder
  screen, so there is nothing to preserve.

## Capabilities

### New Capabilities

- `watch-add-routine`: The merged "Add Routine" section of the watch app —
  the single entry point for adding a routine, with the watch and the web
  app as the two ways to do it.

### Modified Capabilities

- `watch-routine-import`: The import screen is no longer opened from a Home
  button; it is opened from the web builder screen of the Add Routine
  section, and a successful import returns to the routine list.
- `watch-web-builder`: The "Create on web" entry moves from the routine
  editor to the Add Routine section, and the routine being created no
  longer has to survive a visit to the web builder screen.

## Impact

- **Watch app:** new page `page/add` (registered in `app.json`), Home's
  bottom bar collapses to one button, the editor loses its "Create on web"
  row and the draft helper (`utils/draft.js`) is deleted, the web builder
  screen gains an "ENTER CODE" button, and the matching i18n strings.
- **Web app:** no change.
