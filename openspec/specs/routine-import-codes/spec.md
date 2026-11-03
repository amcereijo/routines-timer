# routine-import-codes Specification

## Purpose
Server-managed lifecycle of short-lived, human-readable import codes that authorize anonymous, rate-limited retrieval of a published routine document over HTTPS.

## Requirements

### Requirement: Code format and entropy

Import codes SHALL be server-generated, cryptographically random strings of exactly 8 characters drawn from an unambiguous 30-character alphabet that excludes visually confusable characters (no 0, O, 1, I, L, U). The system SHALL guarantee that no two active codes are identical.

#### Scenario: Generated code matches format

- **WHEN** the operator generates an import code
- **THEN** the code consists of exactly 8 characters from the defined alphabet and does not collide with any other active code

### Requirement: Expiration lifecycle

Each import code SHALL carry a server-recorded creation time and expiration time chosen at generation. The server SHALL enforce expiration at resolution time, independent of any client. Expired grant data SHALL be removed automatically. Deleting the bound routine SHALL immediately invalidate all of its active codes.

#### Scenario: Active code resolves

- **WHEN** a code is presented before its expiration and its bound routine still exists
- **THEN** the resolution succeeds

#### Scenario: Expired code rejected

- **WHEN** a code is presented after its expiration
- **THEN** the resolution fails with a generic not-found response indistinguishable from an unknown code

#### Scenario: Deleted routine invalidates codes

- **WHEN** the operator deletes a routine that has active codes
- **THEN** subsequent resolution attempts for those codes fail as if the codes were unknown

### Requirement: Public code resolution API

The system SHALL expose a public HTTPS endpoint that accepts an import code and, for active codes, returns the bound routine as a versioned JSON document containing: an integer `version` (value 1), the routine `name`, and the ordered `steps` array with each step's `name`, integer `seconds`, and optional `repeat` and `rest`. No user account or session SHALL be required; possession of an active code alone grants access. Error responses SHALL contain no routine content.

#### Scenario: Successful resolution

- **WHEN** an HTTPS client requests resolution with an active code
- **THEN** the endpoint responds with the routine document for version 1 including name and ordered steps

#### Scenario: Unknown, expired, or malformed code

- **WHEN** an HTTPS client presents a code that is unknown, expired, bound to a deleted routine, or not in the valid 8-character format
- **THEN** the endpoint responds with a generic not-found error and no indication of which failure occurred

### Requirement: Resolution rate limiting

The resolution endpoint SHALL limit attempts per client IP address to at most 10 requests per minute. Attempts beyond the limit SHALL be rejected with a rate-limit error and MUST NOT resolve, probe, or confirm the existence of any code.

#### Scenario: Burst of guesses throttled

- **WHEN** a single client submits more than 10 resolution attempts within one minute
- **THEN** further attempts in that window are rejected with a rate-limit error regardless of code validity
