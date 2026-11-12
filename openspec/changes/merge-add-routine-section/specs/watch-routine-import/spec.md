## MODIFIED Requirements

### Requirement: Import entry point

The import page SHALL be opened from the web builder screen of the Add
Routine section, next to the address of the web routine builder, so the
user who just built a routine in the web app can enter its import code
right away. The home screen MUST NOT offer a separate import action.

#### Scenario: Open import page

- **WHEN** the user activates the import action on the web builder screen
- **THEN** the import page opens with an empty code entry field and the saved routines remain unchanged

## ADDED Requirements

### Requirement: The routine list is shown after an import

After a successful import the watch SHALL show the routine list, so the
imported routine is visible without further navigation.

#### Scenario: The imported routine is visible right away

- **WHEN** a code resolves to a valid routine document and the import succeeds
- **THEN** the watch shows the routine list and the imported routine is in it
