## Why

Creating a routine in the web app and importing it to the watch are the
two halves of the same flow, but neither screen says so. The web builder
screen only mentions the web app, and the import screen only asks for a
code, so a user who scans the QR code on the watch does not learn that the
routine they just created comes back with an import code, and a user who
lands on the import screen does not learn where codes come from.

## What Changes

- The web builder screen explains that routines created on the web are added
  to the watch with their import code.
- The import screen states where the import codes come from (routines
  created in the web app).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `watch-web-builder`: The web builder screen now explains how a routine
  created there is brought back to the watch.
- `watch-routine-import`: The import screen now tells the user that the
  codes come from routines created in the web app.

## Impact

- **Watch app:** Two text changes (`page/web.js` description and a new hint
  on `page/import.js`) plus the matching i18n strings.
- **Web app:** No change.
