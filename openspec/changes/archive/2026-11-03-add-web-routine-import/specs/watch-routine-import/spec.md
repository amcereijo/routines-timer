## Purpose

Watch-side flow that lets the user enter an import code, fetch the routine through the connected phone's side service, validate it, and save it as an ordinary routine usable by the existing app.

## ADDED Requirements

### Requirement: Import entry point

The watch app's home screen SHALL offer an Import action, alongside the existing routine creation action, that opens an import page.

#### Scenario: Open import page

- **WHEN** the user activates the Import action on the home screen
- **THEN** the import page opens with an empty code entry field and the saved routines remain unchanged

### Requirement: Code entry

The import page SHALL accept exactly 8 characters from the 30-character import-code alphabet via an on-screen keyboard and SHALL allow submission only when the entry is complete and well formed. Characters outside the alphabet MUST NOT be enterable.

#### Scenario: Entry restricted to alphabet

- **WHEN** the user types on the import page keyboard
- **THEN** only characters from the import-code alphabet can be entered and at most 8 characters are accepted

#### Scenario: Submission gated

- **WHEN** the entered code has fewer than 8 characters
- **THEN** no resolution request is issued and the user is prompted to complete the code

### Requirement: Retrieval through the phone side service

On submission the watch SHALL request code resolution through the Zepp phone app's side service, which performs the HTTPS call to the resolution endpoint. All retrieval SHALL flow through the connected phone; the watch MUST surface a clear error when the phone app is not connected or the transfer fails.

#### Scenario: Phone not connected

- **WHEN** the user submits a code while the Zepp phone app is disconnected
- **THEN** the watch shows an error indicating the phone must be connected and saved routines remain unchanged

#### Scenario: Transfer failure

- **WHEN** the side service cannot reach the resolution endpoint or returns an error
- **THEN** the watch shows a retrieval error and saved routines remain unchanged

### Requirement: Outcome feedback

The watch SHALL give the user distinct, human-readable feedback for each outcome: success, unknown or expired code, phone disconnected, network/transfer failure, and invalid routine data.

#### Scenario: Unknown or expired code

- **WHEN** the resolution endpoint reports the submitted code as not found
- **THEN** the watch shows feedback that the code is invalid or expired and saved routines remain unchanged

### Requirement: Pre-save validation

Before saving, the watch SHALL validate the resolved document and reject it without modifying saved routines unless all hold: the `version` is supported (1); the routine name is 1–18 printable ASCII characters; there are 1–20 steps; every step name is at most 18 printable ASCII characters; every step `seconds` is an integer of 5–3599; `repeat`, when present, is an integer of 1–99; `rest`, when present, is an integer of 0–3599.

#### Scenario: Malformed document rejected

- **WHEN** the resolved document is not valid JSON, has an unsupported version, or violates any limit
- **THEN** the watch shows invalid-data feedback and the saved routine list is byte-for-byte unchanged

### Requirement: Save and post-import behavior

On successful validation the watch SHALL persist the routine using the same save semantics as manually created routines, including same-name overwrite and oldest-first eviction at capacity, and SHALL confirm the import to the user. After import, the routine MUST be indistinguishable from a manually created one and MUST work with the existing Home, Start, Edit, Delete, and Run behavior without special cases.

#### Scenario: Successful import

- **WHEN** a code resolves to a valid routine document
- **THEN** the watch saves the routine, confirms the import, and the routine appears in the saved list

#### Scenario: Imported routine runs normally

- **WHEN** the user starts, edits, or deletes an imported routine
- **THEN** each action behaves exactly as it does for a routine created on the watch
