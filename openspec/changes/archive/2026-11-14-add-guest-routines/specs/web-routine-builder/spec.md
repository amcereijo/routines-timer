# web-routine-builder Specification (delta)

## MODIFIED Requirements

### Requirement: Operator authentication

The web application SHALL restrict all builder pages and routine-management endpoints to an authenticated account, with the sole exception of the anonymous guest authoring flow defined by the `web-guest-routines` capability, which SHALL be reachable without an account and whose pages and endpoints are governed by that capability instead of this requirement. Accounts authenticate with a username and a password from the server-side account configuration; on success the server issues an HttpOnly, Secure, SameSite=Lax session cookie that carries the account name and has a server-enforced expiration of at most 12 hours. Unauthenticated requests to protected account pages SHALL be redirected to the login page, and unauthenticated API requests SHALL be rejected without exposing routine data.

#### Scenario: Successful login

- **WHEN** an account submits its username and password on the login page
- **THEN** the system creates a session, sets the session cookie, and redirects to the routine list page

#### Scenario: Failed login

- **WHEN** an account submits an incorrect username or password
- **THEN** the system rejects the attempt with a generic error, sets no session cookie, and applies a per-client login attempt limit of at most 5 attempts per 5 minutes

#### Scenario: Unauthenticated access

- **WHEN** a request without a valid session targets a protected account page or endpoint
- **THEN** the request is redirected to the login page (pages) or rejected with an authorization error (API) and no routine data is returned

#### Scenario: Guest flow needs no account

- **WHEN** a visitor without a session targets the guest authoring pages or endpoints
- **THEN** the request is served as the guest flow defined by `web-guest-routines` and no account routine data is returned

#### Scenario: Logout

- **WHEN** an account signs out
- **THEN** the session is invalidated server-side and subsequent requests with the old cookie are treated as unauthenticated
