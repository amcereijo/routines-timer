# watch-web-builder Specification

## Purpose
Watch-side shortcut that exposes the address of the web routine builder, so
a routine can be composed on a phone or computer and brought to the watch
without the user having to know or remember the builder's URL.

## Requirements

### Requirement: Entry point in the routine creation flow

The routine creation flow of the watch — the Add Routine section — SHALL
offer a web builder entry that opens the web builder screen. The entry
SHALL NOT be shown in the routine editor, whose content is limited to the
steps of the routine.

#### Scenario: Entry is available when creating

- **WHEN** the user opens the Add Routine section
- **THEN** a web builder entry is shown next to the entry for building the routine on the watch

#### Scenario: Entry is absent when editing

- **WHEN** the user opens the routine editor, whether for a new routine or for an existing one
- **THEN** no web builder entry is shown and the routine's steps are listed as before

### Requirement: The screen shows the address

The web builder screen SHALL show the plain address of the web routine
builder, built from the build-time base URL of the web app plus the
routine builder path, and SHALL offer an action that shows a QR code
encoding the same address. The QR code SHALL NOT be shown on the screen
that shows the address.

#### Scenario: Address and code are shown

- **WHEN** the user opens the web builder screen
- **THEN** the screen shows the address of the web routine builder, an action that shows the QR code with the same content and an explanation that the code is scanned with a phone to build routines in the web app

#### Scenario: Address follows the build configuration

- **WHEN** the app is built with a different base URL for the web app
- **THEN** the address and the QR code point at the routine builder of that deployment

### Requirement: Unsupported QR widget

When the device does not support the QR code widget the screen that shows
the QR code SHALL still show the address and an explanation of what it is
for, instead of failing.

#### Scenario: No QR widget on the device

- **WHEN** the QR code screen is opened on a device that cannot create the QR code widget
- **THEN** the address is shown with a message that the QR code is not available on the device

### Requirement: The screen explains how the routine reaches the watch

The web builder screen SHALL explain that a routine created in the web app
is added to the watch with its import code, so the user knows that the QR
code is the first half of a flow and not the whole thing. The explanation
and the address SHALL be legible, that is, shown in a font size that is not
smaller than the one used for the routine names on the routine list.

#### Scenario: The round trip is explained

- **WHEN** the user opens the web builder screen
- **THEN** the explanation states that routines created in the web app are added to the watch with the import code

#### Scenario: The explanation still fits the screen

- **WHEN** the web builder screen is shown
- **THEN** the explanation, the address and the actions do not overlap each other

### Requirement: The screen offers the import step

The web builder screen SHALL offer an action that opens the import screen,
so the user who built the routine in the web app can enter its import code
without navigating back through the Add Routine section.

#### Scenario: The import step is one tap away

- **WHEN** the user opens the web builder screen
- **THEN** an action that opens the import screen is shown next to the address and the QR code

### Requirement: The QR code is shown on its own screen

Activating the QR code action SHALL show the QR code on a screen of its
own, with a light background behind it, and with an action that returns to
the address. The QR code SHALL NOT be shown on the screen with the address.
The code SHALL be drawn complete — every module, including the finder
patterns — and centered on that screen, and the address SHALL be shown
next to it, so the routine builder can also be opened without scanning.

#### Scenario: The QR code is complete and centered

- **WHEN** the user activates the QR code action on the web builder screen
- **THEN** a screen shows the QR code complete, on a light background, centered on the screen, together with the address and an action that returns to the address

#### Scenario: The code can be scanned

- **WHEN** the QR code screen is shown
- **THEN** the code encodes the address of the routine builder and can be read by a phone camera

#### Scenario: Back to the address

- **WHEN** the user activates the back action on the QR code screen
- **THEN** the web builder screen with the address is shown again
