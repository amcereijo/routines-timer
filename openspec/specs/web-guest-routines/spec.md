# web-guest-routines Specification

## Purpose

Lets a watch owner compose one timer routine anonymously in the web builder and transfer it to the watch with an import code, leaving no recoverable trace once they leave the page or after 24 hours.

## Requirements

### Requirement: Guest access

The login page SHALL offer a guest option that opens the routine builder without asking for a username or a password. Starting the guest flow SHALL create an anonymous guest workspace bound to the browser via an HttpOnly, Secure, SameSite=Lax cookie with no identity beyond that workspace. The guest flow and the account sign-in flow SHALL remain independent: a guest is never prompted for credentials and gains no access to account features.

#### Scenario: Visitor enters as guest

- **WHEN** a visitor opens the web application and chooses the guest option
- **THEN** the builder opens without credentials, an anonymous guest workspace is created, and no account session is established

#### Scenario: Guest is not an account

- **WHEN** a guest calls an endpoint scoped to account routines (lists, details, mutations, share links)
- **THEN** the request is rejected exactly as an unauthenticated account request, with no account routine data exposed

### Requirement: Single ephemeral routine

A guest SHALL be able to create and edit exactly one routine at a time, subject to the same authoring validation limits as account routines (name 1–18 printable ASCII characters, 1–20 steps, step name at most 18 printable ASCII characters, step duration 5–3599 seconds, optional repeat 1–99, optional rest 0–3599 seconds). Saving a new routine SHALL permanently replace the previous guest routine: the previous definition and its active import codes are deleted before the new one is accepted.

#### Scenario: Guest saves a valid routine

- **WHEN** a guest saves a valid routine
- **THEN** the routine is persisted in the guest workspace and can be edited while the guest session continues

#### Scenario: Invalid guest routine rejected

- **WHEN** a guest saves a routine that violates the authoring limits
- **THEN** the save is rejected with field-level errors and nothing is persisted

#### Scenario: New routine replaces the old one

- **WHEN** a guest with an existing routine saves a different one
- **THEN** the previous routine is permanently deleted, its active import codes immediately stop resolving, and only the new routine remains

### Requirement: Active deletion when leaving the page

When the guest closes, reloads, or navigates away from the builder page, the client SHALL send a best-effort deletion notification to a dedicated endpoint (using `navigator.sendBeacon` or an equivalent unload-safe mechanism), and the server SHALL delete the guest routine immediately upon receiving it. Deleting the routine SHALL immediately invalidate all import codes minted for it, whose resolution then fails exactly as for an unknown code. The guest routine MUST NOT be recoverable after the notification is processed.

#### Scenario: Guest closes the page

- **WHEN** a guest closes or leaves the builder page and the notification reaches the server
- **THEN** the routine is deleted at once, its import codes stop resolving, and reopening the application starts from an empty guest workspace

#### Scenario: Notification is lost

- **WHEN** the deletion notification never reaches the server (crash, network loss)
- **THEN** the routine still expires automatically under its 24-hour expiration and is never recoverable through any UI

### Requirement: 24-hour expiration

Each guest routine SHALL carry a server-recorded expiration exactly 24 hours after its creation. The server SHALL enforce the expiration at every access to the routine and at every resolution of its import codes: an expired routine and its codes SHALL behave exactly as if already deleted, and expired guest data SHALL be removed automatically.

#### Scenario: Routine expires before the guest leaves

- **WHEN** a guest accesses a routine more than 24 hours after its creation
- **THEN** the routine is treated as deleted, the guest workspace is empty, and its codes fail resolution as unknown

#### Scenario: Expired data is cleaned up

- **WHEN** guest routines pass their expiration
- **THEN** they are removed from storage automatically without any user or operator action

### Requirement: Code-only watch transfer

A guest SHALL be able to mint import codes for their routine, and those codes SHALL resolve through the same public resolution endpoint and format as codes minted by accounts. A guest code's expiration SHALL NOT exceed the guest routine's remaining lifetime, and guest codes SHALL be invalidated as soon as the routine is deleted or expires. The guest SHALL NOT be able to create a public share link: no share-link action is offered in the guest UI and the share-link endpoints SHALL refuse guest routines.

#### Scenario: Guest mints a code

- **WHEN** a guest requests an import code for their routine
- **THEN** a code is issued with an expiration no later than the routine's own expiration, and it resolves for the watch while the routine is alive

#### Scenario: Share link is refused

- **WHEN** a share-link creation request targets a guest routine
- **THEN** the request is refused and no public share link exists for the routine

#### Scenario: Code dies with the routine

- **WHEN** a guest routine is deleted or expires while it has active codes
- **THEN** those codes immediately stop resolving, indistinguishable from unknown codes

### Requirement: No recovery and no visibility across contexts

Guest routines SHALL NOT be listed, searched, or recoverable anywhere: not in the guest UI after leaving, not in account routine lists, and not in administrator views. Returning to the application after leaving SHALL start a new, empty guest workspace with no reference to previous routines.

#### Scenario: Guest returns after leaving

- **WHEN** a visitor who previously used the guest flow opens the application again
- **THEN** no previous routine, code, or data is presented and a fresh guest workspace begins

#### Scenario: Accounts never see guest routines

- **WHEN** an account, including an administrator, lists or searches routines
- **THEN** no guest routine appears in the results

### Requirement: Abuse limiting

Guest workspace creation, routine saves, and code minting SHALL be rate-limited per client IP address to at most 10 requests per minute each, and guest workspace creation SHALL additionally be limited to at most 30 workspaces per IP per day. Rejected attempts SHALL NOT create or modify any guest data.

#### Scenario: Guest creation flood throttled

- **WHEN** a single client exceeds the guest operation limits
- **THEN** further attempts in the window are rejected with a rate-limit error and no guest data is created
