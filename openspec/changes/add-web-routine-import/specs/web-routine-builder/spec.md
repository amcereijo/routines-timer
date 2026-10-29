## Purpose

Single-operator web application for authoring timer routines on a large display and minting short-lived import codes, so routines can be composed off-watch and transferred to the watch at runtime.

## ADDED Requirements

### Requirement: Operator authentication

The web application SHALL restrict all builder pages and routine-management endpoints to a single authenticated operator. The operator authenticates with a server-configured password; on success the server issues an HttpOnly, Secure, SameSite=Lax session cookie with a server-enforced expiration of at most 12 hours. Unauthenticated requests to protected pages SHALL be redirected to the login page, and unauthenticated API requests SHALL be rejected without exposing routine data.

#### Scenario: Successful login

- **WHEN** the operator submits the correct password on the login page
- **THEN** the system creates a session, sets the session cookie, and redirects to the routine list page

#### Scenario: Failed login

- **WHEN** the operator submits an incorrect password
- **THEN** the system rejects the attempt with a generic error, sets no session cookie, and applies a per-client login attempt limit of at most 5 attempts per 5 minutes

#### Scenario: Unauthenticated access

- **WHEN** a request without a valid session targets a protected page or endpoint
- **THEN** the request is redirected to the login page (pages) or rejected with an authorization error (API) and no routine data is returned

#### Scenario: Logout

- **WHEN** the operator signs out
- **THEN** the session is invalidated server-side and subsequent requests with the old cookie are treated as unauthenticated

### Requirement: Routine definition management

The operator SHALL be able to create, view, edit, and delete named routine definitions. A routine definition consists of a name and an ordered list of steps, where each step has a name, a duration in seconds, and optionally a repeat count and a rest duration between repetitions.

#### Scenario: Create and list a routine

- **WHEN** the operator saves a valid new routine
- **THEN** the routine is persisted and appears in the operator's routine list with its name and total duration

#### Scenario: Edit a routine

- **WHEN** the operator modifies an existing routine's name or steps and saves
- **THEN** the stored definition is updated and subsequent views and import-code resolutions reflect the updated content

#### Scenario: Delete a routine

- **WHEN** the operator deletes a routine
- **THEN** the definition is removed and all active import codes bound to it immediately stop resolving

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
