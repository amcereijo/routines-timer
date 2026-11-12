## watch-routine-import Specification

## Purpose

Watch-side flow that lets the user enter an import code, fetch the routine through the connected phone's side service, validate it, and save it as an ordinary routine usable by the existing app.

## ADDED Requirements

### Requirement: The screen states where the codes come from

The import page SHALL tell the user that import codes come from routines
created in the web app, so the user knows where to get a code.

#### Scenario: The origin of the code is shown

- **WHEN** the user opens the import page
- **THEN** the page shows a hint that the codes come from routines created in the web app, and the code entry field is still empty

#### Scenario: The hint does not interfere with the feedback

- **WHEN** the import page reports the outcome of a request
- **THEN** the outcome message is shown in the status line and the hint stays in place
