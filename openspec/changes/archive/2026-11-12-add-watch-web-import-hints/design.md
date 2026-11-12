## Context

See proposal.md - Why for motivation. Current state shaping the approach:

- `page/web.js` shows the title, a one-sentence explanation, the address,
  the QR code and the BACK button. The explanation only covered the web
  app itself.
- `page/import.js` shows the title, the code field, a status line used for
  feedback and the Import button. The space between the status line and
  the button was empty.
- `page/create.js` shows the "Create on web" entry with the hint "Scan a
  code to build routines in the browser".

## Goals / Non-Goals

**Goals:**

- Make the round trip (web app → import code → watch) explicit on both
  screens.
- Say it with the existing text widgets, without new screens or a new
  interaction.

**Non-Goals:**

- Changing the import flow itself (codes, expiry, resolution).
- Automating the import (e.g. sending the routine straight to the watch).
- Explaining the sharing links (`/r/<token>`) of the web app.

## Decisions

### 1. The web screen extends its explanation instead of adding a widget

The description block of `page/web` grows from two lines to three, and the
QR code shrinks from 176 px to 170 px to make room. The layout was checked
against the 480×480 round safe area: title 70–94, description 96–154, QR
164–334 (with its white background from 156), address 346–368, BACK
372–408.

A separate hint widget under the address was considered and rejected: the
address already needs that space, and one flowing paragraph reads better
than two disconnected blocks.

### 2. The import screen gets a static hint

The import screen has an empty area between the status line (which is
reserved for the five feedback outcomes) and the Import button. A static
one-line hint goes there, so the feedback messages never collide with it.
The hint states where the codes come from; the screen the user is on
already says what to do with them.

### 3. The wording avoids the arrow symbol

The watch font does not render every Unicode symbol (the app replaced them
with plain text before), so the hints use words ("the import code", "the
web app") instead of arrows.
