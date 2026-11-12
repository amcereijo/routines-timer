## Context

See proposal.md - Why for motivation. Current state shaping the approach:

- The watch app lives in `zepp_app/` (Zepp OS API 3.0, target 3.7, Amazfit
  Balance 480×480, safe drawing area 70..410 on both axes). Pages: `home`,
  `create`, `saved`, `run`, `import`, `web`.
- `page/home.js` pins two buttons at the bottom: "+ New Routine"
  (accent, 190px wide) and "Import" (dark, rest of the bar).
- `page/create.js` renders the step list in a scrollable `VIEW_CONTAINER`.
  Its first row is a "Create on web" menu row (only while creating, not
  while editing) that pushes `page/web` after storing a draft in
  `localStorage` (`utils/draft.js`), because pushing a page destroys the
  current one.
- `page/web.js` shows the builder address and a QR code, with a BACK
  button. `page/import.js` asks for the 8-character code and saves the
  resolved routine with the same semantics as a manually created one.
- Zepp OS pages are pushed onto a stack: `back()` pops one page. `replace()`
  swaps the current page for another one of the same app.

## Goals / Non-Goals

**Goals:**

- One entry point on Home, one screen that lists the ways to add a routine.
- The web route stays inside the section: builder address → build in the
  browser → import code → the routine is on the watch.
- The routine editor only shows routine steps.
- The imported routine is visible on the routine list right after the
  import.

**Non-Goals:**

- Changing the import-code contract, the web app or the Huawei port.
- Editing or syncing a routine between the watch and the web app.
- Keeping the watch-side routine alive across a visit to the web builder
  screen (see Decision 3).

## Decisions

### 1. A new page (`page/add`) instead of an overlay or a menu row

The merged section is a page registered in `app.json`, pushed from Home.
Alternatives considered: an overlay on the Home screen (Home already draws a
scrollable list, and an overlay would have to hide it, which the create
page already does for its picker — reusing that machinery for a two-entry
menu is more code than a page); and keeping the section inside the editor
(the editor is also the edit screen, so the "add" entries would show up
while editing a routine that already exists).

### 2. Two entries: the watch and the web app

The section offers "On the watch" (pushes `page/create`) and "In the web
app" (pushes `page/web`). A third entry for the import code was considered
and rejected: the import screen belongs to the web route (a code exists
only for a routine built in the web app), so it is reached from the web
builder screen, one tap away from where the code is generated. Home keeps
exactly one button, which is the point of the merge.

### 3. The "Create on web" row leaves the editor, and the draft goes with it

The editor's first row was a menu row that looked like a step. With the
entry in the Add Routine section it is redundant, so it is removed — and
with it the draft (`utils/draft.js`), whose only purpose was to carry the
routine being created across the trip to `page/web`. The editor now keeps
its routine in the page, as before any web builder existed.

Consequence: a routine that was started on the watch and not saved is lost
when the editor is left, and there is no way to switch a half-built routine
to the web app. Accepted: the web app cannot receive a watch-side routine
anyway (the import codes flow the other way only), so the switch never
carried the work over — it only preserved the watch steps.

### 4. The web builder screen: the address first, the QR code on its own page

The screen shows the title (32px), the explanation (24px) and the address
(18px) — all bigger than the 15px they had next to the QR code — plus
three actions: **SHOW QR CODE**, **ENTER CODE** and **BACK**.

The QR code is not on that screen. It is only useful while the phone
camera points at the watch, and it competes with the text for space: with
the code on the screen the explanation had to shrink to 15px. Tapping
**SHOW QR CODE** opens a page of its own (`page/qr`) with the code alone,
256px wide, a short title and a BACK button that returns to the address.

The QR code is a **separate page**, not a second state of the web screen.
Widgets created outside `build()` — while the screen rebuilds itself after
a tap — are laid out by the page before the deleted widgets are gone.

### 4b. The QR code is drawn by the app, not by the QRCODE widget

`widget.QRCODE` renders the code into a fixed-size bitmap and crops it: on
the Balance the builder URL (33 modules) came out with its right-hand
column missing — the top-right finder pattern never appeared and the code
could not be scanned. No layout can work around that: the missing modules
are missing at any size.

So the app draws the code itself. The matrix is generated at build time
from the deployment URL (`scripts/write-config.js` → `utils/generatedQr.js`,
one character per module, using the `qrcode` package as a devDependency)
and the page draws it with filled rectangles: one rectangle per block of
neighbouring dark modules, which is ~210 rectangles for a 33x33 code
instead of ~550 (one per module).

The size is ours to choose: 7px per module, with the 4-module quiet zone
the QR spec asks for, the code sits on a 287px white card that fits the
round screen.

The matrix is verified at build time: it is a real QR code for the
builder URL, and the page renders exactly the modules it contains.

### 5. A successful import shows the routine list

The import screen currently returns to its caller with `back()`. Its only
caller is now the web builder screen, so `back()` would leave the user on
the QR code. Instead the import screen replaces itself with `page/home`
after the "Imported!" confirmation, so the routine that was just added is
visible. `replace()` is used because it is the only router call that swaps
the current page for another one; the routine list is rebuilt from storage
by the new page, so it shows the imported routine.

The same applies to the editor's SAVE button: with the section between the
list and the editor, `back()` would leave the user on the Add Routine
section instead of on the routine that was just saved. The editor therefore
replaces itself with `page/home` as well.

### 6. Layout of the section

The section reuses the menu-row look of the old "Create on web" row
(dark blue rounded background, accent title, grey hint) so the entries read
as choices rather than as steps. Title at 74..112, entries of 76px with a
10px gap at 120..196 and 206..282, and the round-trip explanation below
them (294..350). Plain widgets are enough — three rows fit in the safe
area, so no scroll container is needed.

Typography follows the routine cards of the home list, which are the
app's most-read screen: the section title is 30px, an entry title 26px
(same as a routine name), an entry hint 20px (same as a routine summary)
and the closing explanation 18px. The entry hints are short enough to stay
on one line at that size ("Build it step by step here", "Scan a code to
build it online"), and the explanation is two lines at 18px.

## Risks / Trade-offs

- [The editor loses the ability to open the web builder] → The web
  builder is one tap away in the Add Routine section, which is where the
  user chooses between the two ways of adding a routine.
- [A half-built routine is lost when the editor is left] → Same as before
  the web builder existed; the routine is saved with SAVE.
- [The routine list appears twice in the back stack (the original home page
  and the new one)] → The new list is the visible one; backing out of it
  returns to the Add Routine section, which is where the user came from.
- [A QR-less device cannot scan the address] → The web builder screen shows
  the address in text and keeps the "ENTER CODE" button, so the import step
  stays reachable on every device.
