## 1. Add Routine section

- [x] 1.1 Create `zepp_app/page/add.js`: title "Add Routine", a menu row for "On the watch" (pushes `page/create`), a menu row for "In the web app" (pushes `page/web`) and the round-trip explanation
- [x] 1.2 Register `page/add` in `zepp_app/app.json`
- [x] 1.3 Replace the two bottom buttons of `zepp_app/page/home.js` with a single "+ Add Routine" button that pushes `page/add`

## 2. Editor and web builder screen

- [x] 2.1 Remove the "Create on web" row, the web entry constants and the draft handling from `zepp_app/page/create.js`
- [x] 2.2 Delete `zepp_app/utils/draft.js`
- [x] 2.3 Give `zepp_app/page/web.js` bigger text (title 32px, explanation 24px, address 18px) and an "ENTER CODE" button next to BACK that pushes `page/import`
- [x] 2.4 Show the QR code on its own screen (`zepp_app/page/qr.js`), opened with a "SHOW QR CODE" button and closed with a BACK button that returns to the address
- [x] 2.5 Draw the QR code in the app instead of with the QRCODE widget (which crops it): generate the matrix at build time (`utils/generatedQr.js`) and draw it with filled rectangles

## 3. Import screen

- [x] 3.1 Make `zepp_app/page/import.js` show the routine list (`page/home`) after a successful import instead of going back to the web builder screen

## 4. Texts

- [x] 4.1 Add the new strings to `zepp_app/page/i18n/en-US.po` and drop the ones that are no longer used (`home_new_routine`, `home_import`, `web_entry_title`, `web_entry_hint`)

## 5. Verification

- [x] 5.1 Run `zeus build` in `zepp_app/` and confirm the new page and strings are in the package
- [x] 5.2 Update the user flow and the "How to use" section of `zepp_app/README.md`
- [ ] 5.3 On the watch: check that Home shows one button, that the section opens both routes, that the import screen is reachable from the web builder screen and that the imported routine shows up in the list
