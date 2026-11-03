# web-accounts Specification

## Purpose
Several people build routines with the same web app. Each of them signs in with their own credentials, sees the routines they own, and shares the rest through public links.

## Requirements

### Requirement: Account configuration

The system SHALL read the list of accounts from a single JSON environment variable (`AUTH_USERS`) that holds, per account, a username, a password, an optional display name, and an optional `admin` flag. It SHALL support both an array form and an object-map form of that variable, SHALL ignore entries with an unusable username or an empty password, and SHALL keep running with a single operator account when only the legacy `ADMIN_PASSWORD` variable is set.

#### Scenario: Several accounts configured

- **WHEN** `AUTH_USERS` contains two or more valid accounts
- **THEN** each of them can sign in with its own username and password, and the login form offers the configured usernames

#### Scenario: Malformed configuration

- **WHEN** `AUTH_USERS` cannot be parsed or contains no usable account
- **THEN** the system falls back to the legacy single-operator configuration, and if that is missing too, sign-in is refused with a configuration error

### Requirement: Account-scoped sessions

The system SHALL store the account name inside the signed session token, SHALL invalidate a session whose account no longer exists in the configuration, and SHALL expire sessions after at most 12 hours. Password comparison SHALL be constant-time and sign-in SHALL stay limited to at most 5 attempts per 5 minutes per client.

#### Scenario: Session carries the account

- **WHEN** an account signs in successfully
- **THEN** the session token identifies that account, and the UI reports which account is signed in

#### Scenario: Account removed from the configuration

- **WHEN** a session belongs to an account that is no longer configured
- **THEN** the session is treated as unauthenticated and the account's routines stay inaccessible

#### Scenario: Wrong credentials

- **WHEN** an account signs in with an unknown username or a wrong password
- **THEN** the attempt is rejected with a generic error, no session is created, and the per-client attempt limit applies

### Requirement: Per-account routine ownership

Every routine SHALL record the account that created it. Routine lists, routine details, and every routine mutation SHALL be scoped to the owning account, and only an `admin` account SHALL see and manage routines owned by other accounts. Routines created before accounts existed SHALL be adopted by the first account that signs in.

#### Scenario: Accounts do not see each other's routines

- **WHEN** account A creates a routine and account B signs in
- **THEN** the routine does not appear in B's list and B cannot read, edit, delete, share, or mint import codes for it

#### Scenario: Administrator sees every routine

- **WHEN** an account is configured with `admin` and signs in
- **THEN** it sees the routines of every account and can manage them

#### Scenario: Legacy routines are adopted

- **WHEN** routines exist without an owner and an account signs in
- **THEN** those routines become owned by that account instead of disappearing
