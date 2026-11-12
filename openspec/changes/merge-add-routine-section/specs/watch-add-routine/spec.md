## Purpose

The single section of the watch app where a routine is added. It offers the
two ways of adding one — building it on the watch, or building it in the web
app and bringing it over with its import code — behind one entry point.

## ADDED Requirements

### Requirement: One entry point for adding a routine

The home screen SHALL offer a single action to add a routine, and that
action SHALL open the Add Routine section. The home screen MUST NOT offer
separate actions for creating a routine and for importing one.

#### Scenario: The home screen offers one action

- **WHEN** the user looks at the home screen
- **THEN** a single action to add a routine is shown, next to the list of saved routines

#### Scenario: The action opens the Add Routine section

- **WHEN** the user activates the add routine action on the home screen
- **THEN** the Add Routine section opens and the saved routines are unchanged

### Requirement: The section offers the watch and the web app

The Add Routine section SHALL offer both ways of adding a routine: one that
opens the routine editor on the watch, and one that opens the web builder
screen. Every entry SHALL say what it does and where it leads.

#### Scenario: Adding a routine on the watch

- **WHEN** the user activates the watch entry of the Add Routine section
- **THEN** the routine editor opens with an empty routine and no saved routine is changed

#### Scenario: Adding a routine in the web app

- **WHEN** the user activates the web app entry of the Add Routine section
- **THEN** the web builder screen opens, showing the address of the web routine builder and its QR code

### Requirement: The section explains the round trip

The Add Routine section SHALL state that a routine built in the web app is
added to the watch with its import code, so the user knows that the web
entry is the first half of a flow and not the whole thing.

#### Scenario: The round trip is explained

- **WHEN** the user opens the Add Routine section
- **THEN** the section states that routines built in the web app are added to the watch with their import code

#### Scenario: The explanation fits the screen

- **WHEN** the Add Routine section is shown
- **THEN** the title, both entries and the explanation do not overlap each other

### Requirement: The routine list is shown after saving

After a routine is saved on the watch the watch SHALL show the routine list,
so the routine that was just added is visible without further navigation.

#### Scenario: The saved routine is visible right away

- **WHEN** the user saves a routine built in the watch editor
- **THEN** the watch shows the routine list and the saved routine is in it
