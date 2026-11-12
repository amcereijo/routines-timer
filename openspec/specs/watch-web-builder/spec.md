# watch-web-builder Specification

## Purpose
Watch-side shortcut that exposes the address of the web routine builder, so
a routine can be composed on a phone or computer and brought to the watch
without the user having to know or remember the builder's URL.

## Requirements

### Requirement: Entry point in the routine creation flow

The routine creation screen SHALL offer a "Create on web" entry that opens
the web builder screen. The entry SHALL be shown while a new routine is
being created and MUST NOT be shown while an existing routine is being
edited.

#### Scenario: Entry is available when creating

- **WHEN** the user opens the new routine screen
- **THEN** a "Create on web" entry is shown and the steps already added are still listed below it

#### Scenario: Entry is absent when editing

- **WHEN** the user opens the editor of an existing routine
- **THEN** no "Create on web" entry is shown and the routine's steps are listed as before

### Requirement: The screen shows the address

The web builder screen SHALL show the plain address of the web routine
builder, built from the build-time base URL of the web app plus the
routine builder path, and SHALL show a QR code that encodes the same
address. The screen SHALL explain what the address is for.

#### Scenario: Address and code are shown

- **WHEN** the user opens the web builder screen
- **THEN** the screen shows the address of the web routine builder, a QR code with the same content and an explanation that the code is scanned with a phone to build routines in the web app

#### Scenario: Address follows the build configuration

- **WHEN** the app is built with a different base URL for the web app
- **THEN** the address and the QR code point at the routine builder of that deployment

### Requirement: Unsupported QR widget

When the device does not support the QR code widget the screen SHALL still
show the address and an explanation of what it is for, instead of failing.

#### Scenario: No QR widget on the device

- **WHEN** the web builder screen is opened on a device that cannot create the QR code widget
- **THEN** the address is shown with a message that the QR code is not available on the device and the routine being created is unchanged

### Requirement: The routine being created is preserved

Opening the web builder screen MUST NOT discard the routine that is being
created on the watch. When the user returns to the routine creation screen,
the name and the steps that were already added SHALL still be there.

#### Scenario: Round trip to the web screen

- **WHEN** the user adds steps on the watch, opens the web builder screen and comes back
- **THEN** the routine creation screen shows the same name and the same steps as before

#### Scenario: Leaving the creation screen discards the draft

- **WHEN** the user leaves the routine creation screen without opening the web builder screen
- **THEN** a later visit to the routine creation screen starts empty

### Requirement: The screen explains how the routine reaches the watch

The web builder screen SHALL explain that a routine created in the web app
is added to the watch with its import code, so the user knows that the QR
code is the first half of a flow and not the whole thing.

#### Scenario: The round trip is explained

- **WHEN** the user opens the web builder screen
- **THEN** the explanation states that routines created in the web app are added to the watch with the import code

#### Scenario: The explanation still fits the screen

- **WHEN** the web builder screen is shown
- **THEN** the explanation, the address, the QR code and the BACK button do not overlap each other
