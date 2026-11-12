## Why

Building a routine on the watch's 480×480 round screen is slow: every step
means several taps through the picker. The web builder already exists and is
much faster to use on a phone or a computer, but the user has to know its
address, and the address is not visible anywhere on the watch.

Showing the builder address (and a QR code for it) inside the watch app
removes that friction: the user taps one entry in the "New Routine" screen,
scans the code with the phone and lands directly on the routine builder.

## What Changes

- Add a "Create on web" entry to the watch app's **New Routine** screen (a
  submenu entry at the top of the step list) that opens a new screen.
- The new screen explains what the link is for, shows the plain address of
  the web routine builder and a QR code with the same address, so the user
  can scan it with the phone and open the builder.
- The address is derived from the build-time `RESOLVE_BASE_URL`, so it always
  points at the deployment the app was built against.
- Keep the routine that is being created on the watch while the web screen
  is open (draft), so opening the link never discards the steps already
  added.
- Web app: keep the requested path when the proxy sends an unauthenticated
  visitor to the login page, so the QR deep link lands on the routine
  builder after signing in.

## Capabilities

### New Capabilities

- `watch-web-builder`: Watch-side shortcut that exposes the address of the
  web routine builder (plain text + QR code) from the routine creation flow.

### Modified Capabilities

None. This change introduces new behavior without changing the requirements
of existing capabilities.

## Impact

- **Watch app:** Adds `page/web.js` (address + QR + explanation), a
  `utils/draft.js` helper (keeps the routine being created across the
  navigation), a menu entry in `page/create.js`, a `WEB_BUILDER_URL`
  constant and the new i18n strings.
- **Web app:** The proxy now adds a `next` query parameter to the login
  redirect and the login page sends the user back to that path after
  signing in. No data model or API change.
- **Device support:** The QR code uses the `QRCODE` widget (API_LEVEL 2.0+);
  devices without it still see the address and an explanation.
