# web-routine-builder Specification

## Purpose
Authenticated web application where several accounts author timer routines on a large display, share them through public links, and mint short-lived import codes, so routines can be composed off-watch and transferred to the watch at runtime.

## Requirements

### Requirement: Operator authentication

The web application SHALL restrict all builder pages and routine-management endpoints to an authenticated account. Accounts authenticate with a username and a password from the server-side account configuration; on success the server issues an HttpOnly, Secure, SameSite=Lax session cookie that carries the account name and has a server-enforced expiration of at most 12 hours. Unauthenticated requests to protected pages SHALL be redirected to the login page, and unauthenticated API requests SHALL be rejected without exposing routine data.

#### Scenario: Successful login

- **WHEN** an account submits its username and password on the login page
- **THEN** the system creates a session, sets the session cookie, and redirects to the routine list page

#### Scenario: Failed login

- **WHEN** an account submits an incorrect username or password
- **THEN** the system rejects the attempt with a generic error, sets no session cookie, and applies a per-client login attempt limit of at most 5 attempts per 5 minutes

#### Scenario: Unauthenticated access

- **WHEN** a request without a valid session targets a protected page or endpoint
- **THEN** the request is redirected to the login page (pages) or rejected with an authorization error (API) and no routine data is returned

#### Scenario: Logout

- **WHEN** an account signs out
- **THEN** the session is invalidated server-side and subsequent requests with the old cookie are treated as unauthenticated

### Requirement: Routine definition management

An authenticated account SHALL be able to create, view, edit, and delete its own named routine definitions, and SHALL be able to manage the routines of other accounts only when it is an administrator. A routine definition consists of a name and an ordered list of steps, where each step has a name, a duration in seconds, optionally a repeat count and a rest duration between repetitions, and optionally a description, up to 3 images, and up to 3 links.

#### Scenario: Create and list a routine

- **WHEN** an account saves a valid new routine
- **THEN** the routine is persisted, owned by that account, and appears in the account's routine list with its name and total duration

#### Scenario: Edit a routine

- **WHEN** an account modifies one of its routine's name or steps and saves
- **THEN** the stored definition is updated and subsequent views, public share pages, and import-code resolutions reflect the updated content

#### Scenario: Delete a routine

- **WHEN** an account deletes one of its routines
- **THEN** the definition is removed and all active import codes and public share links bound to it immediately stop working

### Requirement: Authoring validation

The web application SHALL validate every routine definition on save and reject invalid input with per-field errors without persisting anything. Limits: routine name 1–18 printable ASCII characters; 1–20 steps per routine; step name at most 18 printable ASCII characters; step duration an integer of 5–3599 seconds; repeat count, when present, an integer of 1–99; rest duration, when present, an integer of 0–3599 seconds.

#### Scenario: Invalid routine rejected

- **WHEN** the operator saves a routine that violates any limit (e.g., 21 steps, a 3-second step, or a 19-character name)
- **THEN** the save is rejected with field-level error messages and no routine data is created or modified

#### Scenario: Valid routine accepted

- **WHEN** the operator saves a routine that satisfies all limits
- **THEN** the routine is persisted exactly as entered, including step order and optional repeat/rest values

### Requirement: Import code generation

The operator SHALL be able to generate an import code for any saved routine, choosing an expiration period from the offered presets (15 minutes, 1 hour, 24 hours). The system SHALL display the generated code and its expiry, and SHALL show the operator the list of currently active codes with the routine each resolves to and its remaining lifetime.

#### Scenario: Generate a code

- **WHEN** the operator requests an import code for a saved routine and selects an expiration preset
- **THEN** the system issues a new active code bound to that routine, valid until the chosen expiration, and displays it to the operator

#### Scenario: View active codes

- **WHEN** the operator opens the code list for a routine
- **THEN** each active code is shown with its expiration time, and expired codes are not presented as usable

### Requirement: Efficient step authoring

The routine editor SHALL let the author add, reorder, duplicate, collapse, and delete steps without leaving the form, SHALL accept a duration either as plain seconds or as `m:ss`, SHALL offer quick-duration presets and routine templates, and SHALL show the resulting total and work time while the form is being filled. An unsaved draft SHALL survive a page reload.

#### Scenario: Reorder steps

- **WHEN** the author drags a step onto another position in the list
- **THEN** the step order is updated and the saved routine keeps that order

#### Scenario: Duration in minutes and seconds

- **WHEN** the author types `1:30` as a step duration
- **THEN** the step is stored with 90 seconds

#### Scenario: Template

- **WHEN** the author picks a template
- **THEN** the step list is replaced by the template's steps, which can then be edited

#### Scenario: Live totals

- **WHEN** the author changes durations, repetitions, or rests
- **THEN** the editor shows the total running time and the total work time of the routine, matching the watch's repetition and rest semantics

#### Scenario: Draft recovery

- **WHEN** the author reloads the editor with unsaved changes
- **THEN** the unsaved draft is restored and the author is offered to discard it

### Requirement: Validation limits for the extras

Saving a routine SHALL reject a routine whose payload exceeds 2 MB and SHALL reject images or links that break the limits of the `web-routine-extras` capability, with per-field errors and without storing anything.

#### Scenario: Routine too large

- **WHEN** the author saves a routine whose encoded payload exceeds 2 MB
- **THEN** the save is rejected with an error that asks for fewer images, and nothing is stored
