## Purpose

A routine can be shown to anybody through a public URL, without giving them an account, and the owner can take that URL away again at any time.

## ADDED Requirements

### Requirement: Public share links

The system SHALL let the owner of a routine create a public share link and SHALL show its absolute URL so it can be copied and sent. The link SHALL resolve to a public page that displays the routine — its name, its steps with durations, repetitions and rests, the images and links of each step — and SHALL require no account and no session. Share links SHALL be server-generated random tokens, SHALL be unique among active links, and SHALL carry an expiration chosen at creation from the offered presets (1 hour, 24 hours, 7 days, 30 days, or never).

#### Scenario: Create a share link

- **WHEN** the owner requests a public link for a saved routine and picks an expiration
- **THEN** a new link is issued, its URL is displayed, and opening it shows the routine to a visitor without an account

#### Scenario: Independent links per routine

- **WHEN** the owner creates several links for the same routine
- **THEN** each link is listed separately with its own expiration, and discarding one leaves the others working

#### Scenario: Link expiration

- **WHEN** a visitor opens a link whose expiration has passed
- **THEN** the page is not available any more, exactly as for an unknown link

### Requirement: Discarding a share link

The owner of the routine SHALL be able to discard a share link from the routine list, and the same action SHALL be offered on the public page while the owner is signed in. Discarding SHALL take effect immediately: the link SHALL stop resolving and the public page SHALL become unavailable. Accounts that do not own the routine SHALL NOT be able to discard its links.

#### Scenario: Discard from the routine list

- **WHEN** the owner discards a share link of one of their routines
- **THEN** the link is removed from the list and the public URL stops working

#### Scenario: Discard from the public page

- **WHEN** the owner opens their own public link while signed in and discards it
- **THEN** the page becomes unavailable right away

#### Scenario: Visitor cannot discard a link

- **WHEN** an anonymous visitor or another account opens a public link
- **THEN** no discard action is offered and the discard endpoint refuses the request

### Requirement: Share links follow the routine

A share link SHALL always show the current content of its routine, and deleting the routine SHALL invalidate all of its share links.

#### Scenario: Edited routine is shown

- **WHEN** the owner edits the routine behind a share link
- **THEN** the public page shows the updated routine

#### Scenario: Deleted routine invalidates its links

- **WHEN** the owner deletes the routine behind a share link
- **THEN** the link stops resolving
