## watch-web-builder Specification

## Purpose

Watch-side shortcut that exposes the address of the web routine builder, so
a routine can be composed on a phone or computer and brought to the watch
without the user having to know or remember the builder's URL.

## ADDED Requirements

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
