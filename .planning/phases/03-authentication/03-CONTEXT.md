# Phase 3: Authentication - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Users authenticate with Google OAuth; all data protected by user identity. Includes sign-in, sign-out, session persistence, loading states, removing hardcoded password/fake gate, and Convex function auth validation.

</domain>

<decisions>
## Implementation Decisions

### Sign-in experience
- Login screen only — no board visible until authenticated
- Minimal centered layout — logo + Google button on clean background
- Logo only — no tagline, feature hints, or marketing copy
- Auth errors shown inline below button, stay on login screen

### Session & persistence
- 30-day session timeout — re-authenticate after 30 days of no activity
- On session expiry: redirect to login screen immediately
- User identity shown in header: avatar + name (Google profile data)

### Claude's Discretion
- Multi-tab session sync behavior
- Loading spinner/skeleton during auth check
- Sign-out confirmation (if any) and redirect destination
- Exact header layout for user avatar/name placement

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-authentication*
*Context gathered: 2026-02-02*
