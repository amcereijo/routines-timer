## Purpose

The routine builder is the authenticated web surface where routines are authored. It now serves several accounts and got a faster authoring flow.

## MODIFIED Requirements

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

## ADDED Requirements

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
