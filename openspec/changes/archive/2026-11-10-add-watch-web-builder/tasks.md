## 1. Watch app

- [x] 1.1 Add `WEB_BUILDER_URL` to `utils/constants.js` (`RESOLVE_BASE_URL` + `/routines/new`, trailing slash trimmed)
- [x] 1.2 Create `page/web.js`: title, explanation of what the link is for, the address and the `QRCODE` widget (created inside a `try`/`catch`, with a fallback message when the widget is unavailable) plus a BACK button
- [x] 1.3 Register `page/web` in `app.json`
- [x] 1.4 Add the "Create on web" entry as the first row of the step list in `page/create.js`, shown only when a new routine is created
- [x] 1.5 Add `utils/draft.js` and use it in `page/create.js` so the routine being created survives the trip to the web screen (and is dropped when the creation screen is left otherwise)
- [x] 1.6 Add the new strings to `page/i18n/en-US.po`
- [x] 1.7 Document the screen, the entry point and the draft in `zepp_app/README.md`
- [x] 1.8 Verify `zeus build` succeeds and the new page and strings are in the package

## 2. Web app

- [x] 2.1 Add the `next` query parameter to the proxy's login redirect
- [x] 2.2 Send the user to that path after signing in (same-site paths only)
- [x] 2.3 Verify `next build` succeeds and that `/routines/new` redirects to `/login?next=/routines/new` and reaches the builder after signing in

## 3. Manual verification

- [ ] 3.1 On the watch: open "New Routine", tap "Create on web", scan the QR code with the phone and land on the routine builder
- [ ] 3.2 On the watch: add steps, open the web screen, come back and check that the steps are still there
- [ ] 3.3 On the watch: check that the address is readable and that the BACK button returns to the editor
