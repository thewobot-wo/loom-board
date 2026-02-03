---
phase: 03-authentication
plan: 01
subsystem: auth
tags: [convex-auth, google-oauth, auth-tables, http-routes]

# Dependency graph
requires:
  - phase: 01-convex-backend
    provides: Convex schema and functions foundation
  - phase: 02-react-frontend
    provides: React app structure for auth integration
provides:
  - Convex Auth backend configuration with Google OAuth
  - Auth HTTP routes at /api/auth/* paths
  - Auth tables (users, authSessions, authAccounts, etc.)
  - Schema with userId field on tasks table
affects: [03-02, 03-03, 05-migration]

# Tech tracking
tech-stack:
  added: [@convex-dev/auth@0.0.90, @auth/core@0.37.4]
  patterns: [convexAuth configuration, auth HTTP routes pattern]

key-files:
  created: [convex/auth.ts, convex/auth.config.ts, convex/http.ts]
  modified: [convex/schema.ts, package.json]

key-decisions:
  - "userId optional on tasks for migration compatibility"
  - "30-day session duration per CONTEXT.md"
  - "@auth/core pinned to ~0.37.3 for compatibility"

patterns-established:
  - "Auth config pattern: auth.config.ts minimal, auth.ts with providers"
  - "HTTP routes pattern: httpRouter with auth.addHttpRoutes"

# Metrics
duration: 2min
completed: 2026-02-02
---

# Phase 03 Plan 01: Auth Backend Setup Summary

**Convex Auth backend with Google OAuth provider, 30-day sessions, and schema prepared for user ownership**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-02T12:28:00Z
- **Completed:** 2026-02-02T12:30:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Installed @convex-dev/auth and @auth/core dependencies with proper version pinning
- Created Google OAuth provider configuration with 30-day session duration
- Configured HTTP routes for auth callbacks at /api/auth/* paths
- Updated schema with authTables (7 new tables) and userId field on tasks

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Convex Auth dependencies and create auth configuration** - `7c332ed` (feat)
2. **Task 2: Update schema with authTables and add userId to tasks** - `8ac2fef` (feat)

## Files Created/Modified
- `convex/auth.ts` - Google OAuth provider with 30-day sessions
- `convex/auth.config.ts` - Minimal auth configuration (required by library)
- `convex/http.ts` - HTTP router with auth routes
- `convex/schema.ts` - Added authTables spread and userId field on tasks
- `package.json` - Added @convex-dev/auth and @auth/core dependencies

## Decisions Made
- **userId optional on tasks:** Made `v.optional(v.id("users"))` instead of required `v.id("users")` as plan suggested. Required would cause schema validation errors on existing tasks without userId. Phase 5 migration will backfill.
- **30-day session duration:** Per CONTEXT.md requirement for personal use case.
- **@auth/core version pinned:** ~0.37.3 for @convex-dev/auth@0.0.90 compatibility per RESEARCH.md.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Made userId optional instead of required**
- **Found during:** Task 2 (schema update)
- **Issue:** Plan specified `userId: v.id("users")` (required), but existing tasks have no userId value
- **Fix:** Changed to `userId: v.optional(v.id("users"))` for migration compatibility
- **Files modified:** convex/schema.ts
- **Verification:** Convex compiles and deploys successfully
- **Committed in:** 8ac2fef (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug prevention)
**Impact on plan:** Essential fix for existing data compatibility. No scope creep.

## Issues Encountered
None - dependencies installed and schema deployed without errors.

## User Setup Required

**External services require manual configuration.** The following must be configured before auth will function:

**Google OAuth:**
1. Create OAuth 2.0 Client ID at Google Cloud Console -> APIs & Services -> Credentials
2. Set authorized redirect URI: `https://[deployment].convex.site/api/auth/callback/google`
3. Add environment variables to Convex dashboard:
   - `AUTH_GOOGLE_ID` - OAuth Client ID
   - `AUTH_GOOGLE_SECRET` - OAuth Client Secret

**Convex Auth:**
1. Add to Convex dashboard environment variables:
   - `SITE_URL` - Your Vercel deployment URL
   - `CONVEX_SITE_URL` - HTTP Actions URL from Convex dashboard

## Next Phase Readiness
- Auth backend infrastructure complete
- Ready for Plan 02: Frontend auth provider and hooks
- Ready for Plan 03: Protected routes and user-scoped queries
- Note: Auth will not function until user completes external service setup above

---
*Phase: 03-authentication*
*Completed: 2026-02-02*
