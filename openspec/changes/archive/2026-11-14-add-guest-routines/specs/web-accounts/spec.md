# web-accounts Specification (delta)

## MODIFIED Requirements

### Requirement: Per-account routine ownership

Every routine created by an account SHALL record that account as its owner. Routine lists, routine details, and every routine mutation SHALL be scoped to the owning account, and only an `admin` account SHALL see and manage routines owned by other accounts. Routines created before accounts existed SHALL be adopted by the first account that signs in. Ephemeral guest routines (see the `web-guest-routines` capability) are exempt from this requirement: they record no owner, live apart from account routines, and SHALL NOT be adopted or managed by any account, including administrators.

#### Scenario: Accounts do not see each other's routines

- **WHEN** account A creates a routine and account B signs in
- **THEN** the routine does not appear in B's list and B cannot read, edit, delete, share, or mint import codes for it

#### Scenario: Administrator sees every routine

- **WHEN** an account is configured with `admin` and signs in
- **THEN** it sees and can manage the account-owned routines of every account, while guest routines remain invisible

#### Scenario: Legacy routines are adopted

- **WHEN** routines created before accounts existed have no owner and an account signs in
- **THEN** those routines become owned by that account instead of disappearing

#### Scenario: Guest routines are never adopted

- **WHEN** guest routines exist and an account signs in
- **THEN** the guest routines keep no owner, are excluded from any account list, and are not adopted
