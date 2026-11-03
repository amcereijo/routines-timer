## Why

Creating complex timer routines on the watch's small screen is cumbersome, while embedding routines in the app requires rebuilding and reinstalling it for every change. A web routine builder with short-lived import codes will let routines be composed on a larger display and imported onto a watch at runtime.

## What Changes

- Add an authenticated web routine builder for a single operator to create, view, edit, and delete routine definitions.
- Allow the operator to choose an expiration period and generate a temporary import code for a saved routine.
- Add a routine API that resolves an active import code to a versioned routine document and enforces expiration server-side; possession of an active code grants access without a user account.
- Add a watch import flow where the user enters an import code, the app retrieves the routine through the Zepp phone Side Service, validates the returned JSON, and saves the routine using the existing watch save behavior.
- Enforce routine limits and schema validation in both the web/API and watch, including at most 20 steps, supported durations of 5–3599 seconds, and names of at most 18 characters.
- Reject malformed, expired, unknown, or otherwise invalid routine data without modifying the watch's saved routines.
- Treat imported routines as ordinary saved routines after import so existing Home, Start, Edit, Delete, and Run behavior applies without special cases.
- Add security controls for the single-user session, import-code entropy, expiration, rate limiting, and server-side validation.

## Capabilities

### New Capabilities

- `web-routine-builder`: Authenticated web authoring of routine definitions and generation of time-limited import codes.
- `routine-import-codes`: Server-managed lifecycle and resolution of temporary codes that authorize access to a routine document.
- `watch-routine-import`: User-driven retrieval, validation, persistence, and feedback when importing a routine from an import code.

### Modified Capabilities

None. This change introduces new behavior without changing the requirements of existing capabilities.

## Impact

- **Watch app:** Adds an import entry point and page, a watch-side routine document validator/import adapter, Side Service HTTP-proxy integration, and integration with the existing routine storage path. The app will require a ZML dependency and an `app-side` module in `app.json`; the Zepp phone app must be connected for imports to complete.
- **Web/API:** Adds a new web application, single-user authentication, session handling, routine-definition storage, temporary-code storage, and a public code-resolution API reachable over HTTPS.
- **Shared contract:** Defines the versioned routine document exchanged between the web/API and watch, including routine name, ordered steps, step names, and durations.
- **Data and operations:** Requires server-side persistence for routine definitions and expiring import grants, plus cleanup and rate-limiting policies. Imported routines remain persisted locally on the watch after their import code expires.
